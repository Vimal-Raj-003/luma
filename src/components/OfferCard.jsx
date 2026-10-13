import { useEffect, useRef, useState } from 'react'
import PhotoGlass from './PhotoGlass'
import { OFFER, SITE } from '../data/site'
import { rememberIntent, useAccount } from '../auth'
import { payOffer } from '../checkout'
import { catalog } from '../catalog'

/* The ₹1 launch offer. Anyone can see it; paying needs an account (signing in carries straight on to the payment). */
export default function OfferCard() {
  const acct = useAccount()
  const [st, setSt] = useState({ busy: false, status: '', message: '' })

  const start = async () => {
    setSt({ busy: true, status: '', message: '' })
    const r = await payOffer(acct.getToken)
    setSt({ busy: false, status: r.status, message: r.status === 'paid' ? `Payment successful. Thank you! Payment id: ${r.paymentId}` : r.message })
  }
  const go = useRef()
  go.current = start
  useEffect(() => {
    const on = (e) => { if (e.detail?.type !== 'offer' || e.detail.handled) return; e.detail.handled = true; go.current() }
    window.addEventListener('luma:resume', on)
    return () => window.removeEventListener('luma:resume', on)
  }, [])

  const buy = () => {
    if (!acct.loaded || st.busy) return
    if (!acct.signedIn) { rememberIntent({ type: 'offer' }); acct.signIn(); return }
    start()
  }

  if (!catalog.offer) return null // switched off by the Super Admin: the offer is not shown at all

  return (
    <section className="offer" aria-label={OFFER.title}>
      <div className="offer-copy">
        <p className="eyebrow light">Special offer</p>
        <h3 className="offer-title">{OFFER.title}</h3>
        <p className="offer-price"><b>{SITE.currency}{OFFER.price}</b> only</p>
        <p className="offer-ship"><span>Free Shipping</span><i>{OFFER.note}</i></p>
        <button className="btn btn-rose offer-btn" onClick={buy} disabled={st.busy}>{st.busy ? 'Opening payment…' : 'Buy Now'}</button>
        {st.message && <p className={`offer-msg${st.status === 'paid' ? ' ok' : ''}`} role="status">{st.message}</p>}
      </div>
      <div className="offer-art" aria-hidden="true"><PhotoGlass flavour={OFFER.id} /></div>
    </section>
  )
}
