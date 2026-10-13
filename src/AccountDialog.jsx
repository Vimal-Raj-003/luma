/* The LUMA front door. "Create your LUMA account" is just a name and a mobile number: it makes a lightweight (guest) customer and shopping continues at once.
   "Sign in to LUMA" is for returning customers and is Google or email (Clerk). There is no OTP / SMS code anywhere.
   Opened with  window.dispatchEvent(new CustomEvent('luma:account', { detail: { mode: 'create' | 'signin' } })). */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useClerk, useSignIn } from '@clerk/clerk-react'
import { forgetIntent, replayIntent, takeIntent } from './intent'
import { createGuest } from './guest'

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5Z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.2 5.6c4.3-3.9 7.1-9.7 7.1-17.1Z" />
    <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.9-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1Z" />
    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.2-5.6c-2 1.4-4.7 2.2-8 2.2-6.3 0-11.7-4.1-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48Z" />
  </svg>
)

// a 10-digit Indian mobile number: starts with 6-9; pasted "+91 …", "91…" or "0…" prefixes are dropped
const digits = (v) => { let d = v.replace(/\D/g, ''); if (d.length > 10 && d.startsWith('91')) d = d.slice(2); if (d.length > 10 && d.startsWith('0')) d = d.slice(1); return d.slice(0, 10) }
const validMobile = (d) => /^[6-9]\d{9}$/.test(d)

export default function AccountDialog() {
  const [mode, setMode] = useState(null) // 'create' | 'signin' | null (closed)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const clerk = useClerk()
  const { signIn } = useSignIn()
  const first = useRef(null)

  useEffect(() => {
    const on = (e) => { setMode(e.detail?.mode === 'create' ? 'create' : 'signin'); setName(''); setMobile(''); setErr(''); setBusy(false) }
    window.addEventListener('luma:account', on)
    return () => window.removeEventListener('luma:account', on)
  }, [])

  const dismiss = () => { forgetIntent(); setMode(null) } // closed without continuing: the purchase they started is dropped
  useEffect(() => {
    if (!mode) return
    first.current?.focus()
    const key = (e) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); dismiss() } } // capture: a product sheet underneath must not close too
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [mode])

  if (!mode) return null
  const create = mode === 'create'
  const here = () => window.location.href

  // Create Account: name + mobile only. A lightweight customer profile is made on the server (mobile unverified) and shopping carries straight on.
  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (name.trim().length < 2) return setErr('Please enter your full name.')
    if (!validMobile(mobile)) return setErr('Enter a valid 10-digit Indian mobile number.')
    setBusy(true)
    try { await createGuest(name, mobile); setMode(null); replayIntent(takeIntent()) } catch (x) { console.error('[auth] could not create the profile', x); setErr(x.message) }
    setBusy(false)
  }

  // Sign In: Google or email (Clerk)
  const google = async () => {
    setBusy(true); setErr('')
    try { // Clerk's sign-in start also creates the account when this Google user is new
      await signIn.authenticateWithRedirect({ strategy: 'oauth_google', redirectUrl: '/sso-callback', redirectUrlComplete: here() })
    } catch (x) { console.error('[auth] Google sign-in failed', x); setErr('Google sign-in could not start. Please try again.'); setBusy(false) }
  }
  const email = () => {
    setMode(null)
    clerk.openSignIn({ forceRedirectUrl: here(), signInForceRedirectUrl: here(), signUpForceRedirectUrl: here() })
  }

  return createPortal( // on the page body, so the navbar's own stacking context cannot trap it
    (
      <div className="acd" role="dialog" aria-modal="true" aria-labelledby="acd-title">
        <div className="acd-back" onClick={dismiss} />
        <div className="acd-panel">
          <button className="acd-x" onClick={dismiss} aria-label="Close">
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
          </button>

          {create ? (
            <form onSubmit={submit} noValidate>
              <h2 id="acd-title">Create your LUMA account</h2>
              <p className="acd-sub">Just your name and mobile number.</p>
              <label className="acd-field">
                <span>Full Name</span>
                <input ref={first} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={80} />
              </label>
              <label className="acd-field">
                <span>Mobile Number</span>
                <span className="acd-phone">
                  <b>+91</b>
                  <input value={mobile} onChange={(e) => setMobile(digits(e.target.value))} placeholder="9876543210" inputMode="numeric" autoComplete="tel-national" maxLength={14} aria-label="10-digit mobile number" />
                </span>
              </label>
              {err && <p className="acd-err" role="alert">{err}</p>}
              <button className="btn btn-rose acd-primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : 'Continue'}</button>
              <p className="acd-switch">Already have an account? <button type="button" onClick={() => { setErr(''); setMode('signin') }}>Sign in</button></p>
            </form>
          ) : (
            <div>
              <h2 id="acd-title">Sign in to LUMA</h2>
              <p className="acd-sub">Welcome back. Sign in with Google or email.</p>
              {err && <p className="acd-err" role="alert">{err}</p>}
              <button type="button" className="acd-google" ref={first} onClick={google} disabled={busy}><GoogleG /><span>Continue with Google</span></button>
              <button type="button" className="acd-email" onClick={email} disabled={busy}>Use email instead</button>
              <p className="acd-switch">New to LUMA? <button type="button" onClick={() => { setErr(''); setMode('create') }}>Create account</button></p>
            </div>
          )}
        </div>
      </div>
    ),
    document.body,
  )
}
