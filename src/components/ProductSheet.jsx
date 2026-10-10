import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import PhotoGlass from './PhotoGlass'
import { SITE } from '../data/site'
import { addToCart, toggleWish, useStore } from '../store'
import { lockScroll, prefersReduced } from '../hooks/motion'

export const Heart = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.4-9.3C1.3 8.4 3.2 5 6.6 5c2 0 3.7 1.1 5.4 3.2C13.7 6.1 15.4 5 17.4 5c3.4 0 5.3 3.4 4 6.7C19.5 16.4 12 21 12 21Z" /></svg>
)

/* small radial burst of dots from a button */
export function burst(btn) {
  const colors = ['#F0709B', '#FFBE3B', '#A9D58B', '#C73B72']
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('i')
    s.className = 'burst-dot'
    s.style.background = colors[i % 4]
    btn.appendChild(s)
    const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4
    gsap.fromTo(s, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: Math.cos(a) * 30, y: Math.sin(a) * 30, scale: 0, opacity: 0, duration: 0.7, ease: 'power3.out', onComplete: () => s.remove() })
  }
  const svg = btn.querySelector('svg')
  if (svg) gsap.fromTo(svg, { scale: 0.6 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.4)' })
}

/* Product detail / order sheet. Opens over the page, closes with Esc, the backdrop or the close button. */
export default function ProductSheet({ f, onClose }) {
  const root = useRef(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const store = useStore()
  const wished = store.wish.includes(f.id)
  const closing = useRef(false)

  const close = () => {
    if (closing.current) return
    closing.current = true
    if (prefersReduced()) return onClose()
    gsap.timeline({ onComplete: onClose })
      .to('.ps-panel', { y: 40, scale: 0.96, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
      .to('.ps-back', { opacity: 0, duration: 0.35 }, 0)
  }

  useEffect(() => {
    lockScroll(true)
    const prev = document.activeElement
    root.current.querySelector('.ps-x')?.focus()
    const key = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') { // keep focus inside the sheet
        const els = [...root.current.querySelectorAll('button, a[href]')]
        const first = els[0], last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', key)
    // a context, so React's dev double-mount reverts the first run instead of freezing its half-played state
    const ctx = gsap.context(() => {
      if (prefersReduced()) return
      const tl = gsap.timeline()
      tl.from('.ps-back', { opacity: 0, duration: 0.4 }, 0)
        .from('.ps-panel', { y: 70, scale: 0.94, opacity: 0, duration: 0.8, ease: 'expo.out' }, 0)
        .from('.ps-media .pg', { scale: 1.25, y: -30, duration: 1.1, ease: 'expo.out' }, 0.1)
        .from('.ps-glow', { scale: 0.4, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0.1)
        .from('.ps-body > *', { y: 22, opacity: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out' }, 0.3)
    }, root)
    return () => { ctx.revert(); window.removeEventListener('keydown', key); lockScroll(false); prev?.focus?.() }
  }, [])

  const add = () => {
    addToCart(f.id, qty)
    setAdded(true)
    if (!prefersReduced()) gsap.fromTo('.ps-add', { scale: 0.94 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
    setTimeout(() => setAdded(false), 1800)
  }
  const heart = (e) => {
    toggleWish(f.id)
    if (!wished && !prefersReduced()) burst(e.currentTarget)
  }

  return (
    <div className="ps" ref={root} role="dialog" aria-modal="true" aria-label={f.name} style={{ '--glow': f.glow }}>
      <div className="ps-back" onClick={close} />
      <div className="ps-panel">
        <button className="ps-x" onClick={close} aria-label="Close">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
        </button>
        <div className="ps-media">
          <div className="ps-glow" aria-hidden="true" />
          <PhotoGlass flavour={f.id} />
        </div>
        <div className="ps-body">
          <p className="eyebrow">Falooda</p>
          <h3 className="ps-title">{f.name}</h3>
          <p className="ps-desc">{f.desc}</p>
          <div className="ps-row">
            <span className="price">{SITE.currency}{f.price * qty}</span>
            <div className="ps-qty" role="group" aria-label="Quantity">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Fewer">−</button>
              <b aria-live="polite">{qty}</b>
              <button onClick={() => setQty((q) => Math.min(9, q + 1))} aria-label="More">+</button>
            </div>
          </div>
          <div className="ps-actions">
            <button className={`btn btn-rose ps-add${added ? ' ok' : ''}`} onClick={add}>
              {added ? '✓ Added to cart' : 'Add to cart'}
            </button>
            <button className="card-heart ps-heart" aria-pressed={wished} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'} onClick={heart}><Heart /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
