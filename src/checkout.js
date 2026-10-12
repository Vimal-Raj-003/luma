/* Cart → Razorpay. The server creates the order (and works out the amount from the cart), Checkout collects the payment,
   the server verifies the signature. Resolves to { status: 'paid' | 'failed' | 'cancelled' | 'error', message, ... }. */
const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

const loadScript = () => new Promise((ok, no) => {
  if (window.Razorpay) return ok()
  const s = document.createElement('script')
  s.src = SCRIPT
  s.onload = ok
  s.onerror = () => no(new Error('Could not load Razorpay Checkout. Check your connection and try again.'))
  document.head.appendChild(s)
})
const post = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`)
  return data
}

export async function payCart(items) {
  let order
  try {
    await loadScript()
    order = await post('/api/create-order', { items })
  } catch (e) {
    console.error('[checkout]', e)
    return { status: 'error', message: e.message }
  }
  return new Promise((done) => {
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
          const v = await post('/api/verify-payment', resp)
          done({ status: 'paid', message: 'Payment successful.', paymentId: v.paymentId, orderId: v.orderId })
        } catch (e) {
          console.error('[checkout] verification failed', e)
          done({ status: 'failed', message: 'We could not verify this payment. If money was deducted, please contact us with payment id ' + resp.razorpay_payment_id + '.' })
        }
      },
      modal: { ondismiss: () => done({ status: 'cancelled', message: 'Payment cancelled. You can try again.' }) },
    })
    rzp.on('payment.failed', (r) => {
      console.error('[checkout] payment failed', r.error)
      done({ status: 'failed', message: (r.error?.description || 'Payment failed.') + ' You can try again.' })
    })
    rzp.open()
  })
}
