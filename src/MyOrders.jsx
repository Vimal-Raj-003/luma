/* The customer's own order history (verified accounts only; the server returns only this customer's rows). Shown inside the footer's "My Orders" panel. */
import { useEffect, useState } from 'react'
import { SITE } from './data/site'
import { openAccount, useAccount } from './auth'

const PAY = { PAID: 'Paid', PENDING: 'Payment pending', FAILED: 'Payment failed' }
const STATUS = { CREATED: 'Placed', CONFIRMED: 'Confirmed', PREPARING: 'Preparing', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' }
const rupees = (paise) => `${SITE.currency}${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function MyOrders() {
  const acct = useAccount()
  const [st, setSt] = useState({ loading: true, error: '', orders: [] })
  useEffect(() => {
    if (!acct.member) return
    let live = true
    acct.getToken()
      .then((t) => fetch('/api/my/orders', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' }))
      .then((r) => r.json().then((j) => { if (!r.ok) throw new Error(j.error || 'Could not load your orders.'); return j }))
      .then((j) => live && setSt({ loading: false, error: '', orders: j.orders }))
      .catch((e) => live && setSt({ loading: false, error: e.message, orders: [] }))
    return () => { live = false }
  }, [acct.member])

  if (!acct.member) {
    return (
      <>
        <p className="is-sub">{acct.guest ? 'You are shopping as a guest, so your past orders are not shown here.' : 'Sign in to see your orders.'} For your privacy, order history needs a verified sign-in.</p>
        <button className="btn btn-rose btn-sm" onClick={() => openAccount('signin')}>Sign in securely</button>
      </>
    )
  }
  if (st.loading) return <p className="is-sub">Loading your orders…</p>
  if (st.error) return <p className="is-sub" role="alert">{st.error}</p>
  if (!st.orders.length) return <p className="is-sub">You have not placed an order yet. Your orders will appear here.</p>
  return (
    <ul className="mo">
      {st.orders.map((o) => (
        <li key={o.id}>
          <div className="mo-top"><strong>#{o.id.slice(-8).toUpperCase()}</strong><span>{when(o.createdAt)}</span></div>
          <ul className="mo-items">{o.items.map((i, k) => <li key={k}><span>{i.name} × {i.qty}</span><span>{rupees(i.unit * i.qty)}</span></li>)}</ul>
          <div className="mo-sum"><span>Shipping {o.shipping ? rupees(o.shipping) : 'free'}</span><b>{rupees(o.total)}</b></div>
          <div className="mo-tags"><span className={`mo-tag ${o.paymentStatus.toLowerCase()}`}>{PAY[o.paymentStatus] || o.paymentStatus}</span><span className="mo-tag">{STATUS[o.orderStatus] || o.orderStatus}</span></div>
        </li>
      ))}
    </ul>
  )
}
