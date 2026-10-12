import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ING } from './Ingredients'
import { FLAVOUR_BG, FLAVOUR_IMG } from './PhotoGlass'
import { OUT_H } from './glassWarp'
import { FLAVOURS, HERO_COPY, SELECTOR, SITE } from '../data/site'
import { finePointer, prefersReduced } from '../hooks/motion'

/*
  Front page = the flavour showcase as the hero: the finished Falooda in the reshaped premium glass on the right; number / eyebrow, flavour name,
  description, price, CTAs and the flavour selector on the left. It is complete from the first paint — no loader, no intro build, no delayed text.
  It behaves like the flavour selector section below it:
    - it cycles through the six flavours by itself (3 s on each) while it is on screen, and pauses when it is not
    - a click stops the timer, moves to that flavour at once, holds it 3 s, then the cycle carries on from the next flavour
    - one change = one coordinated ~0.7 s sequence: the old content leaves, a circle of the new tone grows from the glass, the new title / description /
      price / glass colouring arrive and the active indicator slides — all started together. Clicks that arrive mid-change are queued (the last one wins).
  The earlier cinematic build-up hero is kept in tools/archive/Hero.cinematic.jsx.
*/
gsap.registerPlugin(ScrollTrigger)
const ORDER = ['strawberry', 'rose', 'mango', 'pistachio', 'chocolate', 'dryfruit']
const AUTO_HOLD = 3000 // each flavour is held this long (after its change has finished)
const PICK_HOLD = 3000 // …and so is one the visitor picked, before the cycle resumes
const Mango = () => <ING.cube color="#FFC247" />
const FLOATERS = { rose: [ING.petal, ING.petal, ING.petal, ING.petal], strawberry: [ING.berry, ING.jelly, ING.berry, ING.jelly], mango: [Mango, ING.almond, Mango, ING.almond], pistachio: [ING.pistachio, ING.basil, ING.pistachio, ING.basil], chocolate: [ING.almond, ING.basil, ING.almond, ING.basil], dryfruit: [ING.almond, ING.pistachio, ING.almond, ING.pistachio] }

// colour shown under the picture while it loads, and while two pictures crossfade (tone of each flavour's backdrop)
const TONE = { strawberry: '#4a1830', rose: '#4c2236', mango: '#4a3010', pistachio: '#26331a', chocolate: '#1f0f0b', dryfruit: '#3f2f18' }

export default function Hero() {
  const [id, setId] = useState(ORDER[0]) // what is displayed
  const [active, setActive] = useState(ORDER[0]) // what the selector shows as chosen (moves first)
  const root = useRef(null)
  const bgA = useRef(null)
  const bgB = useRef(null)
  const tabs = useRef(null)
  const ind = useRef(null)
  const busy = useRef(false)
  const idRef = useRef(ORDER[0])
  const prevId = useRef(ORDER[0])
  const pending = useRef(null)
  const timer = useRef(0)
  const holdFor = useRef(AUTO_HOLD)
  const inView = useRef(false)
  const seen = useRef(false)
  const api = useRef({})
  const f = SELECTOR[id]
  const price = FLAVOURS.find((x) => x.id === id)?.price
  const no = ORDER.indexOf(id) + 1
  const FL = FLOATERS[id]
  const imgA = useRef(null)
  const imgB = useRef(null)

  // the navigation reads light-on-dark only when this hero is dark; the page below mounts as soon as the hero has painted
  useEffect(() => {
    ORDER.slice(1).forEach((k) => { const i = new Image(); i.src = FLAVOUR_IMG(k); const j = new Image(); j.src = FLAVOUR_BG(k) })
    window.__heroReady = true
    window.dispatchEvent(new Event('luma:hero-ready'))
  }, [])
  useEffect(() => {
    window.__heroDark = true // the hero is always a dark, photographic scene: the navigation reads light-on-dark
    window.dispatchEvent(new Event('luma:hero-tone'))
  }, [id])

  /* ---------- active indicator ---------- */
  const indVars = (k) => {
    const t = tabs.current?.querySelector(`[data-k="${k}"]`)
    return t ? { x: t.offsetLeft, y: t.offsetTop + t.offsetHeight - 4, scaleX: t.offsetWidth / 100, opacity: 1 } : null
  }
  const keepInView = (k, instant) => { // phones: the row scrolls sideways; keep the active tab in view
    const c = tabs.current, t = c?.querySelector(`[data-k="${k}"]`)
    if (c && t && c.scrollWidth > c.clientWidth + 2) c.scrollTo({ left: t.offsetLeft - (c.clientWidth - t.offsetWidth) / 2, behavior: instant ? 'auto' : 'smooth' })
  }
  useLayoutEffect(() => {
    const put = () => { const v = indVars(idRef.current); if (v) gsap.set(ind.current, v) }
    put()
    window.addEventListener('resize', put)
    document.fonts?.ready.then(put)
    return () => window.removeEventListener('resize', put)
  }, [])

  /* ---------- one flavour change ---------- */
  const hold = (ms) => {
    clearTimeout(timer.current)
    if (prefersReduced() || !inView.current || document.hidden) return
    timer.current = setTimeout(() => api.current.next(), ms)
  }
  const go = (k, ms) => {
    clearTimeout(timer.current) // a click (or the cycle itself) always stops the pending timer first
    if (busy.current) { pending.current = [k, ms]; return }
    if (k === idRef.current) { setActive(k); const v = indVars(k); if (v) gsap.to(ind.current, { ...v, duration: 0.4, overwrite: true }); hold(ms); return }
    setActive(k)
    holdFor.current = ms
    const v = indVars(k)
    keepInView(k, false)
    if (prefersReduced()) {
      bgA.current.style.backgroundImage = `url(${FLAVOUR_BG(k)})`
      root.current.style.backgroundColor = TONE[k]
      if (v) gsap.set(ind.current, v)
      idRef.current = k
      setId(k)
      return
    }
    busy.current = true
    const el = root.current
    // the product crossfades: the new cut-out (already loaded) rises in while the old one eases away, with a little scale and lift
    const A = imgA.current, B = imgB.current
    B.src = FLAVOUR_IMG(k)
    gsap.killTweensOf([A, B])
    gsap.fromTo(B, { opacity: 0, scale: 0.95, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'power2.out' })
    gsap.to(A, { opacity: 0, scale: 1.035, y: -10, duration: 0.5, ease: 'power2.inOut', onComplete: () => { A.src = B.src; gsap.set(A, { opacity: 1, scale: 1, y: 0 }); gsap.set(B, { opacity: 0 }) } })
    // the section background crossfades to this flavour's own backdrop (soft scale, so it reads as a change of light, not a slide)
    const Ba = bgA.current, Bb = bgB.current
    Bb.style.backgroundImage = `url(${FLAVOUR_BG(k)})`
    el.style.backgroundColor = TONE[k]
    gsap.killTweensOf([Ba, Bb])
    gsap.fromTo(Bb, { opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.inOut', onComplete: () => { Ba.style.backgroundImage = Bb.style.backgroundImage; gsap.set(Ba, { opacity: 1 }); gsap.set(Bb, { opacity: 0 }) } })
    // ONE timeline starts everything together: indicator and the outgoing content (the incoming half follows it without a gap)
    const tl = gsap.timeline()
    if (v) tl.to(ind.current, { ...v, duration: 0.5, ease: 'power3.out', overwrite: true }, 0)
    tl.to(el.querySelectorAll('.hx-w'), { yPercent: -115, duration: 0.2, stagger: 0.02, ease: 'power3.in' }, 0)
      .to(el.querySelectorAll('.hx-sub'), { y: -16, opacity: 0, duration: 0.18, stagger: 0.015, ease: 'power2.in' }, 0)
      .to(el.querySelectorAll('.hx-fl-m'), { scale: 0, rotate: 120, opacity: 0, duration: 0.2, stagger: 0.03, ease: 'power2.in' }, 0)
      .call(() => { idRef.current = k; setId(k) }, null, 0.24) // the new content is rendered the moment the old one has left (the background keeps growing meanwhile)
  }
  api.current.next = () => go(ORDER[(ORDER.indexOf(idRef.current) + 1) % ORDER.length], AUTO_HOLD)
  const pick = (k) => go(k, PICK_HOLD)

  // the incoming half (the new content is rendered by React once the old one has left)
  useEffect(() => {
    if (prevId.current === id) return // the first render (and React's dev double-mount) is not a change
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
    tl.fromTo(el.querySelectorAll('.hx-w'), { yPercent: 118, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 0.45, stagger: 0.035, ease: 'expo.out' }, 0)
      .fromTo(el.querySelectorAll('.hx-fl-m'), { scale: 0, rotate: -120, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.7)' }, 0.04)
      .fromTo(el.querySelectorAll('.hx-sub'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.025, ease: 'power3.out' }, 0.08)
    return () => tl.kill()
  }, [id])

  // scroll transition into the next section (scrubbed, so it reverses on the way up): copy lifts and fades, product recedes and drifts, the disc grows
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const el = root.current
    const ctx = gsap.context(() => {
      const st = { trigger: el, start: 'top top', end: 'bottom 12%', scrub: 0.6 }
      gsap.to('.hx-copy', { y: -60, opacity: 0.12, ease: 'none', scrollTrigger: st })
      gsap.to('.hx-buy', { y: -40, opacity: 0.1, ease: 'none', scrollTrigger: st })
      gsap.to('.hx-tabswrap', { y: -28, opacity: 0, ease: 'none', scrollTrigger: st })
      gsap.to('.hx-art', { y: 56, scale: 0.94, ease: 'none', scrollTrigger: st })
      gsap.to('.hx-halo', { scale: 1.18, opacity: 0.2, ease: 'none', scrollTrigger: st })
      gsap.to('.hx-wave', { yPercent: 40, ease: 'none', scrollTrigger: st })
    }, el)
    return () => ctx.revert()
  }, [])

  // subtle pointer parallax: bokeh, halo and glass move by different amounts (desktop pointers only)
  useEffect(() => {
    if (!finePointer() || prefersReduced()) return
    const q = (sel, d) => [gsap.quickTo(sel, 'x', { duration: d, ease: 'power3.out' }), gsap.quickTo(sel, 'y', { duration: d, ease: 'power3.out' })]
    const bok = q('.hx-bg', 1.6), glass = q('.hx-glass', 1.1), halo = q('.hx-halo', 1.4)
    const move = (e) => {
      if (window.scrollY > window.innerHeight * 0.6) return
      const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5
      bok[0](-nx * 36); bok[1](-ny * 24); glass[0](nx * 12); glass[1](ny * 8); halo[0](-nx * 22); halo[1](-ny * 14)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  // automatic cycling: runs while the hero is on screen, pauses when it leaves (or the tab is hidden), resumes smoothly
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

  return (
    <section className="hx" id="top" ref={root} style={{ '--oh': OUT_H, backgroundColor: TONE[ORDER[0]] }}>
      <div className="hx-bg" ref={bgA} style={{ backgroundImage: `url(${FLAVOUR_BG(ORDER[0])})` }} aria-hidden="true" />
      <div className="hx-bg hx-bgb" ref={bgB} aria-hidden="true" />
      <div className="hx-shade" aria-hidden="true" />
      <div className="wrap hx-grid">
        <div className="hx-copy">
          <p className="eyebrow hx-eyebrow hx-sub"><b className="hx-no">0{no}</b> Signature flavour</p>
          <h1 className="h2 hx-title" aria-label={f.title}>
            {f.title.split(' ').map((w, i) => (
              <span className="sel-m" key={`${id}-${i}`} aria-hidden="true">
                <span className="hx-w">{w}</span>{' '}
              </span>
            ))}
          </h1>
          <p className="lede hx-sub hx-desc" aria-live="polite">{HERO_COPY[id]}</p>
          <ul className="hx-notes">
            {f.notes.map((n) => (
              <li className="hx-sub" key={n}>{n}</li>
            ))}
          </ul>
        </div>

        <div className="hx-art">
          <div className="hx-halo" style={{ '--ac': f.accent }} aria-hidden="true" />
          {['a', 'b', 'c', 'd'].map((p, i) => { const C = FL[i]; return (
            <div className={`hx-fl ${p}`} key={p} aria-hidden="true"><div className="hx-fl-m"><div className="float" key={id} style={{ '--fy': `${10 + i * 3}px`, '--dur': `${5 + i}s` }}><C /></div></div></div>
          ) })}
          <div className="hx-glass" role="img" aria-label={`${f.label} falooda in a premium falooda glass`}>
            <span className="hx-floor" aria-hidden="true" />
            <img className="hx-gimg" ref={imgA} src={FLAVOUR_IMG(id)} alt="" fetchPriority="high" decoding="async" draggable="false" />
            <img className="hx-gimg hx-gb" ref={imgB} alt="" decoding="async" draggable="false" />
          </div>
        </div>

        <div className="hx-buy">
          <span className="price hx-price hx-sub">{SITE.currency}{price}</span>
          <div className="hx-cta hx-sub">
            <a className="btn btn-rose" href={SITE.contact.orderHref}>
              Order Now
            </a>
            <a className="btn btn-glass" href="#flavours">
              Explore Flavours
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
        </div>

        <div className="hx-tabswrap">
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
      </div>
      <svg className="hx-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 80V40C240 0 480 70 720 40S1200 0 1440 40V80Z" fill="var(--paper)" />
      </svg>
    </section>
  )
}
