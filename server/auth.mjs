/* Clerk session → LUMA customer. The browser sends its Clerk session token; it is verified here with CLERK_SECRET_KEY
   (never sent to the browser) and the customer row is created or updated. authUserId is unique, so one login = one customer. */
import { createClerkClient, verifyToken } from '@clerk/backend'
import { db } from './db.mjs'
import { GUEST_PREFIX, guestFromToken } from './guest.mjs'

let clerk
const client = () => clerk || (clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY }))

export const authError = (message, status = 401) => Object.assign(new Error(message), { status })

export async function requireUser(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  if (!m) throw authError('Please sign in to continue.')
  if (m[1].startsWith(GUEST_PREFIX)) return guestFromToken(m[1]) // a name + mobile customer: may shop and pay, nothing more (it is not a Clerk session, so requireAdmin below never accepts it)
  if (!process.env.CLERK_SECRET_KEY) throw authError('Sign-in is not configured on the server.', 500)
  let claims
  try { claims = await verifyToken(m[1], { secretKey: process.env.CLERK_SECRET_KEY }) } catch { throw authError('Your session has expired. Please sign in again.') }
  return syncUser(claims.sub)
}

export async function syncUser(authUserId) {
  const known = await db.user.findUnique({ where: { authUserId } })
  const cu = await client().users.getUser(authUserId)
  const email = (cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId) || cu.emailAddresses[0])?.emailAddress || null
  const phone = (cu.phoneNumbers.find((p) => p.id === cu.primaryPhoneNumberId) || cu.phoneNumbers[0])?.phoneNumber || null
  if (!email && !phone) throw authError('Your account has no mobile number or email address.', 400)
  const name = [cu.firstName, cu.lastName].filter(Boolean).join(' ') || null
  // only fields Clerk actually has are written, so a later login never blanks what is already saved
  const phoneOk = !!phone && (cu.phoneNumbers.find((p) => p.phoneNumber === phone)?.verification?.status === 'verified') // verified by Clerk's OTP, never by a guest typing it
  const data = { ...(name ? { name } : {}), ...(email ? { email } : {}), ...(phone ? { phone, phoneVerified: phoneOk } : {}) }
  try {
    // upsert on the unique authUserId: concurrent first requests cannot create two customers; email and phone are unique too
    const user = await db.user.upsert({ where: { authUserId }, create: { authUserId, ...data }, update: data })
    return Object.assign(user, { created: !known })
  } catch (e) {
    if (e.code === 'P2002') throw authError('This mobile number or email is already linked to another LUMA account.', 409)
    throw e
  }
}

/* Super Admin: the verified Clerk session must belong to the ONE email in SUPER_ADMIN_EMAIL (server environment only). Checked on every admin request;
   nothing the browser sends ("isAdmin", a header, a body field) is ever believed. 401 = not signed in, 403 = signed in but not the Super Admin. */
const primaryEmail = (cu) => cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId) || cu.emailAddresses[0]
export async function requireAdmin(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  if (!m) throw authError('Please sign in.')
  if (!process.env.CLERK_SECRET_KEY) throw authError('Sign-in is not configured on the server.', 500)
  let claims
  try { claims = await verifyToken(m[1], { secretKey: process.env.CLERK_SECRET_KEY }) } catch { throw authError('Your session has expired. Please sign in again.') }
  const want = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase()
  const cu = await client().users.getUser(claims.sub)
  const mail = primaryEmail(cu)
  if (!want || !mail || mail.verification?.status !== 'verified' || mail.emailAddress.toLowerCase() !== want) throw authError('Forbidden.', 403)
  return cu.id
}
export const isAdmin = (req) => requireAdmin(req).then(() => true, () => false)
