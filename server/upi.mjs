/* The UPI QR shown to the customer. POST /api/upi/start prices the purchase from the database (the browser's idea of the price is never used), saves the Order
   (unpaid) and returns the upi://pay link that the browser draws as a QR. The QR always pays UPI_ID, and carries the exact server-calculated amount.
   Nothing here can mark an order PAID: a personal UPI ID gives the server no way to see that money arrived, so a QR payment is NOT reported as successful anywhere. */
import { db } from './db.mjs'
import { loadEnv } from './env.mjs'
import { requireUser } from './auth.mjs'
import { buildLines, SHIPPING } from './razorpay.mjs'

loadEnv()

const UPI_ID = (process.env.UPI_ID || 'abianbu1711@okaxis').trim() // the receiving address (not a secret)
const PAYEE = 'LUMA'
const RETRY_WINDOW_MS = 60 * 60 * 1000

const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)) }
const bad = (message, status = 400) => Object.assign(new Error(message), { status })
const readJson = (req) => new Promise((ok, no) => {
  let s = ''
  req.on('data', (c) => { s += c; if (s.length > 5000) { no(bad('Request too large.')); req.destroy() } })
  req.on('end', () => { try { ok(JSON.parse(s || '{}')) } catch { no(bad('Bad JSON.')) } })
  req.on('error', no)
})
const sig = (lines) => lines.map((l) => `${l.productId}:${l.quantity}:${l.unitPrice}`).sort().join('|')

/* the reference shown to the customer and put in the QR: LUMA + the last 10 characters of the order id */
export const orderRef = (orderId) => 'LUMA' + String(orderId).slice(-10).toUpperCase()

/* upi://pay link. pa is validated and written as is (the standard form); everything else is URL-encoded. am is rupees with two decimals. */
export function upiLink(paise, ref) {
  if (!/^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,63}$/i.test(UPI_ID)) throw bad('The UPI receiving ID is not configured correctly.', 500)
  if (!Number.isInteger(paise) || paise < 100) throw bad('Invalid amount.')
  const q = [`pa=${UPI_ID}`, `pn=${encodeURIComponent(PAYEE)}`, `am=${(paise / 100).toFixed(2)}`, 'cu=INR', `tr=${encodeURIComponent(ref)}`, `tn=${encodeURIComponent('LUMA order ' + ref)}`]
  return `upi://pay?${q.join('&')}`
}

async function start(req, res) {
  const user = await requireUser(req)
  const lines = await buildLines(await readJson(req))
  const total = lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0) + SHIPPING

  // an unpaid attempt for the same purchase is reused, so opening the QR again does not pile up orders
  const open = await db.order.findMany({
    where: { userId: user.id, orderStatus: { not: 'CANCELLED' }, total, paymentStatus: 'PENDING', createdAt: { gt: new Date(Date.now() - RETRY_WINDOW_MS) }, payments: { some: { method: 'UPI' } } },
    include: { items: true }, orderBy: { createdAt: 'desc' },
  })
  const same = open.find((o) => sig(o.items) === sig(lines))
  const order = same || await db.order.create({
    data: { userId: user.id, subtotal: total - SHIPPING, shipping: SHIPPING, total, items: { create: lines }, payments: { create: { method: 'UPI', amount: total, currency: 'INR', status: 'PENDING' } } },
  })
  const ref = orderRef(order.id)
  console.log(`[upi] QR for order ${ref}: ${total} paise (${same ? 'reused' : 'new'}), unpaid`)
  send(res, 200, { orderId: order.id, ref, amount: total, currency: 'INR', upiId: UPI_ID, payee: PAYEE, link: upiLink(total, ref), reused: !!same })
}

/* Connect-style middleware: POST /api/upi/start */
export function upiApi(req, res, next) {
  const path = (req.url || '').split('?')[0]
  if (path !== '/api/upi/start') return next()
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only.' })
  start(req, res).catch((e) => { console.error('[upi]', e.message); if (!res.headersSent) send(res, e.status || 400, { error: e.message }) })
}
