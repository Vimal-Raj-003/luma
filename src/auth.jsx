/* Sign up / sign in / sign out (Clerk) and the customer sync. Browsing never needs an account; buying does. */
import { useEffect, useRef, useState } from 'react'
import { AuthenticateWithRedirectCallback, ClerkProvider, useAuth, useClerk, useUser } from '@clerk/clerk-react'
import AccountDialog from './AccountDialog'
import { forgetIntent, rememberIntent, replayIntent, takeIntent } from './intent'
import { clearGuest, getGuest, useGuest } from './guest'

export { rememberIntent }

const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const words = {
  signIn: { start: { title: 'Sign in to LUMA', subtitle: 'to buy your Falooda' } },
  signUp: { start: { title: 'Create your LUMA account', subtitle: 'to buy your Falooda' } },
  userButton: { action__manageAccount: 'My Account', action__signOut: 'Logout' },
}
// single-page site: after signing in the visitor stays exactly where they were (no navigation, no reload). The one exception is coming back from
// Google (/sso-callback), which has to return to the page they started from.
const stay = (to) => { if (window.location.pathname === '/sso-callback' && to) window.location.replace(to) }
const look = { variables: { colorPrimary: '#C73B72', colorText: '#2b0f27', borderRadius: '14px' }, layout: { socialButtonsPlacement: 'top', socialButtonsVariant: 'blockButton' } }

export const AuthProvider = ({ children }) =>
  KEY ? <ClerkProvider publishableKey={KEY} afterSignOutUrl="/" appearance={look} localization={words} routerPush={stay} routerReplace={stay}>{children}</ClerkProvider> : children

/* { loaded, signedIn, signIn(), getToken() } — signIn() opens the LUMA account window over the page (Google first, email as a fallback), so the visitor stays where they were */
export const openAccount = (mode) => window.dispatchEvent(new CustomEvent('luma:account', { detail: { mode } }))
/* signedIn = may shop and pay (a Clerk account, or a name + mobile guest); member = a real Clerk account (My Orders, the account menu). The token sent to the server is the Clerk session
   for a member and the guest token otherwise. */
const useClerkAccount = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const guest = useGuest()
  const member = !!isSignedIn
  const token = member ? getToken : async () => getGuest()?.token || null
  const clerk = useClerk()
  const { user } = useUser()
  // who to show in the menu: the Clerk account's name and email, or the guest's name
  const who = member
    ? { name: user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Your account', sub: user?.primaryEmailAddress?.emailAddress || '' }
    : guest ? { name: guest.name, sub: 'Guest checkout' } : null
  // Logout clears only the customer identity (the Clerk session and any name + mobile profile); the cart, wishlist and catalog are left alone
  const logout = async () => { forgetIntent(); clearGuest(); if (member) await clerk.signOut() }
  return { loaded: isLoaded, member, guest: !member ? guest : null, who, logout, manage: () => clerk.openUserProfile(), signedIn: member || !!guest, getToken: token, signIn: () => openAccount('create') } // signIn() is what Buy Now / Pay call when the visitor has no identity yet: it opens Create Account (name + mobile), which links to Sign In for returning customers
}
const useNoAccount = () => ({ loaded: true, member: false, guest: null, who: null, logout: async () => {}, manage: () => {}, signedIn: false, getToken: async () => null, signIn: () => console.error('[auth] VITE_CLERK_PUBLISHABLE_KEY is not set') })
export const useAccount = KEY ? useClerkAccount : useNoAccount

/* navbar control: ONE account icon. Logged out it opens Sign In / Create Account; logged in (a Clerk account or a name + mobile guest) it shows the customer's
   initial and opens their menu. It also syncs a Clerk customer to the database and replays the purchase they started. */
const ico = (d) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const PATHS = {
  signin: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  create: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6',
  account: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6',
  wishlist: 'M12 21s-7.5-4.6-9.4-9.3C1.3 8.4 3.2 5 6.6 5c2 0 3.7 1.1 5.4 3.2C13.7 6.1 15.4 5 17.4 5c3.4 0 5.3 3.4 4 6.7C19.5 16.4 12 21 12 21Z',
  cart: 'M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Zm4 0V6.5a3 3 0 0 1 6 0V8',
  admin: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3Z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
}

export function AccountButton() {
  const acct = useAccount()
  const synced = useRef(false)
  const [admin, setAdmin] = useState(false) // true only when the server says this account is the Super Admin
  useEffect(() => {
    if (!acct.member) { synced.current = false; setAdmin(false); return } // logged out: no stale admin state
    if (synced.current) return
    synced.current = true
    clearGuest() // a real account replaces any name + mobile profile this tab had
    replayIntent(takeIntent()) // once the sign-in window has gone
    acct.getToken().then((t) => fetch('/api/me', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }))
      .then((r) => r.json().then((j) => (r.ok ? setAdmin(j.admin === true) : console.error('[auth] customer sync failed:', j.error))))
      .catch((e) => console.error('[auth] customer sync failed', e))
  }, [acct.member])

  const [menu, setMenu] = useState(false)
  useEffect(() => {
    if (!menu) return
    const key = (e) => e.key === 'Escape' && setMenu(false)
    const away = (e) => !e.target.closest('.acct-wrap') && setMenu(false)
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', away)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', away) }
  }, [menu])
  useEffect(() => { if (!acct.signedIn) setMenu(false) }, [acct.signedIn])

  if (!acct.loaded) return <span className="acct-slot" aria-hidden="true" />
  const go = (fn) => () => { setMenu(false); fn() }
  const footerLink = (href) => () => document.querySelector(`footer a[href="${href}"]`)?.click() // Wishlist opens the footer's own wishlist panel
  const Item = ({ icon, children, onClick }) => <button role="menuitem" onClick={go(onClick)}>{ico(PATHS[icon])}<span>{children}</span></button>
  const who = acct.who

  return (
    <span className="acct-wrap">
      <AccountDialog />
      <button className="cart-btn acct-btn" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" aria-label={who ? `Account menu for ${who.name}` : 'Account'}>
        {who
          ? <span className="acct-avatar" aria-hidden="true">{who.name.trim().charAt(0).toUpperCase() || '?'}</span>
          : <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M4.6 20c.9-3.7 3.9-5.6 7.4-5.6s6.5 1.9 7.4 5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
      </button>
      {menu && (
        <div className="acct-menu" role="menu">
          {who ? (
            <>
              <div className="acct-who"><strong>{who.name}</strong>{who.sub && <small>{who.sub}</small>}</div>
              {acct.member && <Item icon="orders" onClick={footerLink('#orders')}>My Orders</Item>}
              <Item icon="wishlist" onClick={footerLink('#wishlist')}>Wishlist</Item>
              <Item icon="cart" onClick={() => window.dispatchEvent(new Event('luma:cart'))}>Cart</Item>
              {acct.member && <Item icon="account" onClick={acct.manage}>My Account</Item>}
              {admin && <Item icon="admin" onClick={() => window.location.assign('/admin')}>Super Admin</Item>}
              <hr />
              <Item icon="logout" onClick={acct.logout}>Logout</Item>
            </>
          ) : (
            <>
              <Item icon="signin" onClick={() => openAccount('signin')}>Sign In</Item>
              <Item icon="create" onClick={() => openAccount('create')}>Create Account</Item>
            </>
          )}
        </div>
      )}
    </span>
  )
}

/* /sso-callback: where Google sends the customer back to; Clerk finishes the sign-in / account creation and returns them to the page they started on. */
export const SsoCallback = () => <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/" signUpFallbackRedirectUrl="/" />
