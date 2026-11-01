/* POST /api/razorpay-webhook: Razorpay tells the server, directly, that a payment was captured. This is what makes PAID reliable when the customer closes the
   page right after paying (UPI app hand-offs especially): the browser's success callback can be lost, Razorpay's own message cannot.
   Trust: the request is accepted only when X-Razorpay-Signature equals HMAC-SHA256(raw body, RAZORPAY_WEBHOOK_SECRET). The secret is chosen by you in the
   Razorpay Dashboard (Settings → Webhooks) and set as the server environment variable RAZORPAY_WEBHOOK_SECRET; nothing is accepted until both match.
   An order becomes PAID only when Razorpay reports the payment as captured AND the amount equals the amount the server priced for that order. */
import crypto from 'node:crypto'
import { db } from './db.mjs'
import { loadEnv } from './env.mjs'

loadEnv()

const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
const rawBody = (req) => new Promise((ok, no) => {
  const chunks = []
  let n = 0
  req.on('data', (c) => { n += c.length; if (n > 200000) { no(Object.assign(new Error('Request too large.'), { status: 413 })); req.destroy() } else chunks.push(c) })
  req.on('end', () => ok(Buffer.concat(chunks)))
  req.on('error', no)
})

export async function handleWebhook(req, res) {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()
  if (!secret) return send(res, 503, { error: 'Webhook is not configured on the server.' })
  const raw = await rawBody(req)
  const given = String(req.headers['x-razorpay-signature'] || '')
  const want = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  const a = Buffer.from(want), b = Buffer.from(given)
  if (!(a.length === b.length && crypto.timingSafeEqual(a, b))) { console.error('[webhook] bad signature'); return send(res, 400, { error: 'Bad signature.' }) }

  let event
  try { event = JSON.parse(raw.toString('utf8')) } catch { return send(res, 400, { error: 'Bad JSON.' }) }
  if (event.event !== 'payment.captured' && event.event !== 'order.paid') return send(res, 200, { ok: true, ignored: event.event }) // other events: nothing to do
  const pay = event.payload?.payment?.entity
  const orderId = pay?.order_id || event.payload?.order?.entity?.id
  if (!pay?.id || !orderId) return send(res, 200, { ok: true, ignored: 'no payment' })

  const order = await db.order.findUnique({ where: { razorpayOrderId: orderId } })
  if (!order) return send(res, 200, { ok: true, ignored: 'unknown order' })
  if (order.paymentStatus === 'PAID') return send(res, 200, { ok: true, already: true })
  if (pay.status !== 'captured' || pay.amount !== order.total || pay.currency !== 'INR') {
    console.error(`[webhook] ${orderId}: not marked paid (status ${pay.status}, amount ${pay.amount} vs ${order.total})`)
    return send(res, 200, { ok: true, ignored: 'amount or status mismatch' })
  }
  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { paymentStatus: 'PAID', orderStatus: order.orderStatus === 'CREATED' ? 'CONFIRMED' : order.orderStatus, razorpayPaymentId: pay.id } }),
    db.payment.updateMany({ where: { orderId: order.id, razorpayOrderId: orderId }, data: { status: 'PAID', razorpayPaymentId: pay.id } }),
  ])
  console.log(`[webhook] ${orderId} / ${pay.id}: captured ${pay.amount} paise via ${pay.method || 'n/a'}, saved as PAID`)
  send(res, 200, { ok: true, paid: true })
}

export function webhookApi(req, res, next) {
  const path = (req.url || '').split('?')[0]
  if (path !== '/api/razorpay-webhook') return next()
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only.' })
  handleWebhook(req, res).catch((e) => { console.error('[webhook]', e.message); if (!res.headersSent) send(res, e.status || 500, { error: 'Server error.' }) })
}
