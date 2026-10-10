import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PhotoGlass from './PhotoGlass'
import { ING } from './Ingredients'
import { FLAVOURS, SELECTOR, SITE } from '../data/site'
import { finePointer, prefersReduced } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)

const ORDER = ['strawberry', 'rose', 'mango', 'pistachio', 'chocolate', 'dryfruit']
// the two ingredients floating beside the glass belong to the flavour and are swapped (scale/spin out → in) when it changes
const Mango = () => <ING.cube color="#FFC247" />
const FLOATERS = { rose: [ING.petal, ING.berry], strawberry: [ING.berry, ING.jelly], mango: [Mango, ING.almond], pistachio: [ING.pistachio, ING.basil], chocolate: [ING.almond, ING.cherry], dryfruit: [ING.almond, ING.pistachio] }
const PARTICLES = Array.from({ length: 16 }, (_, i) => i)
const AUTO_HOLD = 2000 // each product is held this long (after its transition) before the next one comes in
const PICK_HOLD = 2500 // …and a product the visitor picked is held a little longer

/*
  Flavour change = one choreography, ~0.7 s, everything moving together:
    0 – 0.2   out: words slide away, notes / price fade up and out, the glass tips edge-on and scales down, floaters spin away;
              at the same moment a circle of the new tone starts to grow from the glass (background accent)
    0.2 – 0.7 in: new words rise through their masks, the glass turns back and scales into place, new floaters spin in,
              a burst of particles, notes + price + button follow; the tab indicator has already slid to the new flavour
  Clicks that arrive mid-transition are queued (never dropped, never stacked). The section also cycles by itself while it is on screen:
  2 s per product, 2.5 s after a click, paused when it leaves the viewport or the tab is hidden.
*/
export default function FlavourSelector() {
  const [id, setId] = useState(ORDER[0]) // what the showcase is displaying
  const [active, setActive] = useState(ORDER[0]) // what the selector shows as chosen (moves first)
  const f = SELECTOR[id]
  const price = FLAVOURS.find((x) => x.id === id)?.price
  const [FA, FB] = FLOATERS[id]
  const root = useRef(null)
  const wash = useRef(null)
  const tabs = useRef(null)
  const ind = useRef(null)
  const busy = useRef(false)
  const prevId = useRef(ORDER[0])
  const seen = useRef(false)
  const idRef = useRef(ORDER[0])
  const pending = useRef(null)
  const timer = useRef(0)
  const holdFor = useRef(AUTO_HOLD)
  const inView = useRef(false)
  const api = useRef({})

  /* ---------- tab indicator ---------- */
  const moveInd = (k, instant) => {
    const t = tabs.current?.querySelector(`[data-k="${k}"]`)
    if (!t || !ind.current) return
    const vars = { x: t.offsetLeft, y: t.offsetTop + t.offsetHeight - 4, scaleX: t.offsetWidth / 100, opacity: 1 }
    if (instant || prefersReduced()) gsap.set(ind.current, vars)
    else gsap.to(ind.current, { ...vars, duration: 0.5, ease: 'power3.out', overwrite: true })
    const c = tabs.current // phones: the row scrolls sideways, keep the active tab in view
    if (c.scrollWidth > c.clientWidth + 2) c.scrollTo({ left: t.offsetLeft - (c.clientWidth - t.offsetWidth) / 2, behavior: instant ? 'auto' : 'smooth' })
  }
  useLayoutEffect(() => {
    moveInd(active, true)
    const re = () => moveInd(idRef.current, true)
    window.addEventListener('resize', re)
    document.fonts?.ready.then(re)
    return () => window.removeEventListener('resize', re)
  }, [])

  /* ---------- transition + auto-cycle ---------- */
  const hold = (ms) => {
    clearTimeout(timer.current)
    if (prefersReduced() || !inView.current || document.hidden) return
    timer.current = setTimeout(() => api.current.next(), ms)
  }
  const go = (k, ms) => {
    clearTimeout(timer.current) // a click (or the cycle itself) always stops the pending timer first
    if (busy.current) { pending.current = [k, ms]; return } // mid-transition: the latest click wins, and it is played as soon as this one lands
    if (k === idRef.current) { moveInd(k); setActive(k); hold(ms); return }
    setActive(k)
    moveInd(k)
    holdFor.current = ms
    if (prefersReduced()) {
      root.current.style.setProperty('--sel-bg', SELECTOR[k].bg)
      idRef.current = k
      setId(k)
      return
    }
    busy.current = true
    const el = root.current
    // background accent: a circle of the new tone grows from the glass while the old content leaves
    const vis = el.querySelector('.sel-visual').getBoundingClientRect()
    const sec = el.getBoundingClientRect()
    const cx = vis.left + vis.width / 2 - sec.left, cy = vis.top + vis.height / 2 - sec.top
    const R = Math.hypot(Math.max(cx, sec.width - cx), Math.max(cy, sec.height - cy)) + 40
    const w = wash.current
    gsap.killTweensOf(w)
    w.style.background = SELECTOR[k].bg
    gsap.fromTo(w, { clipPath: `circle(0px at ${cx}px ${cy}px)` }, {
      clipPath: `circle(${R}px at ${cx}px ${cy}px)`, duration: 0.6, ease: 'power3.inOut',
      onComplete: () => { el.style.setProperty('--sel-bg', SELECTOR[k].bg); gsap.set(w, { clipPath: `circle(0px at ${cx}px ${cy}px)` }) },
    })
    gsap
      .timeline({ onComplete: () => { idRef.current = k; setId(k) } })
      .to(el.querySelectorAll('.sel-w'), { yPercent: -115, duration: 0.18, stagger: 0.02, ease: 'power3.in' }, 0)
      .to(el.querySelectorAll('.sel-sub'), { y: -18, opacity: 0, duration: 0.18, stagger: 0.012, ease: 'power2.in' }, 0)
      .to(el.querySelectorAll('.sel-fl-m'), { scale: 0, rotate: 120, opacity: 0, duration: 0.2, stagger: 0.03, ease: 'power2.in' }, 0)
      .to(el.querySelector('.sel-turn'), { rotationY: -70, scale: 0.88, opacity: 0.2, y: 14, duration: 0.2, ease: 'power2.in', transformPerspective: 1100 }, 0)
  }
  api.current.next = () => go(ORDER[(ORDER.indexOf(idRef.current) + 1) % ORDER.length], AUTO_HOLD)
  api.current.go = go
  const pick = (k) => go(k, PICK_HOLD)

  // the incoming half
  useEffect(() => {
    if (prevId.current === id) return // the first render (and React's dev double-mount) is not a transition
    prevId.current = id
    if (prefersReduced()) return
    const el = root.current
    const tl = gsap.timeline({
      onComplete: () => {
        busy.current = false
        const q = pending.current
        pending.current = null
        if (q) go(q[0], q[1])
        else hold(holdFor.current)
      },
    })
    tl.fromTo(el.querySelector('.sel-turn'), { rotationY: 70, scale: 0.88, opacity: 0.2, y: 14 }, { rotationY: 0, scale: 1, opacity: 1, y: 0, duration: 0.45, ease: 'expo.out', transformPerspective: 1100 }, 0)
      .fromTo(el.querySelectorAll('.sel-w'), { yPercent: 118, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 0.45, stagger: 0.035, ease: 'expo.out' }, 0)
      .fromTo(el.querySelectorAll('.sel-fl-m'), { scale: 0, rotate: -120, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.7)' }, 0.04)
      .fromTo(el.querySelectorAll('.sel-sub'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.025, ease: 'power3.out' }, 0.08)
    // the particle burst is decoration: it is not part of the timeline, so it never delays the hold timer
    gsap.fromTo(
      el.querySelectorAll('.sel-p'),
      { x: 0, y: 0, scale: 0, opacity: 1, rotation: 0 },
      {
        x: () => gsap.utils.random(-1, 1) * 280, y: () => gsap.utils.random(-1, 1) * 260,
        scale: () => gsap.utils.random(0.6, 1.6), rotation: () => gsap.utils.random(-200, 200),
        opacity: 0, duration: 0.8, stagger: 0.01, ease: 'power3.out', overwrite: true,
      },
    )
    return () => tl.kill()
  }, [id])

  // auto-cycle: runs while the section is on screen, pauses when it leaves or the tab is hidden, resumes smoothly
  useEffect(() => {
    const el = root.current
    const io = new IntersectionObserver(([e]) => {
      inView.current = e.isIntersecting && e.intersectionRatio > 0.3
      if (inView.current) { if (!busy.current && !pending.current) hold(seen.current ? 1000 : AUTO_HOLD); seen.current = true }
      else clearTimeout(timer.current)
    }, { threshold: [0, 0.3, 0.6] })
    io.observe(el)
    const vis = () => (document.hidden ? clearTimeout(timer.current) : inView.current && !busy.current && hold(1000))
    document.addEventListener('visibilitychange', vis)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); clearTimeout(timer.current) }
  }, [])

  /* scroll-in: the glass arrives from depth, text slides in, ingredients nudged by the cursor */
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const el = root.current
    const cleanups = []
    const ctx = gsap.context(() => {
      const st = { trigger: el, start: 'top 100%', end: 'top 35%', scrub: 0.9 }
      gsap.fromTo('.sel-enter', { scale: 1.45, y: -40, rotate: 0 }, { scale: 1, y: 0, rotate: 0, ease: 'none', scrollTrigger: st })
      gsap.fromTo('.sel-copy', { x: -90, opacity: 0.1 }, { x: 0, opacity: 1, ease: 'none', scrollTrigger: st })
      gsap.fromTo('.sel-disc', { scale: 0.3 }, { scale: 1, ease: 'none', scrollTrigger: st })
      gsap.utils.toArray('.sel-fl').forEach((n, i) => {
        gsap.fromTo(n, { y: 120 + i * 40, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { ...st, end: 'top 45%' } })
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
            <div className="sel-buy sel-sub">
              <span className="price">{SITE.currency}{price}</span>
              <a className="btn btn-rose btn-sm" href="#flavours">Order Now</a>
            </div>
          </div>
          <div className="sel-tabs" role="tablist" aria-label="Choose a flavour" ref={tabs}>
            <span className="sel-ind" ref={ind} aria-hidden="true" />
            {ORDER.map((k, i) => (
              <button key={k} data-k={k} role="tab" aria-selected={active === k} className={`sel-tab${active === k ? ' on' : ''}`} onClick={() => pick(k)}>
                <b>0{i + 1}</b>
                <i style={{ background: SELECTOR[k].accent }} />
                {SELECTOR[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="sel-visual">
          <div className="sel-disc" style={{ background: f.accent }} aria-hidden="true" />
          <div className="sel-fl a" aria-hidden="true"><div className="sel-fl-m"><div className="float" key={id} style={{ '--fy': '12px', '--dur': '5s' }}><FA /></div></div></div>
          <div className="sel-fl b" aria-hidden="true"><div className="sel-fl-m"><div className="float" key={id} style={{ '--fy': '16px', '--dur': '6s' }}><FB /></div></div></div>
          <div className="sel-parts" aria-hidden="true">
            {PARTICLES.map((i) => (
              <i key={i} className="sel-p" style={{ background: i % 3 ? f.accent : '#fff', borderRadius: i % 2 ? '50% 0 50% 50%' : '50%' }} />
            ))}
          </div>
          <div className="sel-enter">
            <div className="sel-turn">
              <div className="sel-glass-in">
                <PhotoGlass flavour={id} />
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
