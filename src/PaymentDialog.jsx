/* LUMA's "Payment Options" window, shown when a customer pays (Buy Now, the cart, the ₹1 offer). Mounted once (in the navbar), opened through payBridge.
     UPI                           -> a QR for the exact amount the SERVER calculated, paying LUMA's UPI ID (any UPI app can scan it)
     Cards, Netbanking & Wallet    -> hands back to checkout.js, which opens Razorpay (UPI is switched off inside it)
   The QR is drawn here from the link the server returned. This window never says a QR payment succeeded: nothing can verify it. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import qrcode from 'qrcode-generator'
import { bridge } from './payBridge'
import { SITE } from './data/site'

const money = (paise) => `${SITE.currency}${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function QR({ text }) {
  const svg = (() => {
    const q = qrcode(0, 'M') // type 0 = the smallest size that fits; M = medium error correction
    q.addData(text)
    q.make()
    return q.createSvgTag({ cellSize: 4, margin: 4, scalable: true })
  })()
  return <div className="pay-qr" data-upi={text} role="img" aria-label="UPI payment QR code" dangerouslySetInnerHTML={{ __html: svg }} />
}

export default function PaymentDialog() {
  const [open, setOpen] = useState(false)
  const [screen, setScreen] = useState('choose') // choose | loading | qr
  const [d, setD] = useState(null) // { orderId, ref, amount, link, upiId, payee }
  const [err, setErr] = useState('')
  const ctx = useRef(null) // { start, resolve }
  const first = useRef(null)
  const screenRef = useRef('choose')
  screenRef.current = screen

  useEffect(() => {
    bridge.open = (c) => new Promise((resolve) => { ctx.current = { ...c, resolve }; setScreen('choose'); setD(null); setErr(''); setOpen(true) })
    return () => { bridge.open = null }
  }, [])

  const finish = (value) => { const c = ctx.current; ctx.current = null; setOpen(false); c?.resolve(value) }
  const close = () => {
    if (screenRef.current === 'qr') return finish({ method: 'upi', result: { status: 'pending', message: 'UPI QR shown. Your order stays unpaid until your payment is received.' } })
    finish({ method: null })
  }

  useEffect(() => {
    if (!open) return
    first.current?.focus()
    const key = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); close() } }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [open, screen])

  const chooseUpi = async () => {
    setScreen('loading'); setErr('')
    try { setD(await ctx.current.start()); setScreen('qr') } catch (e) { setErr(e.message); setScreen('choose') } // the server prices it; the amount in the QR is exactly this
  }

  if (!open) return null
  return createPortal(
    (
      <div className="pay" role="dialog" aria-modal="true" aria-labelledby="pay-title">
        <div className="pay-back" onClick={close} />
        <div className="pay-panel">
          <button className="acd-x" onClick={close} aria-label="Close">
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
          </button>

          {screen === 'choose' && (
            <>
              <h2 id="pay-title">Payment Options</h2>
              <p className="pay-sub">How would you like to pay?</p>
              <button ref={first} className="pay-opt" onClick={chooseUpi}><b>UPI</b><span>Google Pay, PhonePe, Paytm or any UPI app: scan a QR code</span></button>
              <button className="pay-opt" onClick={() => finish({ method: 'razorpay' })}><b>Cards, Netbanking &amp; Wallet</b><span>Secure payment through Razorpay</span></button>
              {err && <p className="pay-err" role="alert">{err}</p>}
            </>
          )}

          {screen === 'loading' && (<><h2 id="pay-title">UPI</h2><p className="pay-sub" role="status">Preparing your payment…</p></>)}

          {screen === 'qr' && d && (
            <>
              <h2 id="pay-title">Pay with UPI</h2>
              <p className="pay-amt">{money(d.amount)}</p>
              <QR text={d.link} />
              <p className="pay-scan">Scan this QR using Google Pay, PhonePe or any UPI app</p>
              <a className="btn btn-dark btn-sm pay-open" href={d.link}>Open UPI app</a>
              <p className="pay-to">Paying <b>{d.payee}</b> · {d.upiId}<br />Order reference <b>{d.ref}</b></p>
              <p className="pay-fine">Keep your UPI app's payment receipt. This window cannot show the result of a QR payment.</p>
              <button ref={first} className="btn btn-dark pay-go" onClick={close}>Close</button>
            </>
          )}
        </div>
      </div>
    ),
    document.body,
  )
}
