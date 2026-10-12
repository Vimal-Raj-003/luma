/* Razorpay server side: creates orders and verifies payment signatures.
   RAZORPAY_KEY_SECRET is read here only (from .env.local or the host's environment) and never reaches the browser.
   The amount is always computed here from the cart contents and the price list; any amount the browser might send is ignored. */
import crypto from 'node:crypto'
import { FLAVOURS } from '../src/data/site.js'

try { process.loadEnvFile(new URL('../.env.local', import.meta.url)) } catch { /* env may come from the host instead */ }

const PRICES = Object.fromEntries(FLAVOURS.map((f) => [f.id, f]))
const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
const readJson = (req) => new Promise((ok, no) => {
  let s = ''
  req.on('data', (c) => { s += c; if (s.length > 20000) { no(new Error('Request too large.')); req.destroy() } })
  req.on('end', () => { try { ok(JSON.parse(s || '{}')) } catch { no(new Error('Bad JSON.')) } })
  req.on('error', no)
})
const creds = () => {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET
  if (!id || !secret) throw Object.assign(new Error('Razorpay keys are missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local, then restart the server.'), { status: 500 })
  return { id, secret }
}

async function createOrder(req, res) {
  const { id, secret } = creds()
  const { items } = await readJson(req)
  if (!Array.isArray(items) || !items.length) return send(res, 400, { error: 'The cart is empty.' })
  let rupees = 0
  const lines = []
  for (const it of items) {
    const f = PRICES[it?.id], qty = it?.qty
    if (!f || !Number.isInteger(qty) || qty < 1 || qty > 99) return send(res, 400, { error: 'Invalid cart item.' })
    rupees += f.price * qty
    lines.push(`${f.name} x${qty}`)
  }
  const amount = rupees * 100 // paise
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') },
    body: JSON.stringify({ amount, currency: 'INR', receipt: 'luma_' + Date.now(), notes: { items: lines.join(', ').slice(0, 250) } }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    console.error('[razorpay] order creation failed', r.status, data?.error)
    return send(res, 502, { error: data?.error?.description || 'Razorpay rejected the order.' })
  }
  console.log(`[razorpay] order ${data.id} created: ${data.amount} paise (${lines.join(', ')})`)
  send(res, 200, { orderId: data.id, amount: data.amount, currency: data.currency, keyId: id, description: lines.join(', ') })
}

async function verifyPayment(req, res) {
  const { secret } = creds()
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = await readJson(req)
  if (![oid, pid, sig].every((v) => typeof v === 'string' && v)) return send(res, 400, { verified: false, error: 'Missing payment fields.' })
  const expected = crypto.createHmac('sha256', secret).update(`${oid}|${pid}`).digest('hex')
  const a = Buffer.from(expected), b = Buffer.from(sig)
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b)
  console.log(`[razorpay] verify ${oid} / ${pid}: ${ok ? 'VERIFIED' : 'SIGNATURE MISMATCH'}`)
  send(res, ok ? 200 : 400, ok ? { verified: true, orderId: oid, paymentId: pid } : { verified: false, error: 'Signature mismatch.' })
}

/* Connect-style middleware: POST /api/create-order and POST /api/verify-payment */
export function razorpayApi(req, res, next) {
  const path = (req.url || '').split('?')[0]
  const route = path === '/api/create-order' ? createOrder : path === '/api/verify-payment' ? verifyPayment : null
  if (!route) return next()
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only.' })
  route(req, res).catch((e) => { console.error('[razorpay]', e.message); if (!res.headersSent) send(res, e.status || 400, { error: e.message }) })
}
