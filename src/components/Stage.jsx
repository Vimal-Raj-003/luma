import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import FaloodaGlass from './FaloodaGlass'
import { ING, CHIPS } from './Ingredients'
import { finePointer, lockScroll, prefersReduced, scene } from '../hooks/motion'
import { PALETTES, SITE } from '../data/site'

const SMALL = typeof window !== 'undefined' && window.innerWidth < 700

gsap.registerPlugin(ScrollTrigger)

// dev-only handle so the animation system can be inspected from the browser console
if (import.meta.env.DEV) window.__gsap = { gsap, ScrollTrigger }

/*
  ONE pinned scene = hero + layer story, sharing a single Falooda glass.
    load    : glass rises + settles, layers pour in, scoops & toppings drop in, ingredients fly in
    0 → A   : (scroll) hero copy exits, ingredients scatter, the glass is taken apart
    A → A+6 : the glass is rebuilt layer by layer, text changes with every layer
    last    : the scene washes into the rose tone of the flavour section that follows
*/

// depth tiers: far (small, soft, slow) · mid · near (large, blurred, in front of the glass, fast)
const FLOATERS = [
  { k: 'basil', t: 'far', x: '80%', y: '10%', mx: '80%', my: '11%', s: 30, ms: 22, rot: 0 },
  { k: 'jelly', c: '#A5D98F', t: 'far', x: '96%', y: '34%', mx: '3%', my: '28%', s: 34, ms: 24, rot: -14 },
  { k: 'almond', t: 'far', x: '53%', y: '64%', mx: '92%', my: '43%', s: 38, ms: 26, rot: 30 },
  { k: 'pistachio', t: 'mid', x: '58%', y: '24%', mx: '11%', my: '19%', s: 62, ms: 40, rot: -20 },
  { k: 'petal', t: 'mid', x: '92%', y: '15%', mx: '85%', my: '15%', s: 74, ms: 46, rot: 24 },
  { k: 'berry', t: 'mid', x: '57%', y: '47%', mx: '88%', my: '29%', s: 58, ms: 38, rot: 6 },
  { k: 'jelly', c: '#FF86AB', t: 'mid', x: '94%', y: '66%', mx: '9%', my: '38%', s: 56, ms: 36, rot: 8 },
  { k: 'petal', t: 'near', x: '86%', y: '88%', mx: '84%', my: '47%', s: 118, ms: 60, rot: -30 },
  { k: 'cube', c: '#FFC247', t: 'near', x: '60%', y: '86%', mx: '3%', my: '47%', s: 96, ms: 54, rot: -10 },
]
const TIER = {
  // far = slow, small travel · near = fast, wide travel (idle drift, cursor parallax and scatter all scale with depth)
  far: { d: 14, fy: 9, fx: 6, fr: 6, dur: 9.5, blur: 1.4, op: 0.7, push: 0.8, from: 0.4 },
  mid: { d: 40, fy: 16, fx: 14, fr: 12, dur: 6, blur: 0, op: 1, push: 1.1, from: 0.7 },
  near: { d: 90, fy: 30, fx: 30, fr: 24, dur: 4.6, blur: 3.4, op: 1, push: 1.7, from: 1.8 },
}

const STEPS = [
  { key: 'syrup', layer: '.fl-syrup', title: 'Rose Syrup', text: 'A deep, fragrant base poured first.', pos: ['55%', '70%', '6%', '36%'], pour: PALETTES.rose.syrup[0], top: 392 },
  { key: 'basil', layer: '.fl-basil', title: 'Basil Seeds', text: 'Soft, silky pearls that cool every sip.', pos: ['90%', '72%', '78%', '38%'] },
  { key: 'sev', layer: '.fl-sev', title: 'Falooda Sev', text: 'Delicate noodles, tangled and chilled.', pos: ['51%', '38%', '4%', '21%'] },
  { key: 'milk', layer: '.fl-milk', title: 'Chilled Milk', text: 'Sweet, creamy and poured slow.', pos: ['93%', '40%', '80%', '20%'], pour: PALETTES.rose.milk[0], top: 196 },
  { key: 'ice', layer: '.fl-ice', title: 'Ice Cream', text: 'Three hand-scooped crowns on top.', pos: ['58%', '14%', '8%', '12%'] },
  { key: 'nuts', layer: '.fl-top', title: 'Nuts & Toppings', text: 'Pistachio, almond, petals — the finish.', pos: ['88%', '12%', '76%', '12%'] },
]
const TOP_SYRUP = 392
const A = 1.8 // deconstruct phase
const B = STEPS.length
const C = 1.2 // hand-off phase
const TOTAL = A + B + C

function Floater({ k, c, t, x, y, mx, my, s, ms, rot }) {
  const C = ING[k]
  const tr = TIER[t]
  return (
    <div
      className={`fl${t === 'far' && k !== 'basil' ? ' hide-m' : ''}`}
      data-depth={tr.d}
      data-tier={t}
      data-x={parseFloat(x)}
      data-y={parseFloat(y)}
      style={{ '--x': x, '--y': y, '--mx': mx, '--my': my, '--s': `${s}px`, '--ms': `${ms}px` }}
    >
      <div className="fl-e" data-tier={t}>
        <div className="fl-f float" style={{ '--fy': `${tr.fy}px`, '--fx': `${tr.fx}px`, '--fr': `${tr.fr}deg`, '--dur': `${tr.dur}s`, '--delay': `${-(s % 5)}s` }}>
          <C color={c} style={{ transform: `rotate(${rot}deg)`, filter: tr.blur ? `blur(${tr.blur}px)` : undefined }} />
        </div>
      </div>
    </div>
  )
}

export default function Stage({ ready, onFormed }) {
  const root = useRef(null) // the pinned scene
  const skipBtn = useRef(null)
  const sgc = useRef(null) // camera wrapper (intro framing)
  const sg1 = useRef(null) // entrance wrapper (rise / rotate / settle)

  /* hidden starting states: the viewer first sees only the background */
  useLayoutEffect(() => {
    const el = root.current
    if (prefersReduced()) {
      el.classList.add('rm')
      return
    }
    const ctx = gsap.context(() => {
      gsap.set(sg1.current, { yPercent: 120, rotation: 10, rotationY: -26, rotationX: 16, scale: 0.86, opacity: 0, transformPerspective: 1200 })
      gsap.set('.sg3 .fl-k-sev > .tp path', { strokeDasharray: 1, strokeDashoffset: 1 })
      gsap.set('.sg3 .fl-body', { opacity: 0 })
      gsap.set('.sg3 .fl-syrup .fl-body', { y: 100 })
      gsap.set('.sg3 .fl-basil .fl-body', { y: 80 })
      gsap.set('.sg3 .fl-sev .fl-body, .sg3 .fl-milk .fl-body', { y: 134 })
      gsap.set('.sg3 .tp', { opacity: 0 })
      gsap.set('.sg3 .fl-scoop, .sg3 .fl-sauce, .sg3 .fl-vol, .sg3 .fl-cond', { opacity: 0 })
      gsap.set('.hero-halo', { opacity: 0 })
      gsap.set('.fl-e', { opacity: 0 })
      gsap.set('.h-word', { yPercent: 125, rotate: 7 })
      gsap.set('.h-fade', { y: 34, opacity: 0 })
      gsap.set('.swoosh', { strokeDasharray: 1, strokeDashoffset: 1 })
      gsap.set('.blob', { opacity: 0, scale: 0.7 })
      gsap.set(skipBtn.current, { autoAlpha: 0 })
    }, el)
    return () => {
      ctx.revert()
      lockScroll(false)
    }
  }, [])

  /* the opening: the Falooda is made, then the page unfolds around it */
  useEffect(() => {
    if (!ready || prefersReduced()) return
    const el = root.current
    const cleanups = []

    const ctx = gsap.context(() => {
      const visual = el.querySelector('.stage-visual')
      const center = () => {
        const r = visual.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }
      const vec = (node) => {
        const r = node.parentNode.getBoundingClientRect()
        const g = center()
        const dx = r.left + r.width / 2 - g.x
        const dy = r.top + r.height / 2 - g.y
        return { dx, dy, len: Math.hypot(dx, dy) || 1 }
      }
      const Q = (s) => [...el.querySelectorAll(`.sg3 ${s}`)]
      const pr = el.querySelector('.sg3 .fl-pour')
      const rp = el.querySelector('.sg3 .fl-ripple')
      const drops = Q('.fl-drop')
      const R = gsap.utils.random

      // camera: the glass is born large, in the middle of the screen
      const mobile = window.innerWidth < 900
      const c0 = center()
      gsap.set(sgc.current, {
        x: window.innerWidth / 2 - c0.x,
        y: window.innerHeight * 0.5 - c0.y,
        scale: mobile ? 1.18 : 1.1,
      })

      const tl = gsap.timeline({ defaults: { ease: 'none' } })
      window.__intro = { start: performance.now(), tl } // handle for debugging / frame-exact verification
      if (new URLSearchParams(window.location.search).has('hold')) tl.pause() // debug: start paused so frames can be stepped

      /* ---- helpers: liquid + gravity ---- */
      const camS = mobile ? 1.18 : 1.1
      const bodies = Q('.fl-body')

      /* ---- physical helpers ---- */
      // a stream from above the frame; its end tracks the rising surface, then it breaks off from the top
      const pour = (at, color, fromY, toY, fill, edge = 'none') => {
        const top = -520
        tl.set(pr, { attr: { fill: color, stroke: edge, 'stroke-width': 1.4, y: top, height: 0, x: 194, width: 12, rx: 6 }, opacity: 0.95 }, at)
          .to(pr, { attr: { height: fromY - top }, duration: 0.25, ease: 'power1.in' }, at)
          .to(pr, { attr: { height: toY - top }, duration: fill, ease: 'power1.inOut' }, at + 0.25)
          .to(pr, { attr: { y: toY, height: 0 }, duration: 0.4, ease: 'power1.out' }, at + 0.25 + fill)
          .set(pr, { opacity: 0 }, at + 0.65 + fill)
        ;[0.08, 0.35, 0.62, 0.9].forEach((k) => {
          const y = fromY + (toY - fromY) * k
          const t0 = at + 0.25 + fill * k
          tl.set(drops, { attr: { cy: y, fill: color }, x: 0, y: 0, opacity: 0, scale: 1.5, transformOrigin: '50% 50%' }, t0)
          drops.forEach((d, i) => {
            const dx = (i - 4) * R(5, 10)
            const t1 = t0 + i * 0.03
            tl.to(d, { x: dx * 0.6, y: -R(16, 42), opacity: 1, duration: 0.18, ease: 'power2.out' }, t1)
              .to(d, { x: dx, y: 0, opacity: 0, duration: 0.26, ease: 'power2.in' }, t1 + 0.18)
          })
          tl.set(rp, { attr: { cy: y, rx: 6 }, opacity: 0.9 }, t0)
            .to(rp, { attr: { rx: 84 }, opacity: 0, duration: 0.85, ease: 'power2.out' }, t0)
        })
      }
      // free fall: the item stretches in the air, squashes back on contact, then sinks and settles
      const drop = (items, at, surf, { spread = 0.6, each = 0, sink = 0.5, scatter = 26 } = {}) => {
        items.forEach((n, i) => {
          const ry = +n.dataset.ry || 300
          const y0 = -(ry + 140 + Math.random() * 140)
          const hit = Math.min(0, surf - ry)
          const fall = 0.022 * Math.sqrt(Math.abs(hit - y0))
          const t0 = at + (each ? i * each : Math.random() * spread)
          const dx = R(-scatter, scatter)
          const rot = R(-45, 45)
          tl.set(n, { opacity: 1, y: y0, x: dx, rotation: rot, scaleX: 1, scaleY: 1, transformOrigin: '50% 50%' }, t0)
            .to(n, { y: hit, x: dx * 0.2, rotation: rot * 0.3, scaleY: 1.32, scaleX: 0.86, duration: fall, ease: 'power2.in' }, t0)
            .to(n, { y: 0, x: 0, rotation: 0, scaleY: 1, scaleX: 1, duration: sink, ease: 'power2.out' }, t0 + fall)
        })
      }
      // the liquid sloshes when something lands in it (decaying side-to-side), and the camera takes a small knock
      const slosh = (at, amp) => {
        tl.to(bodies, { x: amp, duration: 0.1, ease: 'sine.out' }, at)
          .to(bodies, { x: -amp * 0.75, duration: 0.16, ease: 'sine.inOut' }, at + 0.1)
          .to(bodies, { x: amp * 0.45, duration: 0.18, ease: 'sine.inOut' }, at + 0.26)
          .to(bodies, { x: 0, duration: 0.24, ease: 'sine.out' }, at + 0.44)
      }
      const knock = (at, amp) => {
        tl.to(sgc.current, { y: `+=${amp}`, duration: 0.05, ease: 'power1.out' }, at)
          .to(sgc.current, { y: `-=${amp}`, duration: 0.16, ease: 'power2.out' }, at + 0.05)
      }

      /* ===================== THE OPENING (real seconds) =====================
         0.0  background only                  2.9  milk pours + fills upward
         0.2  empty glass rises (3D tilt)      3.6  ice-cream scoops fall + settle
         0.9  rose syrup pours + fills         4.0  pistachio / nuts / petals scatter, cherry last
         1.8  basil seeds fall one by one      5.0  glass slides to the hero position
         1.9  jelly cubes drop                 5.1  LUMA + headline reveal  ·  5.6 CTA buttons
         2.35 falooda sev drawn in + drops                                                   */

      /* 0.0 — background only */
      tl.to('.blob', { opacity: 1, scale: 1, duration: 1.4, stagger: 0.12, ease: 'power3.out' }, 0)
        .to('.swoosh', { strokeDashoffset: 0, duration: 2.6, stagger: 0.2, ease: 'power2.inOut' }, 0)

      /* 0.2 — the empty glass rises: translateY + rotation + 3D tilt + scale, then settles */
      tl.to(sg1.current, { yPercent: 0, duration: 1.5, ease: 'expo.out' }, 0.2)
        .to(sg1.current, { rotation: 0, rotationY: 0, rotationX: 0, scale: 1, duration: 2, ease: 'power3.out' }, 0.2)
        .to(sg1.current, { opacity: 1, duration: 0.4, ease: 'power1.out' }, 0.2)
        .to(skipBtn.current, { autoAlpha: 1, duration: 0.4 }, 0.8)
      // slow camera push-in for the whole build
      tl.to(sgc.current, { scale: camS * 1.09, duration: 4.2, ease: 'sine.inOut' }, 0.8)

      /* 0.9 — rose syrup: a stream pours and the liquid rises from the bottom, masked by the bowl */
      pour(0.9, PALETTES.rose.syrup[0], 452, TOP_SYRUP, 0.85)
      tl.set(Q('.fl-syrup .fl-body'), { opacity: 1 }, 1.15)
        .to(Q('.fl-syrup .fl-body'), { y: 0, duration: 0.85, ease: 'power1.inOut' }, 1.17)
      slosh(2.05, 4)

      /* 1.8 — basil gel rises, seeds fall in one by one; 1.9 — jelly cubes follow */
      tl.set(Q('.fl-basil .fl-body'), { opacity: 1 }, 1.75)
        .to(Q('.fl-basil .fl-body'), { y: 0, duration: 0.45, ease: 'power2.out' }, 1.75)
      drop(Q('.fl-k-basil .tp'), 1.8, 330, { each: 0.011, sink: 0.35, scatter: 20 })
      drop(Q('.fl-basil .fl-k-jelly .tp, .fl-syrup .fl-k-jelly .tp'), 1.9, 330, { each: 0.12, sink: 0.4, scatter: 16 })
      slosh(2.75, 3)

      /* 2.35 — falooda sev: each strand is drawn in as it falls, then lands with a small settle */
      Q('.fl-k-sev > .tp').forEach((n, i) => {
        const at = 2.35 + i * 0.03
        const strokes = n.querySelectorAll('path')
        tl.set(n, { opacity: 1, y: -430, rotation: R(-6, 6), transformOrigin: '50% 50%' }, at)
          .to(n, { y: 6, rotation: 0, duration: 0.45, ease: 'power2.in' }, at)
          .to(strokes, { strokeDashoffset: 0, duration: 0.55, ease: 'power1.out' }, at)
          .to(n, { y: 0, duration: 0.15, ease: 'power1.out' }, at + 0.45)
      })
      slosh(3.2, 3)

      /* 2.9 — milk: stream, and the liquid fills upward; glass volume shading fades in as it fills */
      pour(2.9, PALETTES.rose.milk[0], 330, 196, 0.9, '#F29DB8') // pale milk gets a soft rose edge so the stream reads against the cream
      tl.set(Q('.fl-sev .fl-body, .fl-milk .fl-body'), { opacity: 1 }, 3.15)
        .to(Q('.fl-sev .fl-body, .fl-milk .fl-body'), { y: 0, duration: 0.9, ease: 'power1.inOut' }, 3.15)
        .to(Q('.fl-vol'), { opacity: 1, duration: 0.6, ease: 'power1.out' }, 3.7)
      drop(Q('.fl-milk .fl-k-jelly .tp, .fl-milk .fl-k-fruit .tp'), 3.3, 196, { each: 0.1, sink: 0.45, scatter: 16 })

      /* 3.6 — scoops fall one after another, squash on the milk, the surface sloshes, the camera knocks */
      Q('.fl-scoop').forEach((n, i) => {
        const at = 3.6 + i * 0.22
        tl.set(n, { opacity: 1, y: -420, rotation: [-6, 6, 0][i], transformOrigin: '50% 100%' }, at)
          .to(n, { y: 3, rotation: 0, scaleY: 1.08, scaleX: 0.96, duration: 0.45, ease: 'power2.in' }, at)
          .to(n, { scaleY: 0.92, scaleX: 1.05, y: 0, duration: 0.07, ease: 'power1.out' }, at + 0.45)
          .to(n, { scaleY: 1.03, scaleX: 0.99, duration: 0.1, ease: 'power1.out' }, at + 0.52)
          .to(n, { scaleY: 1, scaleX: 1, duration: 0.14, ease: 'power1.inOut' }, at + 0.62)
        slosh(at + 0.45, [5, 5, 6][i])
        knock(at + 0.45, [4, 4, 5][i])
      })
      tl.to(Q('.fl-sauce'), { opacity: 1, duration: 0.55, ease: 'power1.out' }, 4.45)

      /* 4.0 — pistachio, almonds, saffron and petals scatter down; the cherry lands last, bouncing */
      Q('.fl-top .tp').forEach((n) => {
        const kind = n.parentNode.getAttribute('class') || ''
        const petal = kind.includes('petals')
        const cherry = kind.includes('cherry')
        const cream = kind.includes('cream')
        const at = cherry ? 4.75 : cream ? 4.6 : petal ? 4.05 + Math.random() * 0.35 : 4.05 + Math.random() * 0.6
        const y0 = -(petal ? 380 : 420 + Math.random() * 260)
        const dx = R(-110, 110)
        const rot = R(-170, 170)
        const fall = petal ? 0.85 : cherry ? 0.42 : 0.02 * Math.sqrt(Math.abs(y0)) + 0.03
        tl.set(n, { opacity: 1, y: y0, x: dx, rotation: rot, scaleX: 1, scaleY: 1, transformOrigin: '50% 50%' }, at)
        if (petal) {
          // petals drift: slow, swinging, easing out
          tl.to(n, { y: 0, duration: fall, ease: 'power1.in' }, at)
            .to(n, { x: 0, rotation: 0, duration: fall, ease: 'sine.inOut' }, at)
        } else {
          tl.to(n, { y: 0, x: 0, rotation: 0, scaleY: cherry ? 1 : 1.25, scaleX: cherry ? 1 : 0.88, duration: fall, ease: 'power2.in' }, at)
          if (cherry) {
            tl.to(n, { y: -13, duration: 0.13, ease: 'power1.out' }, at + fall)
              .to(n, { y: 0, duration: 0.15, ease: 'power1.in' }, at + fall + 0.13)
              .to(n, { y: -3, duration: 0.06, ease: 'power1.out' }, at + fall + 0.28)
              .to(n, { y: 0, duration: 0.07, ease: 'power1.in' }, at + fall + 0.34)
          } else if (!cream) {
            tl.to(n, { y: -4, scaleY: 0.85, scaleX: 1.1, duration: 0.06, ease: 'power1.out' }, at + fall)
              .to(n, { y: 0, scaleY: 1, scaleX: 1, duration: 0.09, ease: 'power1.in' }, at + fall + 0.06)
          }
        }
      })
      slosh(5.2, 3)

      /* 5.0 — only now: the camera pulls back and the glass slides to the hero position;
               LUMA + headline reveal (5.1), CTA buttons (5.6) */
      const F = 5.0
      tl.addLabel('formed', F)
        .to(skipBtn.current, { autoAlpha: 0, duration: 0.3 }, F - 0.3)
        .to(sgc.current, { x: 0, y: 0, scale: 1, duration: 1.5, ease: 'power3.inOut' }, F)
        .to('.fl-cond', { opacity: 1, duration: 1.2, ease: 'power1.out' }, F - 0.2)
        .to('.hero-halo', { opacity: 1, duration: 1.2, ease: 'power1.out' }, F + 0.1)
        .call(() => { window.__intro.formed = performance.now(); onFormed && onFormed() }, null, F + 0.1)
        .to('.h-word', { yPercent: 0, rotate: 0, duration: 1.2, stagger: 0.14, ease: 'expo.out' }, 5.1)
        .to('.h-fade', { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out' }, 5.4)
        .fromTo(
          '.fl-e',
          {
            x: (i, t) => { const v = vec(t); return (v.dx / v.len) * window.innerWidth * 0.55 * TIER[t.dataset.tier].push + R(-80, 80) },
            y: (i, t) => { const v = vec(t); return (v.dy / v.len) * window.innerHeight * 0.5 * TIER[t.dataset.tier].push + R(-60, 60) },
            scale: (i, t) => TIER[t.dataset.tier].from,
            opacity: 0,
          },
          { x: 0, y: 0, scale: 1, opacity: (i, t) => TIER[t.dataset.tier].op, duration: 2.2, stagger: { each: 0.09, from: 'random' }, ease: 'expo.out' },
          F + 0.2,
        )
        .call(() => {
          window.__intro.done = performance.now()
          lockScroll(false)
          ctx.add(buildScroll)
          ctx.add(bindPointer)
        }, null, 6.6)

      // the stage lives below the video hero: settle straight into the finished glass (also builds the scroll scene)
      tl.pause()
      let cancelled = false
      cleanups.push(() => { cancelled = true })
      // deferred: the timeline's end-callbacks use `ctx`, which only exists once this callback has returned
      queueMicrotask(() => {
        if (!cancelled) ctx.add(() => tl.progress(1, false))
      })

      // any attempt to scroll / click / press a key fast-forwards the intro
      const skip = () => tl.timeScale(7)
      skipBtn.current.addEventListener('click', skip)
      ;['wheel', 'touchstart', 'keydown'].forEach((e) => window.addEventListener(e, skip, { passive: true, once: true }))
      cleanups.push(() => {
        skipBtn.current && skipBtn.current.removeEventListener('click', skip)
        ;['wheel', 'touchstart', 'keydown'].forEach((e) => window.removeEventListener(e, skip))
      })

      /* ---------- 2. scroll-driven scene ---------- */
      const buildScroll = () => {
        const mobile = window.innerWidth < 900
        const g = '.sg3'
        const S = (v) => (mobile ? 1 + (v - 1) * 0.45 : v) // gentler camera push on small screens
        const story = el.querySelector('.story-copy')
        const steps = [...el.querySelectorAll('.step')]

        const tl2 = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: () => `+=${Math.round(window.innerHeight * TOTAL * (window.innerWidth < 900 ? 0.62 : 0.74))}`,
            pin: true,
            scrub: 0.9,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const t = self.progress * TOTAL
              const i = t < A - 0.3 ? -1 : Math.min(B - 1, Math.floor(t - A + 0.25))
              steps.forEach((s, n) => {
                s.classList.toggle('active', n === i)
                s.classList.toggle('done', n < i)
              })
              el.style.setProperty('--p', Math.max(0, Math.min(1, (t - A) / B)).toFixed(3))
              el.dataset.step = i
            },
          },
        })
        scene.st = tl2.scrollTrigger
        scene.storyAt = (A + 0.1) / TOTAL

        /* A — take the glass apart */
        tl2
          .to('.h-word', { yPercent: -140, rotate: -5, duration: 0.7, stagger: 0.07, ease: 'power2.in', immediateRender: false }, 0)
          .to('.hero-copy .h-fade', { y: -64, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power2.in', immediateRender: false }, 0.05)
          .set('.hero-copy', { pointerEvents: 'none' }, 0.5)
          .to(
            '.fl-e',
            {
              x: (i, t) => { const v = vec(t); return (v.dx / v.len) * (320 + v.len * 0.6) * TIER[t.dataset.tier].push },
              y: (i, t) => { const v = vec(t); return (v.dy / v.len) * (300 + v.len * 0.6) * TIER[t.dataset.tier].push },
              scale: (i, t) => (t.dataset.tier === 'near' ? 1.9 : 0.5),
              opacity: 0,
              duration: 1.2,
              ease: 'power2.in',
              immediateRender: false,
            },
            0.05,
          )
          .to(`${g} .fl-vol, ${g} .fl-cond`, { opacity: 0, duration: 0.4, ease: 'power1.in', immediateRender: false }, 0.6)
          .to(`${g} .fl-top`, { y: -90, opacity: 0, duration: 0.5, ease: 'power2.in', immediateRender: false }, 0.1)
          .to(`${g} .fl-ice`, { y: -170, scale: 0.9, svgOrigin: '200 190', opacity: 0, duration: 0.7, ease: 'power2.in', immediateRender: false }, 0.3)
          ;['.fl-milk', '.fl-sev', '.fl-basil', '.fl-syrup'].forEach((s, i) => {
            tl2.to(`${g} ${s}`, { y: -40, opacity: 0, duration: 0.4, ease: 'power2.in', immediateRender: false }, 0.75 + i * 0.2)
          })
        tl2
          .to(g, { scale: S(1.12), rotate: -3, x: mobile ? 0 : -70, y: mobile ? 0 : 16, duration: A, ease: 'power1.inOut', immediateRender: false }, 0)
          .fromTo('.stage-aura', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out', immediateRender: false }, 0.9)
          .fromTo(story, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, 1.2)

        /* B — rebuild it, one layer at a time */
        STEPS.forEach((s, i) => {
          const base = A + i
          const chip = el.querySelector(`.chip[data-k="${s.key}"]`)
          const target = el.querySelector(`${g} ${s.layer}`)
          const toGlass = (axis) => () => {
            const gr = el.querySelector(g).getBoundingClientRect()
            const c = chip.getBoundingClientRect()
            return axis === 'x' ? gr.left + gr.width / 2 - (c.left + c.width / 2) : gr.top + gr.height * 0.2 - (c.top + c.height / 2)
          }
          tl2.fromTo(chip, { opacity: 0, scale: 0.55, y: 50, x: 0 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power2.out', immediateRender: false }, base)
          tl2.to(chip, { x: toGlass('x'), y: toGlass('y'), scale: 0.25, opacity: 0, duration: 0.42, ease: 'power2.in' }, base + 0.4)

          if (s.pour) {
            const pr = el.querySelector(`${g} .fl-pour`)
            tl2.fromTo(pr, { attr: { y: 30, height: 0, fill: s.pour }, opacity: 0.95 }, { attr: { y: 30, height: s.top - 30 }, duration: 0.24, ease: 'power1.in', immediateRender: false }, base + 0.5)
            tl2.to(pr, { attr: { y: s.top, height: 0 }, duration: 0.26, ease: 'power1.out' }, base + 0.74)
          }

          const poured = s.key === 'ice' ? { y: -130, scale: 0.85, svgOrigin: '200 190' } : { y: s.key === 'nuts' ? -60 : -70 }
          tl2.fromTo(target, { opacity: 0, ...poured }, { opacity: 1, y: 0, scale: 1, duration: 0.46, ease: 'power3.out', immediateRender: false }, base + 0.56)
          if (s.key === 'milk') tl2.fromTo(`${g} .fl-vol, ${g} .fl-cond`, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, base + 0.8)
          if (s.key === 'ice') {
            tl2.fromTo(`${g} .fl-scoop`, { y: -170 }, { y: 0, duration: 0.46, stagger: 0.09, ease: 'power3.out', immediateRender: false }, base + 0.56)
            tl2.fromTo(`${g} .fl-sauce`, { opacity: 0 }, { opacity: 1, duration: 0.3, immediateRender: false }, base + 0.95)
          }
          if (s.key === 'nuts') {
            tl2.fromTo(
              `${g} .fl-top .tp`,
              { y: (k) => -(110 + ((k * 37) % 120)), opacity: 0, rotation: (k) => ((k * 53) % 90) - 45, transformOrigin: '50% 50%' },
              { y: 0, opacity: 1, rotation: 0, duration: 0.5, stagger: { each: 0.012, from: 'random' }, ease: 'power2.out', immediateRender: false },
              base + 0.56,
            )
          }
          tl2.to(g, { rotate: i % 2 ? 2.4 : -2.4, duration: 1, ease: 'sine.inOut' }, base)
        })
        tl2.to(g, { scale: S(1.26), duration: B, ease: 'none' }, A)

        /* C — hand-off: wash into the next section's rose tone while the glass pushes toward camera */
        tl2
          .to('.stage-wash', { opacity: 1, duration: C, ease: 'none' }, A + B)
          .to(story, { opacity: 0, y: -50, duration: 0.6, ease: 'power2.in' }, A + B + 0.1)
          .to(g, { scale: S(1.36), rotate: 0, x: 0, y: mobile ? 0 : -36, duration: C, ease: 'power1.inOut' }, A + B)
          .to('.stage-aura', { scale: 1.5, opacity: 0, duration: C, ease: 'none' }, A + B)

        // the background moves at its own speeds behind the glass while you scroll (depth)
        tl2
          .to('.b-rose', { yPercent: -30, xPercent: -8, duration: TOTAL, ease: 'none', immediateRender: false }, 0)
          .to('.b-pista', { yPercent: -55, xPercent: 10, duration: TOTAL, ease: 'none', immediateRender: false }, 0)
          .to('.b-mango', { yPercent: -18, xPercent: 12, duration: TOTAL, ease: 'none', immediateRender: false }, 0)
          .to('.swooshes', { yPercent: -14, scale: 1.14, transformOrigin: '65% 50%', duration: TOTAL, ease: 'none', immediateRender: false }, 0)

        // The stage's pin (a ~6000px spacer) is created after the triggers below it (selector, signature…), which were
        // measured without that spacer. Re-sort in DOM order and recalculate them all, or they fire at the wrong scroll positions.
        ScrollTrigger.sort()
        ScrollTrigger.refresh()
      }

      /* ---------- 3. pointer: layered parallax, tilt, ingredients nudged away from the cursor ---------- */
      const bindPointer = () => {
        if (!finePointer()) return
        const items = [...el.querySelectorAll('[data-depth]')].map((n) => ({
          n,
          x: gsap.quickTo(n, 'x', { duration: 1.2, ease: 'power3.out' }),
          y: gsap.quickTo(n, 'y', { duration: 1.2, ease: 'power3.out' }),
          d: +n.dataset.depth,
          px: n.dataset.x ? +n.dataset.x / 100 : null,
          py: n.dataset.y ? +n.dataset.y / 100 : null,
        }))
        const glass = el.querySelector('.sg0')
        const rY = gsap.quickTo(glass, 'rotationY', { duration: 1.4, ease: 'power3.out' })
        const rX = gsap.quickTo(glass, 'rotationX', { duration: 1.4, ease: 'power3.out' })
        gsap.set(glass, { transformPerspective: 1200 })
        const move = (e) => {
          const rr = el.getBoundingClientRect()
          if (rr.bottom < 0 || rr.top > window.innerHeight) return
          const W = window.innerWidth
          const H = window.innerHeight
          const nx = e.clientX / W - 0.5
          const ny = e.clientY / H - 0.5
          rY(nx * 12)
          rX(-ny * 7)
          items.forEach((it) => {
            let ox = -nx * it.d
            let oy = -ny * it.d
            if (it.px !== null) {
              const dx = it.px * W - e.clientX
              const dy = it.py * H - e.clientY
              const dist = Math.hypot(dx, dy)
              if (dist < 220) {
                const k = (1 - dist / 220) * 46
                ox += (dx / dist) * k
                oy += (dy / dist) * k
              }
            }
            it.x(ox)
            it.y(oy)
          })
        }
        window.addEventListener('pointermove', move, { passive: true })
        cleanups.push(() => window.removeEventListener('pointermove', move))
      }
    }, el)

    return () => {
      cleanups.forEach((f) => f())
      ctx.revert()
      scene.st = null
      lockScroll(false)
    }
  }, [ready])

  return (
    <section className="stage story" id="craft" ref={root}>
      <div className="hero-bg" aria-hidden="true">
        <div className="blob b-rose" data-depth="22"><i /></div>
        <div className="blob b-pista" data-depth="30"><i /></div>
        <div className="blob b-mango" data-depth="18"><i /></div>
        <svg className="swooshes" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <g className="sw sw1"><path className="swoosh" pathLength="1" d="M640 150 C900 80 1240 170 1130 360 S780 520 1010 690 S1330 830 1460 740" stroke="#F0709B" strokeWidth="18" opacity=".3" /></g>
          <g className="sw sw2"><path className="swoosh" pathLength="1" d="M520 820 C740 700 640 520 880 430 S1260 300 1440 120" stroke="#A9D58B" strokeWidth="14" opacity=".42" /></g>
          <g className="sw sw3"><path className="swoosh" pathLength="1" d="M780 130 C720 230 900 280 820 420 S960 640 1180 600" stroke="#FFBE3B" strokeWidth="7" opacity=".5" /></g>
        </svg>
      </div>
      <div className="stage-wash" aria-hidden="true" />

      <div className="fls" aria-hidden="true">
        {FLOATERS.filter((f) => f.t !== 'near').map((f, i) => <Floater key={i} {...f} />)}
      </div>

      <div className="wrap stage-grid">
        <div className="stage-copy">
          <div className="hero-copy">
            <p className="eyebrow h-fade">Falooda, reimagined</p>
            <h1 aria-label="Layers of Happiness.">
              <span className="h-line" aria-hidden="true">
                <span className="h-mask"><span className="h-word">Layers</span></span>{' '}
                <span className="h-mask"><span className="h-word">of</span></span>
              </span>
              <span className="h-line" aria-hidden="true">
                <span className="h-mask"><span className="h-word"><em>Happiness.</em></span></span>
              </span>
            </h1>
            <p className="hero-sub h-fade">Creamy. Colourful. Refreshingly unforgettable.</p>
            <div className="hero-cta h-fade">
              <a className="btn btn-rose" href="#flavours">
                Explore Faloodas
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
              <a className="btn btn-ghost" href={SITE.contact.orderHref}>Order Now</a>
            </div>
          </div>

          <div className="story-copy" id="story">
            <p className="eyebrow">The craft</p>
            <h2 className="h2">Made <em>Layer</em> by Layer</h2>
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li className="step" key={s.key}>
                  <span className="step-n">0{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="stage-visual">
          <div className="stage-aura" aria-hidden="true" />
          <div className="sgc" ref={sgc}>
            <div className="hero-halo" aria-hidden="true" />
            <div className="sg0" data-depth="14">
              <div className="sg1" ref={sg1}>
                <div className="sg2 float" style={{ '--fy': '9px', '--fr': '0deg', '--dur': '4.4s' }}>
                  <div className="sg3">
                    <FaloodaGlass palette="rose" animated lite={SMALL} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fls front" aria-hidden="true">
        {FLOATERS.filter((f) => f.t === 'near').map((f, i) => <Floater key={i} {...f} />)}
      </div>

      <button className="skip" ref={skipBtn} type="button">Skip intro</button>

      {STEPS.map((s) => (
        <div className="chip" data-k={s.key} key={s.key} style={{ '--x': s.pos[0], '--y': s.pos[1], '--mx': s.pos[2], '--my': s.pos[3] }} aria-hidden="true">
          <div className="chip-art">{CHIPS[s.key].render()}</div>
          <span>{CHIPS[s.key].label}</span>
        </div>
      ))}
    </section>
  )
}
