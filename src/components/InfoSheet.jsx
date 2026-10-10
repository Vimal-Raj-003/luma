import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { lockScroll, prefersReduced } from '../hooks/motion'

/* A small centred sheet for footer destinations (policies, wishlist, account). Same open / close choreography as the product sheet. */
export default function InfoSheet({ title, onClose, children }) {
  const root = useRef(null)
  const closing = useRef(false)

  const close = () => {
    if (closing.current) return
    closing.current = true
    if (prefersReduced()) return onClose()
    gsap.timeline({ onComplete: onClose })
      .to(root.current.querySelector('.ps-panel'), { y: 36, scale: 0.97, opacity: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to(root.current.querySelector('.ps-back'), { opacity: 0, duration: 0.3 }, 0)
  }

  useEffect(() => {
    lockScroll(true)
    const prev = document.activeElement
    root.current.querySelector('.ps-x')?.focus()
    const key = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        const els = [...root.current.querySelectorAll('button, a[href]')]
        const first = els[0], last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', key)
    const ctx = gsap.context(() => {
      if (prefersReduced()) return
      gsap.timeline()
        .from('.ps-back', { opacity: 0, duration: 0.35 }, 0)
        .from('.ps-panel', { y: 60, scale: 0.95, opacity: 0, duration: 0.7, ease: 'expo.out' }, 0)
        .from('.is-body > *', { y: 18, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' }, 0.2)
    }, root)
    return () => { ctx.revert(); window.removeEventListener('keydown', key); lockScroll(false); prev?.focus?.() }
  }, [])

  return (
    <div className="ps is" ref={root} role="dialog" aria-modal="true" aria-label={title}>
      <div className="ps-back" onClick={close} />
      <div className="ps-panel is-panel">
        <button className="ps-x" onClick={close} aria-label="Close">
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></svg>
        </button>
        <div className="is-body">
          <h3 className="ps-title">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  )
}
