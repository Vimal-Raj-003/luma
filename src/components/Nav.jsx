import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { FLAVOURS, SITE } from '../data/site'
import { cartCount, setQty, useStore } from '../store'
import { prefersReduced } from '../hooks/motion'

export const Logo = ({ light = false }) => (
  <a href="#top" className={`logo${light ? ' light' : ''}`} aria-label="LUMA home">
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <path d="M5 6h22l-4 13c-1 3-4 5-7 5s-6-2-7-5z" fill="#fff" fillOpacity=".25" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 12h18l-1.4 5c-.8 2.6-3.7 4.4-7.6 4.4S9.2 19.6 8.4 17z" fill="#F0709B" />
      <path d="M8.6 17h14.8c-.9 2.6-3.7 4.4-7.4 4.4S9.5 19.6 8.6 17z" fill="#A9D58B" />
      <circle cx="16" cy="5" r="3" fill="#FFBE3B" />
      <path d="M16 24v5M11 29h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
    <span>LUMA</span>
  </a>
)

export default function Nav() {
  const store = useStore()
  const n = cartCount(store)
  const [cart, setCart] = useState(false)
  const badge = useRef(null)
  const panel = useRef(null)
  const prevN = useRef(n)
  const total = FLAVOURS.reduce((a, f) => a + (store.items[f.id] || 0) * f.price, 0)

  useEffect(() => { // the badge pops whenever something is added
    if (n > prevN.current && badge.current && !prefersReduced()) gsap.fromTo(badge.current, { scale: 1.9 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1.2, 0.45)' })
    prevN.current = n
  }, [n])
  useEffect(() => {
    if (!cart) return
    if (panel.current && !prefersReduced()) gsap.fromTo(panel.current, { y: -12, scale: 0.94, opacity: 0, transformOrigin: '100% 0%' }, { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'expo.out' })
    const key = (e) => e.key === 'Escape' && setCart(false)
    const away = (e) => !e.target.closest('.cart-wrap') && setCart(false)
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', away)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('pointerdown', away) }
  }, [cart])

  const [solid, setSolid] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dark, setDark] = useState(false)
  const links = useRef(null)
  const ind = useRef(null)

  useEffect(() => {
    let raf = 0
    const SECTIONS = ['#mood', '#build', '#visit']
    const on = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      setSolid(y > window.innerHeight * 0.6) // the dark hero is washed out to cream by then
      // over a dark scene (pinned flavour / making / finale / signature) the bar goes back to its light-on-dark look
      setDark([...document.querySelectorAll('.scene, .signature')].some((e) => { const r = e.getBoundingClientRect(); return r.top <= 40 && r.bottom >= 40 }))
      // scroll-spy: the last section whose top has passed 40% of the viewport; none while on the hero
      let active = -1
      SECTIONS.forEach((id, i) => {
        const e = document.querySelector(id)
        if (e && e.getBoundingClientRect().top <= window.innerHeight * 0.4) active = i
      })
      const a = [...links.current.children].filter((c) => c.tagName === 'A')
      a.forEach((c, i) => c.classList.toggle('on', i === active))
      const el = a[active]
      if (!ind.current) return
      if (!el) return void gsap.to(ind.current, { opacity: 0, duration: 0.3 })
      gsap.to(ind.current, { x: el.offsetLeft, scaleX: el.offsetWidth / 40, opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true })
    }
    const tick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(on) }
    on()
    window.addEventListener('scroll', tick, { passive: true })
    window.addEventListener('resize', tick)
    // pinned sections move after layout settles: re-evaluate once things are measured
    const t = setTimeout(on, 1800)
    return () => { window.removeEventListener('scroll', tick); window.removeEventListener('resize', tick); clearTimeout(t); cancelAnimationFrame(raf) }
  }, [])

  return (
    <header className={`nav${solid && !dark ? ' solid' : ' on-dark'}${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-in">
        <Logo />
        <nav className="nav-links" aria-label="Primary" ref={links}>
          <a href="#mood">Flavours</a>
          <a href="#build">Build Yours</a>
          <a href="#visit">Visit</a>
          <span className="nav-ind" ref={ind} aria-hidden="true" />
        </nav>
        <div className="nav-end">
          <div className="cart-wrap">
            <button className="cart-btn" onClick={() => setCart((v) => !v)} aria-expanded={cart} aria-label={`Cart, ${n} item${n === 1 ? '' : 's'}`}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Zm4 0V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {n > 0 && <b className="cart-n" ref={badge}>{n}</b>}
            </button>
            {cart && (
              <div className="cart-panel" ref={panel} role="dialog" aria-label="Your cart">
                {n === 0 ? <p className="cart-empty">Your cart is empty.<br />Pick a falooda below.</p> : (
                  <>
                    <ul>
                      {FLAVOURS.filter((f) => store.items[f.id]).map((f) => (
                        <li key={f.id}>
                          <span>{f.name}</span>
                          <span className="cart-q">
                            <button onClick={() => setQty(f.id, store.items[f.id] - 1)} aria-label={`Fewer ${f.name}`}>−</button>
                            <b>{store.items[f.id]}</b>
                            <button onClick={() => setQty(f.id, store.items[f.id] + 1)} aria-label={`More ${f.name}`}>+</button>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="cart-total"><span>Total</span><b>{SITE.currency}{total}</b></div>
                    <button className="btn btn-rose btn-sm cart-go" disabled>Checkout opens soon</button>
                  </>
                )}
              </div>
            )}
          </div>
          <a className="btn btn-dark btn-sm" href={SITE.contact.orderHref}>Order Now</a>
        </div>
      </div>
    </header>
  )
}
