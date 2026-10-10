import { useState } from 'react'
import { Logo } from './Nav'
import InfoSheet from './InfoSheet'
import { FLAVOURS, SITE } from '../data/site'
import { addToCart, toggleWish, useStore } from '../store'

const todo = (what) => (
  <>
    <p className="is-note">[Add your {what} here.]</p>
    <p className="is-sub">This page is a placeholder and will be completed before launch.</p>
  </>
)

// footer destinations that open a sheet instead of a separate page (the site is a single page, with no accounts or checkout yet)
const SHEETS = {
  login: { title: 'Login', body: () => <p className="is-sub">Accounts are not available yet. When they are, you will sign in here to see your orders and saved flavours.</p> },
  orders: { title: 'My Orders', body: () => <p className="is-sub">Order history will appear here once ordering is live.</p> },
  shipping: { title: 'Shipping Policy', body: () => todo('shipping policy') },
  refund: { title: 'Refund Policy', body: () => todo('refund policy') },
  privacy: { title: 'Privacy Policy', body: () => todo('privacy policy') },
  terms: { title: 'Terms & Conditions', body: () => todo('terms and conditions') },
}

function Wishlist() {
  const s = useStore()
  const items = FLAVOURS.filter((f) => s.wish.includes(f.id))
  if (!items.length) return <p className="is-sub">Nothing saved yet. Tap the heart on any flavour to keep it here.</p>
  return (
    <ul className="wl">
      {items.map((f) => (
        <li key={f.id}>
          <div><strong>{f.name}</strong><span>{SITE.currency}{f.price}</span></div>
          <div className="wl-act">
            <button className="btn btn-rose btn-sm" onClick={() => addToCart(f.id)}>Add to cart</button>
            <button className="wl-x" onClick={() => toggleWish(f.id)} aria-label={`Remove ${f.name} from wishlist`}>✕</button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function Footer() {
  const [sheet, setSheet] = useState(null)
  const open = (k) => (e) => { e.preventDefault(); setSheet(k) }
  const cart = (e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('luma:cart')); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const s = sheet === 'wishlist' ? { title: 'Wishlist', body: Wishlist } : SHEETS[sheet]

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="f-top">
          <div className="f-brand">
            <Logo light />
            <p className="f-tag">“Layers of Happiness.”</p>
          </div>
          <nav className="f-cols" aria-label="Footer">
            <div>
              <h4>Shop</h4>
              <a href="#flavours">Products</a>
              <a href="#mood">Flavours</a>
            </div>
            <div>
              <h4>Account</h4>
              <a href="#login" onClick={open('login')}>Login</a>
              <a href="#orders" onClick={open('orders')}>My Orders</a>
              <a href="#wishlist" onClick={open('wishlist')}>Wishlist</a>
              <a href="#cart" onClick={cart}>Cart</a>
            </div>
            <div>
              <h4>Customer care</h4>
              <a href="#visit">Contact Us</a>
              <a href="#faq">FAQ</a>
              <a href="#shipping" onClick={open('shipping')}>Shipping Policy</a>
              <a href="#refund" onClick={open('refund')}>Refund Policy</a>
            </div>
            <div>
              <h4>Legal</h4>
              <a href="#privacy" onClick={open('privacy')}>Privacy Policy</a>
              <a href="#terms" onClick={open('terms')}>Terms &amp; Conditions</a>
            </div>
          </nav>
        </div>
        <div className="f-word" aria-hidden="true">LUMA</div>
        <div className="f-bot">
          <span>© {new Date().getFullYear()} LUMA. All rights reserved.</span>
          <span>Made layer by layer.</span>
        </div>
      </div>
      {s && <InfoSheet title={s.title} onClose={() => setSheet(null)}><s.body /></InfoSheet>}
    </footer>
  )
}
