/* Browser side of paying: ask the server for an order, open Razorpay Checkout, send the result back to the server to be verified.
   Resolves to { status: 'paid' | 'failed' | 'cancelled' | 'error', message, ... }. The server decides what is paid; this only reports. */
const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

const loadScript = () => new Promise((ok, no) => {
  if (window.Razorpay) return ok()
  const s = document.createElement('script')
  s.src = SCRIPT
  s.onload = ok
  s.onerror = () => no(new Error('Could not load Razorpay Checkout. Check your connection and try again.'))
  document.head.appendChild(s)
})
const post = async (url, body, token) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`)
  return data
}

async function payOrder(request, getToken) {
  let order, token
  try {
    await loadScript()
    token = await getToken()
    order = await post('/api/create-order', request, token)
  } catch (e) {
    console.error('[checkout]', e)
    return { status: 'error', message: e.message }
  }
  return new Promise((done) => {
    // Razorpay's last real error. The customer can retry inside the window, so it is only reported when they close it.
    let failure = null
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'LUMA',
      description: order.description,
      theme: { color: '#C73B72' },
      handler: async (resp) => {
        try {
          const v = await post('/api/verify-payment', resp, token)
          done({ status: 'paid', message: 'Payment successful.', paymentId: v.paymentId, orderId: v.orderId, dbOrderId: v.dbOrderId, amount: v.amount })
        } catch (e) {
          console.error('[checkout] verification failed', e)
          done({ status: 'failed', message: `We could not verify this payment (${e.message}). If money was deducted, contact us with payment id ${resp.razorpay_payment_id}.` })
        }
      },
      modal: { ondismiss: () => done(failure || { status: 'cancelled', message: 'Payment cancelled. You can try again.' }) },
    })
    rzp.on('payment.failed', (r) => {
      const e = r.error || {}
      console.error('[checkout] payment failed', e)
      failure = { status: 'failed', message: `${e.description || 'Payment failed.'} (code ${e.code || 'unknown'}). You can try again.` }
      post('/api/payment-failed', { razorpay_order_id: order.orderId, error: { code: e.code, description: e.description, reason: e.reason, step: e.step, source: e.source } }, token).catch((x) => console.error('[checkout]', x))
    })
    rzp.open()
  })
}

export const payCart = (items, getToken) => payOrder({ items }, getToken) // the cart
export const payOffer = (getToken) => payOrder({ offer: true }, getToken) // the ₹1 offer: one Strawberry Falooda, shipping ₹0, ₹1 in total
