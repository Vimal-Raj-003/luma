import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import FaloodaGlass from './FaloodaGlass'
import { ING } from './Ingredients'
import { SELECTOR } from '../data/site'
import { finePointer, prefersReduced } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)

const ORDER = ['rose', 'strawberry', 'mango', 'pistachio', 'chocolate']
const PARTICLES = Array.from({ length: 16 }, (_, i) => i)

/*
  Flavour change = a short choreography:
    out : title slides away, glass turns edge-on while its layers drain
    in  : a circle of the new tone expands from the glass, glass turns back and re-pours in the new colours,
          title/words slide in, a burst of ingredient particles flies out
*/
export default function FlavourSelector() {
  const [id, setId] = useState('rose')
  const f = SELECTOR[id]
  const root = useRef(null)
  const wash = useRef(null)
  const busy = useRef(false)
  const first = useRef(true)

  const pick = (k) => {
    if (k === id || busy.current) return
    if (prefersReduced()) {
      root.current.style.setProperty('--sel-bg', SELECTOR[k].bg)
      setId(k)
      return
    }
    busy.current = true
    const el = root.current
    gsap
      .timeline({ onComplete: () => setId(k) })
      .to(el.querySelectorAll('.sel-w'), { yPercent: -115, duration: 0.5, stagger: 0.05, ease: 'power3.in' }, 0)
      .to(el.querySelectorAll('.sel-sub'), { y: -24, opacity: 0, duration: 0.4, stagger: 0.04, ease: 'power2.in' }, 0)
      .to(el.querySelector('.sel-turn'), { rotationY: -75, scale: 0.92, duration: 0.5, ease: 'power2.in', transformPerspective: 1100 }, 0)
      .to(el.querySelectorAll('.sel-glass-in .fl-layer'), { y: 36, opacity: 0, duration: 0.4, stagger: { each: 0.05, from: 'start' }, ease: 'power2.in' }, 0.05)
  }

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const el = root.current
    if (prefersReduced()) return
    const vis = el.querySelector('.sel-visual').getBoundingClientRect()
    const sec = el.getBoundingClientRect()
    const cx = vis.left + vis.width / 2 - sec.left
    const cy = vis.top + vis.height / 2 - sec.top
    const R = Math.hypot(Math.max(cx, sec.width - cx), Math.max(cy, sec.height - cy)) + 40

    const w = wash.current
    gsap.killTweensOf(w)
    w.style.background = f.bg
    const tl = gsap.timeline({ onComplete: () => (busy.current = false) })
    tl.fromTo(
      w,
      { clipPath: `circle(0px at ${cx}px ${cy}px)` },
      {
        clipPath: `circle(${R}px at ${cx}px ${cy}px)`, duration: 1.3, ease: 'power3.inOut',
        onComplete: () => {
          el.style.setProperty('--sel-bg', f.bg)
          gsap.set(w, { clipPath: `circle(0px at ${cx}px ${cy}px)` })
        },
      },
      0,
    )
      .fromTo(el.querySelector('.sel-turn'), { rotationY: 75, scale: 0.92 }, { rotationY: 0, scale: 1, duration: 1.2, ease: 'expo.out', transformPerspective: 1100 }, 0.15)
      .fromTo(el.querySelectorAll('.sel-glass-in .fl-layer'), { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 0.3)
      .fromTo(el.querySelectorAll('.sel-w'), { yPercent: 118, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out' }, 0.45)
      .fromTo(el.querySelectorAll('.sel-sub'), { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.7)
      .fromTo(
        el.querySelectorAll('.sel-p'),
        { x: 0, y: 0, scale: 0, opacity: 1, rotation: 0 },
        {
          x: () => gsap.utils.random(-1, 1) * 280,
          y: () => gsap.utils.random(-1, 1) * 260,
          scale: () => gsap.utils.random(0.6, 1.6),
          rotation: () => gsap.utils.random(-200, 200),
          opacity: 0, duration: 1.7, stagger: 0.02, ease: 'power3.out',
        },
        0.3,
      )
    return () => tl.kill()
  }, [id, f])

  /* scroll-in: the glass arrives from depth, text slides in, ingredients nudged by the cursor */
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const el = root.current
    const cleanups = []
    const ctx = gsap.context(() => {
      const st = { trigger: el, start: 'top 90%', end: 'top 15%', scrub: 0.9 }
      gsap.fromTo('.sel-enter', { scale: 1.45, y: -40, rotate: 0 }, { scale: 1, y: 0, rotate: 0, ease: 'none', scrollTrigger: st })
      gsap.fromTo('.sel-copy', { x: -90, opacity: 0.1 }, { x: 0, opacity: 1, ease: 'none', scrollTrigger: st })
      gsap.fromTo('.sel-disc', { scale: 0.3 }, { scale: 1, ease: 'none', scrollTrigger: st })
      gsap.utils.toArray('.sel-fl').forEach((n, i) => {
        gsap.fromTo(n, { y: 120 + i * 40, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { ...st, end: 'top 30%' } })
      })

      if (finePointer()) {
        const items = [...el.querySelectorAll('.sel-fl')].map((n, i) => ({
          x: gsap.quickTo(n.firstChild, 'x', { duration: 1, ease: 'power3.out' }),
          y: gsap.quickTo(n.firstChild, 'y', { duration: 1, ease: 'power3.out' }),
          d: 30 + i * 22,
        }))
        const move = (e) => {
          const r = el.getBoundingClientRect()
          if (r.bottom < 0 || r.top > window.innerHeight) return
          const nx = (e.clientX - r.left) / r.width - 0.5
          const ny = (e.clientY - r.top) / r.height - 0.5
          items.forEach((it) => { it.x(-nx * it.d); it.y(-ny * it.d) })
        }
        el.addEventListener('pointermove', move)
        cleanups.push(() => el.removeEventListener('pointermove', move))
      }
    }, el)
    return () => {
      cleanups.forEach((c) => c())
      ctx.revert()
    }
  }, [])

  return (
    <section className="selector" id="mood" ref={root} style={{ '--sel-ink': f.ink }}>
      <div className="sel-wash" ref={wash} aria-hidden="true" />
      <div className="wrap sel-grid">
        <div className="sel-copy">
          <p className="eyebrow">Pick your mood</p>
          <div className="sel-txt" aria-live="polite">
            <h2 className="h2 sel-title" aria-label={f.title}>
              {f.title.split(' ').map((w, i) => (
                <span className="sel-m" key={`${id}-${i}`} aria-hidden="true">
                  <span className="sel-w">{w}</span>{' '}
                </span>
              ))}
            </h2>
            <p className="lede sel-sub">{f.line}</p>
            <ul className="sel-notes">
              {f.notes.map((n) => (
                <li className="sel-sub" key={n}>{n}</li>
              ))}
            </ul>
          </div>
          <div className="sel-tabs" role="tablist" aria-label="Choose a flavour">
            {ORDER.map((k) => (
              <button key={k} role="tab" aria-selected={id === k} className={`sel-tab${id === k ? ' on' : ''}`} onClick={() => pick(k)}>
                <i style={{ background: SELECTOR[k].accent }} />
                {SELECTOR[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="sel-visual">
          <div className="sel-disc" style={{ background: f.accent }} aria-hidden="true" />
          <div className="sel-fl a" aria-hidden="true"><div className="sel-fl-m"><div className="float" style={{ '--fy': '12px', '--dur': '5s' }}><ING.petal /></div></div></div>
          <div className="sel-fl b" aria-hidden="true"><div className="sel-fl-m"><div className="float" style={{ '--fy': '16px', '--dur': '6s' }}><ING.pistachio /></div></div></div>
          <div className="sel-fl c" aria-hidden="true"><div className="sel-fl-m"><div className="float" style={{ '--fy': '10px', '--dur': '4.6s' }}><ING.cube color={f.accent} /></div></div></div>
          <div className="sel-parts" aria-hidden="true">
            {PARTICLES.map((i) => (
              <i key={i} className="sel-p" style={{ background: i % 3 ? f.accent : '#fff', borderRadius: i % 2 ? '50% 0 50% 50%' : '50%' }} />
            ))}
          </div>
          <div className="sel-enter">
            <div className="sel-turn">
              <div className="sel-glass-in">
                <FaloodaGlass palette={id} animated />
              </div>
            </div>
          </div>
        </div>
      </div>
      <svg className="sel-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 80V40C240 0 480 70 720 40S1200 0 1440 40V80Z" fill="var(--paper)" />
      </svg>
    </section>
  )
}
