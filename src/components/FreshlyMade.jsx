import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ING } from './Ingredients'
import { prefersReduced, splitWords } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)

const BASE = import.meta.env.BASE_URL
const frameUrl = (n) => `${BASE}hero-frames/ezgif-frame-${String(n).padStart(3, '0')}.jpg`
// the same photographic build as the hero (0 = empty glass … 30 = finished), minus the frames with double-exposure defects
const SKIP = new Set([13, 14, 15, 16, 29])
const SEQ = [0, ...Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => !SKIP.has(n))]
const CROP = { x: 780, w: 800, h: 1080 } // the glass column of the 1920×1080 frame

// source-frame ranges of each stage of the build (read off the sequence)
const STEPS = [
  { k: 'syrup', label: 'Syrup swirl', text: 'Rose-red syrup swirls into the bottom of a chilled glass.', to: 5 },
  { k: 'milk', label: 'Milk pour', text: 'Cold milk is poured over, folding into the syrup.', to: 12 },
  { k: 'fruit', label: 'Jelly & fruit', text: 'Ruby jelly, basil seeds and fruit pieces tumble through.', to: 20 },
  { k: 'scoop', label: 'Ice cream scoop', text: 'A slow-churned scoop lands on top.', to: 26 },
  { k: 'top', label: 'Nuts & toppings', text: 'Crowned with nuts, petals and fresh berries.', to: 30 },
]
const stepAt = (src) => STEPS.findIndex((s) => src <= s.to)

// ingredients that join each stage: [stage, component, left %, top %, size px, speed]
const SPRITES = [
  [0, ING.berry, 46, 66, 70, 1.2], [1, ING.basil, 90, 26, 46, 1.6], [2, ING.jelly, 44, 24, 62, 1],
  [2, ING.jelly, 88, 72, 52, 1.8], [3, ING.cherry, 70, 10, 48, 1.4], [4, ING.pistachio, 50, 82, 54, 1.7],
  [4, ING.almond, 92, 50, 56, 1.1], [4, ING.petal, 42, 44, 56, 2],
]

/*
  "Freshly Made. Layer by Layer." — the glass is built by your scroll. The photographic build-up (the same sequence as the hero) is
  scrubbed on a canvas, so scrolling down pours, swirls and scoops it, and scrolling up undoes it. Frames are fetched when the
  section is approaching and decoded at the size they are drawn (cropped to the glass), so it stays light.
*/
export default function FreshlyMade() {
  const root = useRef(null)
  const cv = useRef(null)

  useLayoutEffect(() => {
    const el = root.current
    splitWords(el.querySelector('.fm-title'))
    const c = cv.current
    const fx = c.getContext('2d')
    const reduced = prefersReduced()
    const mobile = window.innerWidth < 900
    let alive = true
    let bms = []
    const state = { p: reduced ? 1 : 0 }
    let w = 0, h = 0

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)
      w = Math.round(c.offsetWidth * dpr); h = Math.round(c.offsetHeight * dpr)
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
    }
    const draw = () => {
      if (!bms.length) return
      size()
      const f = gsap.utils.clamp(0, bms.length - 1, state.p * (bms.length - 1))
      const k = Math.min(bms.length - 2, Math.floor(f)), a = f - k
      fx.clearRect(0, 0, w, h)
      const A = bms[k], B = bms[k + 1]
      if (A) fx.drawImage(A, 0, 0, w, h)
      if (B && a > 0.003) { fx.globalAlpha = a; fx.drawImage(B, 0, 0, w, h); fx.globalAlpha = 1 }
    }
    const setStep = (p) => {
      const idx = gsap.utils.clamp(0, SEQ.length - 1, Math.round(p * (SEQ.length - 1)))
      const s = Math.max(0, stepAt(SEQ[idx]))
      el.querySelectorAll('.fm-steps li').forEach((li, i) => li.classList.toggle('on', i === s)); el.querySelectorAll('.fm-steps li').forEach((li, i) => li.classList.toggle('done', i < s))
      el.style.setProperty('--fm-p', p.toFixed(3))
      const now = el.querySelector('.fm-now')
      if (now && now.dataset.i !== String(s)) {
        now.dataset.i = String(s)
        now.querySelector('b').textContent = STEPS[s].label
        now.querySelector('span').textContent = STEPS[s].text
      }
    }

    let loading = false
    const load = async () => {
      if (loading) return
      loading = true
      try {
        size()
        const bw = Math.max(2, Math.min(720, w)), bh = Math.max(2, Math.round((bw * CROP.h) / CROP.w))
        const blobs = await Promise.all(SEQ.map((n) => fetch(frameUrl(n)).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))))
        const out = []
        for (const b of blobs) { // decoded one by one so the main thread is never blocked for long
          if (!alive) return
          out.push(await createImageBitmap(b, CROP.x, 0, CROP.w, CROP.h, { resizeWidth: bw, resizeHeight: bh, resizeQuality: 'high' }))
        }
        if (!alive) { out.forEach((b) => b.close()); return }
        bms = out
        draw()
        el.classList.add('fm-ready')
      } catch {
        loading = false
      }
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: el, start: 'top 300%', once: true, onEnter: load })
      if (reduced) { // static: the finished glass, no pin
        el.classList.add('fm-static')
        load().then(() => { state.p = 1; draw(); setStep(1) })
        return
      }
      gsap.from(el.querySelectorAll('.fm-title .wi'), { yPercent: 118, rotate: 5, transformOrigin: '0 100%', duration: 1.1, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 75%', toggleActions: 'play none none reverse' } })
      gsap.fromTo('.fm-stage', { scale: 0.88, y: 70 }, { scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: 0.6 } })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el, start: 'top top', pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
          end: () => `+=${Math.round(window.innerHeight * (mobile ? 2.4 : 3.2))}`,
        },
      })
      tl.to(state, { p: 1, duration: 1, onUpdate: () => { draw(); setStep(state.p) } }, 0)
      // ingredients join the scene as their stage is reached, then keep drifting with the scroll
      const total = SEQ.length - 1
      const stageStart = [0, 5, 12, 20, 26].map((src) => SEQ.findIndex((n) => n >= src) / total)
      el.querySelectorAll('.fm-sp').forEach((s, i) => {
        const [stage, , , , , sp] = SPRITES[i]
        const at = stageStart[stage] * 0.98
        tl.fromTo(s, { y: -300 * (mobile ? 0.6 : 1), opacity: 0, scale: 0.4, rotate: -80 }, { y: 0, opacity: 1, scale: 1, rotate: 0, ease: 'power2.out', duration: 0.09 }, at)
        tl.to(s.firstChild, { y: -90 * sp * (mobile ? 0.5 : 1), rotate: 40 * sp, duration: 1 - at, ease: 'none' }, at + 0.09)
      })
      tl.fromTo('.fm-bar i', { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
    }, el)
    setStep(state.p)
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize); ctx.revert(); bms.forEach((b) => b.close()) }
  }, [])

  return (
    <section className="scene fm" id="fresh" ref={root}>
      <div className="fm-bg" aria-hidden="true"><i /><i /></div>
      <div className="wrap fm-wrap">
        <div className="fm-head">
          <p className="eyebrow light">The making</p>
          <h2 className="h2 fm-title" data-split>Freshly Made. <em>Layer by Layer.</em></h2>
        </div>
        <ol className="fm-steps" aria-label="How it is made">
          {STEPS.map((s, i) => (
            <li key={s.k} className={i ? '' : 'on'}><b>0{i + 1}</b><div><strong>{s.label}</strong><p>{s.text}</p></div></li>
          ))}
        </ol>
        <div className="fm-now" aria-hidden="true" data-i="0"><b>{STEPS[0].label}</b><span>{STEPS[0].text}</span></div>
        <div className="fm-bar" aria-hidden="true"><i /></div>
        <div className="fm-stage" aria-hidden="true">
          <canvas className="fm-canvas" ref={cv} />
          {SPRITES.map(([, C, x, y, s], i) => (
            <div className="fm-sp" key={i} style={{ left: `${x}%`, top: `${y}%`, width: s }}><div><C /></div></div>
          ))}
        </div>
      </div>
    </section>
  )
}
