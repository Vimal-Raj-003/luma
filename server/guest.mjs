/* Lightweight customers: a name + mobile number, no OTP, so someone can shop and pay straight away.
   This is NOT authentication. The number is stored as UNVERIFIED and is never used to find, match or open an existing customer: every guest gets
   their own profile row (no Clerk id), and the browser holds a signed token for that one row. The token is accepted for buying (cart / checkout / payment
   verification of that customer's own orders) and nothing else: it is not a Clerk session, so it can never pass the Super Admin check, and no endpoint
   lists orders from a phone number. */
import crypto from 'node:crypto'
import { db } from './db.mjs'

const TTL = 24 * 3600 // seconds a guest token stays valid (the browser keeps it for the tab's session)
export const GUEST_PREFIX = 'lumag.'

const bad = (message, status = 400) => Object.assign(new Error(message), { status })
// signing key: GUEST_TOKEN_SECRET if you set one, otherwise derived from the server's Clerk secret (it never leaves the server)
const key = () => {
  const base = process.env.GUEST_TOKEN_SECRET || process.env.CLERK_SECRET_KEY
  if (!base) throw bad('Guest sign-up is not configured on the server.', 500)
  return crypto.createHmac('sha256', base).update('luma-guest-token-v1').digest()
}
const sign = (id, exp) => crypto.createHmac('sha256', key()).update(`${id}.${exp}`).digest('hex')

export const issueGuestToken = (id) => { const exp = Math.floor(Date.now() / 1000) + TTL; return { token: `${GUEST_PREFIX}${id}.${exp}.${sign(id, exp)}`, expires: exp * 1000 } }

/* token -> the guest's customer row (only rows that have no Clerk account can be a guest) */
export async function guestFromToken(token) {
  const m = /^lumag\.([\w-]+)\.(\d+)\.([0-9a-f]{64})$/.exec(token || '')
  if (!m) throw bad('Please sign in to continue.', 401)
  const [, id, exp, sig] = m
  const want = Buffer.from(sign(id, exp)), got = Buffer.from(sig)
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) throw bad('Please sign in to continue.', 401)
  if (Number(exp) * 1000 < Date.now()) throw bad('Your session has expired. Please enter your details again.', 401)
  const user = await db.user.findUnique({ where: { id } })
  if (!user || user.authUserId) throw bad('Please sign in to continue.', 401)
  return Object.assign(user, { created: false, guest: true })
}

const readJson = (req) => new Promise((ok, no) => {
  let s = ''
  req.on('data', (c) => { s += c; if (s.length > 2000) { no(bad('Request too large.')); req.destroy() } })
  req.on('end', () => { try { ok(JSON.parse(s || '{}')) } catch { no(bad('Bad JSON.')) } })
  req.on('error', no)
})
const tries = new Map() // ip -> [timestamps]; a small brake on anyone creating profiles in bulk
const throttle = (ip) => {
  const now = Date.now(), list = (tries.get(ip) || []).filter((t) => now - t < 3600e3)
  if (list.length >= 20) throw bad('Too many attempts. Please try again later.', 429)
  list.push(now); tries.set(ip, list)
}

/* POST /api/guest { name, mobile }  ->  { token, expires, name } */
export async function createGuest(req) {
  throttle((req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').toString().split(',')[0].trim())
  const body = await readJson(req)
  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ')
  let mobile = String(body.mobile ?? '').replace(/\D/g, '')
  if (mobile.length === 12 && mobile.startsWith('91')) mobile = mobile.slice(2) // "+91 …" and "0…" prefixes are fine
  else if (mobile.length === 11 && mobile.startsWith('0')) mobile = mobile.slice(1)
  if (name.length < 2 || name.length > 80) throw bad('Please enter your full name.')
  if (!/^[6-9]\d{9}$/.test(mobile)) throw bad('Enter a valid 10-digit Indian mobile number.')
  const data = { name, phone: '+91' + mobile, phoneVerified: false }

  // the same browser session sending its own guest token updates that profile instead of creating a second one
  let existing = null
  const m = /^Bearer (lumag\..+)$/.exec(req.headers.authorization || '')
  if (m) existing = await guestFromToken(m[1]).catch(() => null)
  const user = existing ? await db.user.update({ where: { id: existing.id }, data }) : await db.user.create({ data })
  return { ...issueGuestToken(user.id), name: user.name, phone: user.phone }
}
