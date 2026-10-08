import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SITE } from '../data/site'
import { finePointer, prefersReduced } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)
if (import.meta.env.DEV) window.__gsap = { gsap, ScrollTrigger } // dev-only: inspect the scroll system from the console

/*
  Front page. The background is generated live (no image, no video):
    far  — slow plum/berry gradient blobs
    mid  — flowing liquid ribbons whose outlines morph, plus a soft glow behind the product
    near — a canvas of drifting glow particles that lean away from the cursor
  The Falooda is a separate transparent cut-out (glass body + scoop) that GSAP builds in front of it:
  the glass rises, the liquid fills upward behind a mask, the scoop drops and settles, then the copy reveals in order
  (logo → headline word-by-word → supporting text → buttons). Scroll pins the hero, scales the product toward the camera
  and washes plum → cream into the next section.
*/
const BASE = import.meta.env.BASE_URL
const LAYER = (n) => `${BASE}assets/hero/layers/${n}.png`

// positions (percent of the shared 1080×900 crop box) written by tools/make-layers.mjs
const CUBES = [{"f": "cube-0", "style": "left:57.222%;top:30.222%;width:11.204%;height:18.111%"}, {"f": "cube-1", "style": "left:41.481%;top:32.222%;width:16.852%;height:12.556%"}, {"f": "cube-2", "style": "left:67.037%;top:37.556%;width:5.185%;height:9.556%"}, {"f": "cube-3", "style": "left:54.907%;top:38.889%;width:7.407%;height:8.889%"}, {"f": "cube-4", "style": "left:50.370%;top:43.667%;width:6.204%;height:6.778%"}, {"f": "cube-5", "style": "left:51.944%;top:45.889%;width:11.296%;height:8.444%"}, {"f": "cube-6", "style": "left:59.722%;top:46.444%;width:8.333%;height:10.333%"}]
const LOOSE = [{"f": "berry-0", "style": "left:11.481%;top:68.444%;width:22.963%;height:24.889%"}, {"f": "berry-1", "style": "left:74.630%;top:74.667%;width:21.481%;height:24.000%"}, {"f": "tcube-0", "style": "left:18.519%;top:86.111%;width:11.481%;height:12.889%"}, {"f": "tcube-1", "style": "left:69.815%;top:86.444%;width:10.741%;height:12.000%"}, {"f": "tcube-2", "style": "left:92.037%;top:82.889%;width:10.741%;height:12.444%"}] // strawberries + jelly cubes that rest beside the glass
const css = (str) => Object.fromEntries(str.split(';').filter(Boolean).map((d) => d.split(':')))
const FILL_CLIP = 'polygon(35.74% -45%, 74.44% -45%, 74.44% 26.9%, 72.87% 51.1%, 68.7% 93.3%, 41.67% 93.3%, 38.52% 51.1%, 35.74% 26.9%)' // the inside of the glass, extended upward so things can fall in from above the rim

// each ribbon has two outlines with identical commands, so GSAP can morph between them
const RIBBONS = [
  { a: 'M-100 520 C 160 380 340 640 620 500 S 1060 330 1340 470 S 1560 560 1700 480 L1700 980 L-100 980Z', b: 'M-100 470 C 180 600 360 420 640 540 S 1040 600 1340 430 S 1560 380 1700 520 L1700 980 L-100 980Z', fill: 'url(#rb1)', op: 0.55, d: 17 },
  { a: 'M-100 640 C 220 560 420 740 760 640 S 1180 520 1440 650 S 1600 700 1700 640 L1700 980 L-100 980Z', b: 'M-100 700 C 240 740 440 560 780 660 S 1160 740 1440 600 S 1600 580 1700 680 L1700 980 L-100 980Z', fill: 'url(#rb2)', op: 0.5, d: 23 },
  { a: 'M-100 300 C 180 240 380 380 700 290 S 1120 180 1400 300 S 1580 340 1700 280 L1700 -100 L-100 -100Z', b: 'M-100 260 C 200 360 400 220 720 320 S 1100 300 1400 240 S 1580 220 1700 320 L1700 -100 L-100 -100Z', fill: 'url(#rb3)', op: 0.4, d: 20 },
]

export default function Hero() {
  const root = useRef(null)
  const canvas = useRef(null)
  const still = prefersReduced()
  const [light, setLight] = useState(false)

  useLayoutEffect(() => {
    if (still) return
    const ctx = gsap.context(() => {
      gsap.set('.vh-bgfar, .vh-bgmid, .vh-glow', { opacity: 0 })
      gsap.set('.vh-prod', { yPercent: 28, scale: 0.9, rotate: 3, opacity: 0, transformPerspective: 1100, rotationX: 10 })
      // every layer starts out of the glass and builds on its own
      gsap.set('.vh-syrup', { scaleY: 0.02, opacity: 0, transformOrigin: '50% 96%' })
      gsap.set('.vh-basil', { yPercent: -70, opacity: 0 })
      gsap.set('.vh-sev', { yPercent: -60, rotate: -2.5, opacity: 0, transformOrigin: '50% 50%' })
      gsap.set('.vh-milk', { scaleY: 0.02, opacity: 0, transformOrigin: '50% 55%' })
      gsap.set('.vh-cube', { yPercent: -260, opacity: 0, rotate: () => gsap.utils.random(-25, 25), transformOrigin: '50% 50%' })
      gsap.set('.vh-loose', { yPercent: -150, opacity: 0, rotate: () => gsap.utils.random(-20, 20), transformOrigin: '50% 100%' })
      gsap.set('.vh-scoop', { yPercent: -75, opacity: 0, transformOrigin: '50% 62%' })
      gsap.set('.vh-stream', { scaleY: 0, opacity: 0, transformOrigin: '50% 0%' })
      gsap.set('.vh-logo', { clipPath: 'inset(0 100% 0 0)', x: -18, opacity: 0 })
      gsap.set('.vh-logo svg', { rotate: -140, scale: 0.3 })
      gsap.set('.vh-word', { yPercent: 125, rotate: 6 })
      gsap.set('.vh-sub', { y: 26, opacity: 0 })
      gsap.set('.vh-cta .btn', { y: 30, opacity: 0, scale: 0.94 })
    }, root)
    return () => ctx.revert()
  }, [still])

  useEffect(() => {
    const el = root.current
    const cleanups = []
    const mobile = window.innerWidth < 900
    setLight(mobile)

    /* ---------- near layer: glow particles on a canvas ---------- */
    const cv = canvas.current
    const g2 = cv.getContext('2d')
    const mouse = { x: -9999, y: -9999, nx: 0, ny: 0 }
    let W = 0, H = 0, raf = 0, visible = true
    const COUNT = still ? 0 : mobile ? 16 : 42
    const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75)
    const palette = ['255,196,150', '255,159,189', '255,244,227', '169,213,139', '255,190,59'] // warm light, rose, cream, pistachio, mango
    const parts = []
    const size = () => {
      const r = el.getBoundingClientRect()
      W = r.width; H = r.height
      cv.width = W * DPR; cv.height = H * DPR
      g2.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    size()
    for (let i = 0; i < COUNT; i++) {
      const near = Math.random()
      parts.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + near * 3.4, z: 0.3 + near, vy: -(0.06 + Math.random() * 0.2) * (0.5 + near), vx: (Math.random() - 0.5) * 0.12, c: palette[(Math.random() * palette.length) | 0], a: 0.2 + near * 0.45, ph: Math.random() * 6.28, ox: 0, oy: 0 })
    }
    let fade = still ? 1 : 0
    const draw = (t) => {
      raf = requestAnimationFrame(draw)
      if (!visible) return
      g2.clearRect(0, 0, W, H)
      fade = Math.min(1, fade + 0.006)
      for (const p of parts) {
        p.x += p.vx + Math.sin(t / 2600 + p.ph) * 0.1 * p.z
        p.y += p.vy
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W }
        // lean away from the cursor, ease back
        const dx = p.x - mouse.x, dy = p.y - mouse.y
        const d = Math.hypot(dx, dy)
        let tx = 0, ty = 0
        if (d < 170) { const k = (1 - d / 170) * 38 * p.z; tx = (dx / d) * k; ty = (dy / d) * k }
        p.ox += (tx - p.ox) * 0.07; p.oy += (ty - p.oy) * 0.07
        const px = p.x + p.ox + mouse.nx * -16 * p.z
        const py = p.y + p.oy + mouse.ny * -10 * p.z
        const tw = 0.65 + 0.35 * Math.sin(t / 1500 + p.ph)
        const rr = p.r * 4.2
        const gr = g2.createRadialGradient(px, py, 0, px, py, rr)
        gr.addColorStop(0, `rgba(${p.c},${(p.a * tw * fade).toFixed(3)})`)
        gr.addColorStop(1, `rgba(${p.c},0)`)
        g2.fillStyle = gr
        g2.beginPath(); g2.arc(px, py, rr, 0, 6.283); g2.fill()
      }
    }
    if (COUNT) raf = requestAnimationFrame(draw)
    const onResize = () => size()
    window.addEventListener('resize', onResize)
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.01 })
    io.observe(el)
    cleanups.push(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); io.disconnect() })

    if (still) return () => cleanups.forEach((f) => f())

    /* ---------- far + mid layers: slow, endless motion ---------- */
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.vh-blob').forEach((b, i) => {
        gsap.to(b, { x: `random(-90, 90)`, y: `random(-60, 60)`, scale: `random(0.9, 1.25)`, duration: 16 + i * 4, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true })
      })
      gsap.utils.toArray('.vh-rib path').forEach((p, i) => {
        gsap.to(p, { attr: { d: RIBBONS[i].b }, duration: RIBBONS[i].d, ease: 'sine.inOut', repeat: -1, yoyo: true })
      })
      gsap.to('.vh-glow', { scale: 1.08, duration: 5, ease: 'sine.inOut', repeat: -1, yoyo: true })
      gsap.to('.vh-float', { y: -12, duration: 3.6, ease: 'sine.inOut', repeat: -1, yoyo: true })
    }, el)
    cleanups.push(() => ctx.revert())

    /* ---------- the opening: the Falooda is built over the background, then the copy ---------- */
    const intro = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'none' } })
      tl.to('.vh-bgfar', { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0)
        .to('.vh-bgmid', { opacity: 1, duration: 1.8, ease: 'power2.out' }, 0.2)
        .to('.vh-glow', { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0.5)
        // 1 — the empty glass rises (translate, rotate, 3D tilt, scale)
        .to('.vh-prod', { yPercent: 0, scale: 1, rotate: 0, rotationX: 0, opacity: 1, duration: 1.7, ease: 'expo.out' }, 0.5)
        // 2 — rose syrup: a thick stream pours in and the syrup layer swells up from the bottom of the glass
        .to('.vh-stream.sy', { scaleY: 1, opacity: 1, duration: 0.45, ease: 'power1.in' }, 1.5)
        .to('.vh-syrup', { scaleY: 1, opacity: 1, duration: 1.1, ease: 'power2.out' }, 1.8)
        .to('.vh-stream.sy', { opacity: 0, duration: 0.35 }, 2.5)
        // 3 — basil seeds drop and sink into place
        .to('.vh-basil', { yPercent: 0, opacity: 1, duration: 0.75, ease: 'power2.in' }, 2.6)
        .to('.vh-basil', { yPercent: -1.5, duration: 0.12, ease: 'power1.out' }, 3.35)
        .to('.vh-basil', { yPercent: 0, duration: 0.14, ease: 'power1.in' }, 3.47)
        // 4 — falooda sev drops in as a tangle and lands
        .to('.vh-sev', { yPercent: 0, rotate: 0, opacity: 1, duration: 0.8, ease: 'power2.in' }, 3.2)
        .to('.vh-sev', { yPercent: -1.2, duration: 0.1, ease: 'power1.out' }, 4.0)
        .to('.vh-sev', { yPercent: 0, duration: 0.12, ease: 'power1.in' }, 4.1)
        // 5 — milk: a cream stream, then the milk layer fills upward through everything below
        .to('.vh-stream.mk', { scaleY: 1, opacity: 1, duration: 0.45, ease: 'power1.in' }, 4.0)
        .to('.vh-milk', { scaleY: 1, opacity: 1, duration: 1.4, ease: 'power1.inOut' }, 4.35)
        .to('.vh-stream.mk', { opacity: 0, duration: 0.35 }, 5.3)
        // 6 — jelly cubes fall in one after another, each with its own squash on landing
        .to('.vh-cube', { yPercent: 0, opacity: 1, rotate: 0, duration: 0.7, stagger: 0.14, ease: 'power2.in' }, 5.5)
        .to('.vh-cube', { scaleY: 0.86, scaleX: 1.08, duration: 0.07, stagger: 0.14, ease: 'power1.out' }, 6.2)
        .to('.vh-cube', { scaleY: 1, scaleX: 1, duration: 0.2, stagger: 0.14, ease: 'power1.inOut' }, 6.27)
        // 7 — strawberries and the loose jelly cubes tumble down beside the glass and bounce once
        .to('.vh-loose', { yPercent: 0, opacity: 1, rotate: 0, duration: 0.75, stagger: 0.12, ease: 'power2.in' }, 6.4)
        .to('.vh-loose', { yPercent: -7, duration: 0.15, stagger: 0.12, ease: 'power1.out' }, 7.15)
        .to('.vh-loose', { yPercent: 0, duration: 0.18, stagger: 0.12, ease: 'power1.in' }, 7.3)
        // 8 — the ice-cream scoop drops onto the top, squashes, settles
        .to('.vh-scoop', { yPercent: 0, opacity: 1, duration: 0.8, ease: 'power2.in' }, 7.3)
        .to('.vh-scoop', { scaleY: 0.93, scaleX: 1.04, duration: 0.08, ease: 'power1.out' }, 8.1)
        .to('.vh-scoop', { scaleY: 1.02, scaleX: 0.99, duration: 0.12, ease: 'power1.out' }, 8.18)
        .to('.vh-scoop', { scaleY: 1, scaleX: 1, duration: 0.16, ease: 'power1.inOut' }, 8.3)
        // 4 — copy, strictly in order, once the dessert is finished
        .to('.vh-logo', { clipPath: 'inset(0 0% 0 0)', x: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }, 8.3)
        .to('.vh-logo svg', { rotate: 0, scale: 1, duration: 1.2, ease: 'expo.out' }, 8.3)
        .to('.vh-word', { yPercent: 0, rotate: 0, duration: 1.25, stagger: 0.16, ease: 'expo.out' }, 8.8)
        .to('.vh-sub', { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, 9.7)
        .to('.vh-cta .btn', { y: 0, opacity: 1, scale: 1, duration: 0.9, stagger: 0.14, ease: 'power3.out' }, 10.1)
      // anything the visitor does fast-forwards the opening
      const skip = () => tl.timeScale(5)
      ;['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((e) => window.addEventListener(e, skip, { passive: true, once: true }))
      cleanups.push(() => ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((e) => window.removeEventListener(e, skip)))
      tl.timeScale(2.0)
      if (import.meta.env.DEV) { window.__hero = { tl }; if (new URLSearchParams(window.location.search).has('hold')) tl.pause() } // dev-only: step frames
    }, el)
    cleanups.push(() => intro.revert())

    /* ---------- scroll: pin, scale the product toward the camera, wash plum → cream ---------- */
    const sc = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: () => `+=${Math.round(window.innerHeight * (mobile ? 0.55 : 0.75))}`, pin: true, pinSpacing: false, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true }, // pinSpacing off: the next section rises over the pinned hero (no empty screen)
      })
      tl.to('.vh-copy', { y: -90, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
        .to('.vh-scale', { scale: mobile ? 1.25 : 1.4, y: mobile ? 0 : 30, duration: 1, transformOrigin: '50% 60%' }, 0)
        .to('.vh-bgfar', { yPercent: -10, scale: 1.12, duration: 1 }, 0)
        .to('.vh-bgmid', { yPercent: -16, duration: 1 }, 0)
    }, el)
    cleanups.push(() => sc.revert())

    /* ---------- cursor parallax: each layer moves a different amount ---------- */
    if (finePointer()) {
      const q = (s, d) => [gsap.quickTo(s, 'x', { duration: d, ease: 'power3.out' }), gsap.quickTo(s, 'y', { duration: d, ease: 'power3.out' })]
      const far = q('.vh-bgfar', 2), mid = q('.vh-bgmid', 1.6), glow = q('.vh-glow', 1.4), prod = q('.vh-parallax', 1.2), near = q('.vh-near', 1), copy = q('.vh-grid', 1.2)
      const move = (e) => {
        const r = el.getBoundingClientRect()
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top
        if (window.scrollY > window.innerHeight * 0.5) return
        const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5
        mouse.nx = nx; mouse.ny = ny
        far[0](-nx * 24); far[1](-ny * 16)
        mid[0](-nx * 46); mid[1](-ny * 30)
        glow[0](-nx * 70); glow[1](-ny * 50)
        prod[0](nx * 14); prod[1](ny * 9)
        near[0](nx * 18); near[1](ny * 10) // foreground pieces move more than the glass: depth
        copy[0](nx * 8); copy[1](ny * 5)
      }
      const leave = () => { mouse.x = mouse.y = -9999 }
      window.addEventListener('pointermove', move, { passive: true })
      el.addEventListener('pointerleave', leave)
      cleanups.push(() => { window.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) })
    }
    return () => cleanups.forEach((f) => f())
  }, [still])

  return (
    <section className={`vhero${still ? ' still' : ''}${light ? ' lite' : ''}`} id="top" ref={root}>
      {/* far: gradient blobs */}
      <div className="vh-bgfar" aria-hidden="true">
        <i className="vh-blob b1" /><i className="vh-blob b2" /><i className="vh-blob b3" /><i className="vh-blob b4" />
      </div>
      {/* mid: liquid ribbons */}
      <svg className="vh-bgmid vh-rib" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="rb1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7a2a62" /><stop offset=".55" stopColor="#c73b72" /><stop offset="1" stopColor="#f0709b" /></linearGradient>
          <linearGradient id="rb2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3d1237" /><stop offset=".6" stopColor="#8a2f66" /><stop offset="1" stopColor="#4a1942" /></linearGradient>
          <linearGradient id="rb3" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#a9d58b" stopOpacity=".5" /><stop offset=".5" stopColor="#6b2a5a" stopOpacity=".6" /><stop offset="1" stopColor="#ffbe3b" stopOpacity=".4" /></linearGradient>
        </defs>
        {RIBBONS.map((r, i) => <path key={i} d={r.a} fill={r.fill} opacity={r.op} />)}
      </svg>
      <div className="vh-glow" aria-hidden="true" />
      {/* near: particles */}
      <canvas className="vh-parts" ref={canvas} aria-hidden="true" />

      {/* product — separate transparent layers (cut from photographs), built step by step in front of the background */}
      <div className="vh-stage" aria-hidden="true">
        <div className="vh-parallax">
          <div className="vh-scale">
            <div className="vh-prod">
              <div className="vh-float">
                <div className="vh-shadow" />
                <div className="vh-liq" style={{ clipPath: FILL_CLIP }}>
                  <img className="vh-l vh-syrup" src={LAYER('syrup')} alt="" decoding="async" />
                  <img className="vh-l vh-basil" src={LAYER('basil')} alt="" decoding="async" />
                  <img className="vh-l vh-sev" src={LAYER('sev')} alt="" decoding="async" />
                  <img className="vh-l vh-milk" src={LAYER('milk')} alt="" decoding="async" />
                  {CUBES.map((c) => (
                    <img key={c.f} className="vh-p vh-cube" src={LAYER(c.f)} alt="" decoding="async" style={css(c.style)} />
                  ))}
                </div>
                <i className="vh-stream sy" />
                <i className="vh-stream mk" />
                <img className="vh-l vh-glass" src={LAYER('glass')} alt="" decoding="async" fetchPriority="high" />
                <div className="vh-near">
                  {LOOSE.map((c) => (
                    <img key={c.f} className="vh-p vh-loose" src={LAYER(c.f)} alt="" decoding="async" style={css(c.style)} />
                  ))}
                </div>
                <img className="vh-l vh-scoop" src={LAYER('scoop')} alt="" decoding="async" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="vh-shade" aria-hidden="true" />

      <div className="wrap vh-grid">
        <div className="vh-copy">
          <p className="vh-logo" aria-label="LUMA">
            <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
              <path d="M5 6h22l-4 13c-1 3-4 5-7 5s-6-2-7-5z" fill="#fff" fillOpacity=".25" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7 12h18l-1.4 5c-.8 2.6-3.7 4.4-7.6 4.4S9.2 19.6 8.4 17z" fill="#F0709B" />
              <path d="M8.6 17h14.8c-.9 2.6-3.7 4.4-7.4 4.4S9.5 19.6 8.6 17z" fill="#A9D58B" />
              <circle cx="16" cy="5" r="3" fill="#FFBE3B" />
              <path d="M16 24v5M11 29h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>LUMA</span>
          </p>
          <h1 aria-label="Layers of Happiness.">
            <span className="vh-line" aria-hidden="true">
              <span className="vh-mask"><span className="vh-word">Layers</span></span>{' '}
              <span className="vh-mask"><span className="vh-word">of</span></span>
            </span>
            <span className="vh-line" aria-hidden="true">
              <span className="vh-mask"><span className="vh-word"><em>Happiness.</em></span></span>
            </span>
          </h1>
          <p className="vh-sub">Creamy. Colourful. Refreshingly unforgettable.</p>
          <div className="vh-cta">
            <a className="btn btn-rose" href="#flavours">
              Explore Faloodas
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a className="btn btn-glass" href={SITE.contact.orderHref}>Order Now</a>
          </div>
        </div>
      </div>

    </section>
  )
}
