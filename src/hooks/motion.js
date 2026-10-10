import { useEffect } from 'react'
import gsap from 'gsap'

// The OS "reduce motion" setting is honoured by default, but a visitor can opt in to the full experience
// (?motion=full or the on-page button). The choice is stored so it survives reloads.
export const osReduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const motionForced = () => {
  try {
    return new URLSearchParams(window.location.search).get('motion') === 'full' || window.localStorage.getItem('luma-motion') === 'full'
  } catch {
    return false
  }
}
export const prefersReduced = () => osReduced() && !motionForced()

export const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

export const lockScroll = (on) => {
  document.documentElement.style.overflow = on ? 'hidden' : ''
}

/* Wrap every word of [data-split] headings in a mask so it can slide up when revealed. */
export function splitWords(root) {
  if (root.dataset.done) return
  root.dataset.done = '1'
  let n = 0
  const walk = (node) => {
    ;[...node.childNodes].forEach((c) => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment()
        c.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return
          if (/^\s+$/.test(part)) return frag.appendChild(document.createTextNode(' '))
          const m = document.createElement('span')
          m.className = 'wm'
          const i = document.createElement('span')
          i.className = 'wi'
          i.style.setProperty('--i', n++)
          i.textContent = part
          m.appendChild(i)
          frag.appendChild(m)
        })
        node.replaceChild(frag, c)
      } else if (c.nodeType === 1) walk(c)
    })
  }
  walk(root)
}

/* Adds .in to [data-reveal] elements as they enter the viewport (CSS does the transition). */
export function useReveal(scope) {
  useEffect(() => {
    const root = scope?.current || document
    root.querySelectorAll('[data-split]').forEach(splitWords)
    const els = [...root.querySelectorAll('[data-reveal]')]
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .forEach((e, i) => {
            const el = e.target
            el.style.transitionDelay = `${(+el.dataset.delay || 0) + i * 0.09}s`
            el.classList.add('in')
            io.unobserve(el)
          })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* Subtle micro-interactions (desktop pointers only): magnetic buttons + tilting product cards. */
export function useMicro(scope) {
  useEffect(() => {
    if (!finePointer() || prefersReduced()) return
    const offs = []
    const on = (el, ev, fn) => {
      el.addEventListener(ev, fn)
      offs.push(() => el.removeEventListener(ev, fn))
    }

    const root = scope?.current || document
    root.querySelectorAll('.btn, .sel-tab, .rev-nav button').forEach((b) => {
      const xt = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3.out' })
      const yt = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3.out' })
      on(b, 'pointermove', (e) => {
        const r = b.getBoundingClientRect()
        xt((e.clientX - (r.left + r.width / 2)) * 0.3)
        yt((e.clientY - (r.top + r.height / 2)) * 0.4)
      })
      on(b, 'pointerleave', () => {
        xt(0)
        yt(0)
      })
    })

    root.querySelectorAll('.card').forEach((card) => {
      const glass = card.querySelector('.glass-box')
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3.out' })
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3.out' })
      const gx = gsap.quickTo(glass, 'x', { duration: 0.8, ease: 'power3.out' })
      const gy = gsap.quickTo(glass, 'y', { duration: 0.8, ease: 'power3.out' })
      gsap.set(card, { transformPerspective: 900 })
      on(card, 'pointerenter', () => {
        gsap.to(card, { y: -10, duration: 0.7, ease: 'power3.out' })
        gsap.to(glass, { scale: 1.07, duration: 0.9, ease: 'power3.out' })
      })
      on(card, 'pointermove', (e) => {
        const r = card.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        ry(nx * 9)
        rx(-ny * 7)
        gx(nx * 14)
        gy(ny * 10)
      })
      on(card, 'pointerleave', () => {
        rx(0); ry(0); gx(0); gy(0)
        gsap.to(card, { y: 0, duration: 0.8, ease: 'power3.out' })
        gsap.to(glass, { scale: 1, duration: 0.9, ease: 'power3.out' })
      })
    })

    return () => offs.forEach((f) => f())
  }, [])
}
