/* Razorpay server side. Everything that matters happens here, never in the browser:
   - /api/create-order    works out the amount from the DB price list (cart items, or the ₹1 offer), creates the Razorpay order and saves
                          the Order + OrderItems + a PENDING Payment for the signed-in customer. A cancelled / failed attempt is retried on the
                          SAME order (no duplicates).
   - /api/verify-payment  checks razorpay_order_id | razorpay_payment_id against razorpay_signature with RAZORPAY_KEY_SECRET, then marks the
                          order and payment PAID. The browser saying "success" is never enough.
   - /api/payment-failed  logs Razorpay's real error code / description and the order's status at Razorpay, and marks the payment FAILED.
   RAZORPAY_KEY_SECRET is read here only and never reaches the browser. */
import crypto from 'node:crypto'
import { db } from './db.mjs'
import { loadEnv } from './env.mjs'
import { requireUser } from './auth.mjs'
import { offerEnabled } from './settings.mjs'

loadEnv()

const OFFER_PRODUCT = 'strawberry' // the ₹1 offer is this product at its offerPrice, quantity 1, shipping ₹0
const SHIPPING = 0 // paise
const RETRY_WINDOW_MS = 60 * 60 * 1000

const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
const bad = (message, status = 400) => Object.assign(new Error(message), { status })
const readJson = (req) => new Promise((ok, no) => {
  let s = ''
  req.on('data', (c) => { s += c; if (s.length > 20000) { no(bad('Request too large.')); req.destroy() } })
  req.on('end', () => { try { ok(JSON.parse(s || '{}')) } catch { no(bad('Bad JSON.')) } })
  req.on('error', no)
})
const creds = () => {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) throw bad('Razorpay keys are missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local, then restart the server.', 500)
  return { id, secret }
}
const rzp = async (path, { id, secret }, init = {}) => {
  const r = await fetch('https://api.razorpay.com/v1' + path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') } })
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }
}
const sig = (lines) => lines.map((l) => `${l.productId}:${l.quantity}:${l.unitPrice}`).sort().join('|')

/* the lines of this purchase, priced from the DB */
async function buildLines(body) {
  if (body.offer) {
    if (!(await offerEnabled())) throw bad('The ₹1 offer is not available right now.')
    const p = await db.product.findUnique({ where: { id: OFFER_PRODUCT } })
    if (!p || !p.active || p.offerPrice == null) throw bad('The ₹1 offer is not available right now.')
    return [{ productId: p.id, productName: p.name, quantity: 1, unitPrice: p.offerPrice }] // quantity is fixed to 1
  }
  const items = body.items
  if (!Array.isArray(items) || !items.length) throw bad('The cart is empty.')
  const ids = items.map((i) => i?.id)
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true, archived: false } })
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))
  return items.map((it) => {
    const p = byId[it?.id], qty = it?.qty
    if (!p || !Number.isInteger(qty) || qty < 1 || qty > 99) throw bad('Invalid cart item.')
    return { productId: p.id, productName: p.name, quantity: qty, unitPrice: p.price }
  })
}

async function createOrder(req, res) {
  const user = await requireUser(req) // paying needs a signed-in customer
  const keys = creds()
  const body = await readJson(req)
  const lines = await buildLines(body)
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0)
  const total = subtotal + SHIPPING
  const description = (body.offer ? 'LUMA ₹1 Offer: ' : '') + lines.map((l) => `${l.productName} x${l.quantity}`).join(', ')

  // a cancelled or failed attempt is retried on the same order instead of creating another one
  const open = await db.order.findMany({
    where: { userId: user.id, paymentStatus: { in: ['PENDING', 'FAILED'] }, total, razorpayOrderId: { not: null }, createdAt: { gt: new Date(Date.now() - RETRY_WINDOW_MS) } },
    include: { items: true }, orderBy: { createdAt: 'desc' },
  })
  const same = open.find((o) => sig(o.items) === sig(lines))
  if (same) {
    console.log(`[razorpay] retry on existing order ${same.razorpayOrderId} (${total} paise) for ${user.email}`)
    return send(res, 200, { orderId: same.razorpayOrderId, amount: total, currency: 'INR', keyId: keys.id, description, dbOrderId: same.id, reused: true })
  }

  const r = await rzp('/orders', keys, { method: 'POST', body: JSON.stringify({ amount: total, currency: 'INR', receipt: 'luma_' + Date.now(), notes: { items: description.slice(0, 250), customer: user.id } }) })
  if (!r.ok) {
    console.error('[razorpay] order creation failed', r.status, JSON.stringify(r.data?.error))
    throw bad(r.data?.error?.description ? `Razorpay: ${r.data.error.description} (${r.data.error.code})` : 'Razorpay rejected the order.', 502)
  }
  const order = await db.order.create({
    data: {
      userId: user.id, subtotal, shipping: SHIPPING, total, razorpayOrderId: r.data.id,
      items: { create: lines },
      payments: { create: { razorpayOrderId: r.data.id, amount: total, currency: 'INR', status: 'PENDING' } },
    },
  })
  console.log(`[razorpay] order ${r.data.id} created: ${r.data.amount} paise ${r.data.currency} (${description}) for ${user.email}`)
  send(res, 200, { orderId: r.data.id, amount: r.data.amount, currency: r.data.currency, keyId: keys.id, description, dbOrderId: order.id })
}

async function verifyPayment(req, res) {
  const user = await requireUser(req)
  const keys = creds()
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: signature } = await readJson(req)
  if (![oid, pid, signature].every((v) => typeof v === 'string' && v)) throw bad('Missing payment fields.')
  const expected = crypto.createHmac('sha256', keys.secret).update(`${oid}|${pid}`).digest('hex')
  const a = Buffer.from(expected), b = Buffer.from(signature)
  if (!(a.length === b.length && crypto.timingSafeEqual(a, b))) {
    console.error(`[razorpay] verify ${oid} / ${pid}: SIGNATURE MISMATCH`)
    return send(res, 400, { verified: false, error: 'Signature mismatch.' })
  }
  const order = await db.order.findUnique({ where: { razorpayOrderId: oid } })
  if (!order || order.userId !== user.id) throw bad('Order not found.', 404)
  const info = await rzp(`/payments/${encodeURIComponent(pid)}`, keys) // for the log: what Razorpay itself says about this payment
  if (info.ok && info.data.order_id !== oid) throw bad('Payment does not belong to this order.')
  if (info.ok && info.data.amount !== order.total) throw bad('Paid amount does not match the order.')
  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', orderStatus: 'CONFIRMED', razorpayPaymentId: pid } }),
    db.payment.updateMany({ where: { orderId: order.id, razorpayOrderId: oid }, data: { status: 'PAID', razorpayPaymentId: pid } }),
  ])
  console.log(`[razorpay] verify ${oid} / ${pid}: VERIFIED, saved as PAID (${order.total} paise; Razorpay says ${info.data?.status || 'n/a'} via ${info.data?.method || 'n/a'})`)
  send(res, 200, { verified: true, orderId: oid, paymentId: pid, dbOrderId: order.id, amount: order.total })
}

async function paymentFailed(req, res) {
  const user = await requireUser(req)
  const keys = creds()
  const { razorpay_order_id: oid, error = {} } = await readJson(req)
  if (typeof oid !== 'string' || !oid) throw bad('Missing order id.')
  const order = await db.order.findUnique({ where: { razorpayOrderId: oid } })
  if (!order || order.userId !== user.id) throw bad('Order not found.', 404)
  const at = await rzp(`/orders/${encodeURIComponent(oid)}`, keys)
  console.error(`[razorpay] PAYMENT FAILED order=${oid} code=${error.code} description="${error.description}" reason=${error.reason} step=${error.step} source=${error.source} | razorpay order status=${at.data?.status || 'n/a'} attempts=${at.data?.attempts ?? 'n/a'}`)
  if (order.paymentStatus !== 'PAID') {
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } }),
      db.payment.updateMany({ where: { orderId: order.id, razorpayOrderId: oid }, data: { status: 'FAILED' } }),
    ])
  }
  send(res, 200, { ok: true, razorpayOrderStatus: at.data?.status })
}

/* Connect-style middleware: POST /api/create-order, /api/verify-payment, /api/payment-failed */
export function razorpayApi(req, res, next) {
  const path = (req.url || '').split('?')[0]
  const route = { '/api/create-order': createOrder, '/api/verify-payment': verifyPayment, '/api/payment-failed': paymentFailed }[path]
  if (!route) return next()
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only.' })
  route(req, res).catch((e) => { console.error('[razorpay]', e.message); if (!res.headersSent) send(res, e.status || 400, { error: e.message }) })
}
