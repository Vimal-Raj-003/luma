import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SITE } from '../data/site'
import { finePointer, prefersReduced } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)
if (import.meta.env.DEV) window.__gsap = { gsap, ScrollTrigger } // dev-only: inspect the scroll system from the console

/*
  Front page.
  Background (code): slow gradient blobs, morphing liquid ribbons, glow, and a cursor-reactive particle canvas.
  Product: a 30-frame photographic sequence, played on a <canvas> by requestAnimationFrame (not an <img> slideshow, not setInterval):
    - all frames are fetched before playback starts; they are decoded just ahead of the playhead (small memory footprint)
    - neighbouring frames are cross-blended at the display's refresh rate, so there are no visible frame jumps
    - frames with defects (see SKIP) are left out; the final frame is held, then the page stays on it (no jarring loop)
  Copy reveals once the dessert is nearly finished. Scroll pins the hero and the next section rises over it.
*/
const BASE = import.meta.env.BASE_URL
const frameUrl = (n) => `${BASE}hero-frames/ezgif-frame-${String(n).padStart(3, '0')}.jpg`
const COUNT = 30
const FINAL = 30

// Frames 13–16: the table strawberries/jelly turn into semi-transparent double exposures, then vanish. 29: blurred transition frame.
const SKIP = new Set([13, 14, 15, 16, 29])
const SEQ = Array.from({ length: COUNT }, (_, i) => i + 1).filter((n) => !SKIP.has(n))
// seconds to dissolve from SEQ[i] to SEQ[i+1]: longer where the source jumps (12→17 gap, 28→30 content change)
const STEP = SEQ.map((n, i) => (i === SEQ.length - 1 ? 0 : n === 12 ? 0.34 : n === 28 ? 0.5 : n < 12 ? 0.12 : 0.16))
const T = STEP.reduce((acc, s, i) => (acc.push(i ? acc[i - 1] + STEP[i - 1] : 0), acc), [])
const DURATION = T[T.length - 1] // time at which the last frame is reached
const REVEAL_AT = DURATION - 0.9
// where the glass sits in the 1920×1080 frames (fraction of width) — used to frame it right-of-centre without distortion
const GLASS_X = 0.61

// each ribbon has two outlines with identical commands, so GSAP can morph between them
const RIBBONS = [
  { a: 'M-100 520 C 160 380 340 640 620 500 S 1060 330 1340 470 S 1560 560 1700 480 L1700 980 L-100 980Z', b: 'M-100 470 C 180 600 360 420 640 540 S 1040 600 1340 430 S 1560 380 1700 520 L1700 980 L-100 980Z', fill: 'url(#rb1)', op: 0.55, d: 17 },
  { a: 'M-100 640 C 220 560 420 740 760 640 S 1180 520 1440 650 S 1600 700 1700 640 L1700 980 L-100 980Z', b: 'M-100 700 C 240 740 440 560 780 660 S 1160 740 1440 600 S 1600 580 1700 680 L1700 980 L-100 980Z', fill: 'url(#rb2)', op: 0.5, d: 23 },
  { a: 'M-100 300 C 180 240 380 380 700 290 S 1120 180 1400 300 S 1580 340 1700 280 L1700 -100 L-100 -100Z', b: 'M-100 260 C 200 360 400 220 720 320 S 1100 300 1400 240 S 1580 220 1700 320 L1700 -100 L-100 -100Z', fill: 'url(#rb3)', op: 0.4, d: 20 },
]

export default function Hero() {
  const root = useRef(null)
  const parts = useRef(null) // particle canvas
  const frames = useRef(null) // product canvas
  const revealed = useRef(false)
  const still = prefersReduced()
  const [light, setLight] = useState(false)

  useLayoutEffect(() => {
    if (still) return
    const ctx = gsap.context(() => {
      gsap.set('.vh-bgfar, .vh-bgmid, .vh-glow', { opacity: 0 })
      gsap.set('.vh-frames', { opacity: 0 })
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

    /* ---------- near layer: glow particles ---------- */
    const cv = parts.current
    const g2 = cv.getContext('2d')
    const mouse = { x: -9999, y: -9999, nx: 0, ny: 0 }
    let W = 0, H = 0, raf = 0, visible = true
    const PCOUNT = still ? 0 : mobile ? 14 : 38
    const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75)
    const palette = ['255,196,150', '255,159,189', '255,244,227', '169,213,139', '255,190,59']
    const pts = []
    const size = () => {
      const r = el.getBoundingClientRect()
      W = r.width; H = r.height
      cv.width = W * DPR; cv.height = H * DPR
      g2.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    size()
    for (let i = 0; i < PCOUNT; i++) {
      const near = Math.random()
      pts.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + near * 3.4, z: 0.3 + near, vy: -(0.06 + Math.random() * 0.2) * (0.5 + near), vx: (Math.random() - 0.5) * 0.12, c: palette[(Math.random() * palette.length) | 0], a: 0.2 + near * 0.45, ph: Math.random() * 6.28, ox: 0, oy: 0 })
    }
    let fade = still ? 1 : 0
    const draw = (t) => {
      raf = requestAnimationFrame(draw)
      if (!visible) return
      g2.clearRect(0, 0, W, H)
      fade = Math.min(1, fade + 0.006)
      for (const p of pts) {
        p.x += p.vx + Math.sin(t / 2600 + p.ph) * 0.1 * p.z
        p.y += p.vy
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W }
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
    if (PCOUNT) raf = requestAnimationFrame(draw)
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.01 })
    io.observe(el)
    cleanups.push(() => { cancelAnimationFrame(raf); io.disconnect() })

    /* ---------- copy: logo → headline word-by-word → supporting text → buttons ---------- */
    const reveal = () => {
      if (revealed.current) return
      revealed.current = true
      if (still) return
      gsap.timeline()
        .to('.vh-word', { yPercent: 0, rotate: 0, duration: 1.25, stagger: 0.16, ease: 'expo.out' }, 0)
        .to('.vh-sub', { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, 0.8)
        .to('.vh-cta .btn', { y: 0, opacity: 1, scale: 1, duration: 0.9, stagger: 0.14, ease: 'power3.out' }, 1.2)
    }

    /* ---------- product: frame-sequence player ---------- */
    const fc = frames.current
    const fx = fc.getContext('2d')
    let FW = 0, FH = 0, fdpr = 1
    let geo = null // placement of the 1920×1080 frame inside the canvas (css px)
    const layout = () => {
      FW = fc.offsetWidth; FH = fc.offsetHeight // layout size: unaffected by the scroll scale / parallax transforms above it
      fdpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2)
      fc.width = Math.round(FW * fdpr); fc.height = Math.round(FH * fdpr)
      const portrait = FW / FH < 1.1
      // never stretched: one uniform scale. Desktop fits ~90% of the height, phones fit the glass and crop the sides.
      const s = (portrait ? 0.94 : 0.86) * (FH / 1080)
      const frameW = 1920 * s, frameH = 1080 * s
      const targetX = portrait ? FW / 2 : FW * 0.735
      let ox = targetX - GLASS_X * frameW
      if (portrait) ox = frameW >= FW ? Math.min(0, Math.max(FW - frameW, ox)) : Math.min(FW - frameW, Math.max(0, ox))
      // desktop: the glass keeps its place right of centre even if the frame's right edge runs past the hero (cropped bokeh only)
      const oy = portrait ? FH * 0.04 : FH - frameH
      // the part of the frame that is actually on screen (in source pixels) → decode only that, at output resolution
      const vx0 = Math.max(0, -ox), vx1 = Math.min(frameW, FW - ox)
      // soft edges follow the real frame edges (css custom properties used by the mask in CSS), so no photographic rectangle shows
      fc.style.setProperty('--fx0', ox + 'px'); fc.style.setProperty('--fx1', ox + frameW + 'px'); fc.style.setProperty('--fw', frameW + 'px')
      fc.style.setProperty('--fy0', oy + 'px'); fc.style.setProperty('--fy1', oy + frameH + 'px'); fc.style.setProperty('--fh', frameH + 'px')
      fc.style.setProperty('--fb', portrait ? '0.2' : '0.06')
      geo = { s, ox, oy, sx: Math.floor(vx0 / s), sw: Math.ceil((vx1 - vx0) / s), dx: Math.max(0, ox), dw: vx1 - vx0, dh: frameH }
    }

    let blobs = new Map() // frame number → Blob (all fetched up front)
    let cache = new Map() // frame number → ImageBitmap | Promise
    let alive = true, started = false, done = false
    let tPlay = 0, lastNow = 0, prx = 0, manual = false

    const decode = (n) => {
      if (cache.has(n)) return cache.get(n)
      const blob = blobs.get(n)
      if (!blob) return null
      const pr = createImageBitmap(blob, geo.sx, 0, geo.sw, 1080, { resizeWidth: Math.max(2, Math.round(geo.dw * fdpr)), resizeHeight: Math.max(2, Math.round(geo.dh * fdpr)), resizeQuality: 'high' })
        .then((bm) => { if (alive && cache.get(n) === pr) cache.set(n, bm); else bm.close(); return bm })
        .catch(() => null)
      cache.set(n, pr)
      return pr
    }
    const bitmap = (n) => { const v = cache.get(n); return v && typeof v.close === 'function' ? v : null }
    const window_ = (k) => { // decode a few frames ahead of the playhead, free the ones behind it
      const keep = new Set()
      for (let i = Math.max(0, k - 1); i <= Math.min(SEQ.length - 1, k + 6); i++) { keep.add(SEQ[i]); decode(SEQ[i]) }
      keep.add(SEQ[SEQ.length - 1])
      for (const [n, v] of cache) if (!keep.has(n)) { if (v && typeof v.close === 'function') v.close(); cache.delete(n) }
    }
    const paint = (t) => {
      let k = 0
      while (k < SEQ.length - 1 && T[k + 1] <= t) k++
      const a = k === SEQ.length - 1 ? 0 : Math.min(1, (t - T[k]) / STEP[k]) // linear: a constant-rate dissolve reads as motion, not pulsing
      window_(k)
      const A = bitmap(SEQ[k]) || bitmap(SEQ[Math.max(0, k - 1)])
      fx.clearRect(0, 0, fc.width, fc.height)
      if (!A) return false
      const dx = geo.dx * fdpr, dy = geo.oy * fdpr, dw = geo.dw * fdpr, dh = geo.dh * fdpr
      fx.globalAlpha = 1
      fx.drawImage(A, dx, dy, dw, dh)
      const B = a > 0.003 ? bitmap(SEQ[k + 1]) : null
      if (B) { fx.globalAlpha = a; fx.drawImage(B, dx, dy, dw, dh); fx.globalAlpha = 1 }
      return true
    }
    const tick = (now) => {
      if (!alive) return
      frameRaf = requestAnimationFrame(tick)
      if (manual) return
      const dt = Math.min(0.1, (now - lastNow) / 1000) // a tab that was asleep must not skip the show
      lastNow = now
      if (!visible) return
      tPlay += dt
      const t = Math.min(DURATION, tPlay)
      paint(t)
      if (tPlay >= REVEAL_AT) reveal()
      if (tPlay >= DURATION + 0.2) {
        done = true // hold the final frame: no loop (a dessert vanishing back to an empty glass looks unnatural)
        paint(DURATION)
        cancelAnimationFrame(frameRaf)
        // a very slow "breathing" so the held frame is not dead
        gsap.to('.vh-breathe', { scale: 1.018, duration: 9, ease: 'sine.inOut', repeat: -1, yoyo: true })
      }
    }
    let frameRaf = 0
    const fetchBlob = (n) => fetch(frameUrl(n)).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status))))).then((b) => blobs.set(n, b))

    const start = async () => {
      layout()
      if (still) {
        // reduced motion / fallback: just the final frame, as a static image
        await fetchBlob(FINAL)
        const bm = await decode(FINAL)
        if (alive && bm) { cache.set(FINAL, bm); const dx = geo.dx * fdpr; fx.drawImage(bm, dx, geo.oy * fdpr, geo.dw * fdpr, geo.dh * fdpr) }
        revealed.current = true
        return
      }
      try {
        await Promise.all(SEQ.map(fetchBlob)) // preload every frame before starting
        if (!alive) return
        await Promise.all(SEQ.slice(0, 8).map(decode))
        if (!alive) return
        started = true
        paint(0)
        gsap.to('.vh-frames', { opacity: 1, duration: 0.8, ease: 'power2.out' })
        lastNow = performance.now()
        frameRaf = requestAnimationFrame(tick)
      } catch {
        // fallback: the final frame, still
        try {
          await fetchBlob(FINAL)
          const bm = await decode(FINAL)
          if (alive && bm) { fx.drawImage(bm, geo.dx * fdpr, geo.oy * fdpr, geo.dw * fdpr, geo.dh * fdpr); gsap.to('.vh-frames', { opacity: 1, duration: 0.6 }) }
        } catch { /* nothing more we can do: the code-built background and the copy still show */ }
        reveal()
      }
    }
    start()
    // never leave the page without its headline if loading is slow
    const safety = setTimeout(reveal, 9000)
    let lw = window.innerWidth, lh = window.innerHeight
    const onResize = () => {
      // phones fire resize when the address bar slides: ignore small height changes
      if (window.innerWidth === lw && Math.abs(window.innerHeight - lh) < 140) return
      lw = window.innerWidth; lh = window.innerHeight
      size()
      if (!geo) return
      layout()
      for (const [, v] of cache) if (v && typeof v.close === 'function') v.close()
      cache = new Map()
      if (started || still) {
        const t = done ? DURATION : Math.min(DURATION, tPlay)
        Promise.all([decode(SEQ[SEQ.length - 1])]).then(() => paint(t))
        window_(0)
      }
    }
    window.addEventListener('resize', onResize)
    cleanups.push(() => { alive = false; clearTimeout(safety); cancelAnimationFrame(frameRaf); window.removeEventListener('resize', onResize); for (const [, v] of cache) if (v && typeof v.close === 'function') v.close(); cache = new Map(); blobs = new Map() })

    if (still) return () => cleanups.forEach((f) => f())

    /* ---------- far + mid layers: slow, endless motion ---------- */
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.vh-blob').forEach((b, i) => {
        gsap.to(b, { x: 'random(-90, 90)', y: 'random(-60, 60)', scale: 'random(0.9, 1.25)', duration: 16 + i * 4, ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true })
      })
      gsap.utils.toArray('.vh-rib path').forEach((p, i) => {
        gsap.to(p, { attr: { d: RIBBONS[i].b }, duration: RIBBONS[i].d, ease: 'sine.inOut', repeat: -1, yoyo: true })
      })
      gsap.to('.vh-glow', { scale: 1.08, duration: 5, ease: 'sine.inOut', repeat: -1, yoyo: true })
      gsap.to('.vh-bgfar', { opacity: 1, duration: 1.4, ease: 'power2.out' })
      gsap.to('.vh-bgmid', { opacity: 1, duration: 1.8, ease: 'power2.out', delay: 0.2 })
      gsap.to('.vh-glow', { opacity: 1, duration: 1.6, ease: 'power2.out', delay: 0.4 })
    }, el)
    cleanups.push(() => ctx.revert())

    /* ---------- scroll: pin, scale the product toward the camera; the next section rises over the hero ---------- */
    const sc = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: 'top top', end: () => `+=${Math.round(window.innerHeight * (mobile ? 0.55 : 0.75))}`, pin: true, pinSpacing: false, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
      })
      tl.to('.vh-copy', { y: -90, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
        .to('.vh-scale', { scale: mobile ? 1.18 : 1.3, y: mobile ? 0 : 20, duration: 1, transformOrigin: mobile ? '50% 60%' : '70% 70%' }, 0)
        .to('.vh-bgfar', { yPercent: -10, scale: 1.12, duration: 1 }, 0)
        .to('.vh-bgmid', { yPercent: -16, duration: 1 }, 0)
    }, el)
    cleanups.push(() => sc.revert())

    /* ---------- cursor parallax: each layer moves a different amount ---------- */
    if (finePointer()) {
      const q = (s, d) => [gsap.quickTo(s, 'x', { duration: d, ease: 'power3.out' }), gsap.quickTo(s, 'y', { duration: d, ease: 'power3.out' })]
      const far = q('.vh-bgfar', 2), mid = q('.vh-bgmid', 1.6), glow = q('.vh-glow', 1.4), prod = q('.vh-parallax', 1.2), copy = q('.vh-grid', 1.2)
      const move = (e) => {
        const r = el.getBoundingClientRect()
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top
        if (window.scrollY > window.innerHeight * 0.5) return
        const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5
        mouse.nx = nx; mouse.ny = ny
        far[0](-nx * 24); far[1](-ny * 16)
        mid[0](-nx * 46); mid[1](-ny * 30)
        glow[0](-nx * 70); glow[1](-ny * 50)
        prod[0](nx * 12); prod[1](ny * 8)
        copy[0](nx * 8); copy[1](ny * 5)
      }
      const leave = () => { mouse.x = mouse.y = -9999 }
      window.addEventListener('pointermove', move, { passive: true })
      el.addEventListener('pointerleave', leave)
      cleanups.push(() => { window.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) })
    }
    void prx
    if (import.meta.env.DEV) window.__hero = {
        get t() { return tPlay }, get done() { return done }, get decoded() { return [...cache.values()].filter((v) => v && typeof v.close === "function").length }, duration: DURATION, seq: SEQ, skip: [...SKIP], steps: STEP,
        // deterministic rendering for verification: pause the clock, decode what is needed, paint exactly time t
        seek: async (t) => {
          manual = true
          let k = 0
          while (k < SEQ.length - 1 && T[k + 1] <= t) k++
          await Promise.all([decode(SEQ[k]), decode(SEQ[Math.min(SEQ.length - 1, k + 1)])])
          return paint(t)
        },
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
      <canvas className="vh-parts" ref={parts} aria-hidden="true" />

      {/* product: the photographic frame sequence, drawn on a canvas */}
      <div className="vh-stage" aria-hidden="true">
        <div className="vh-parallax">
          <div className="vh-scale">
            <div className="vh-breathe">
              <canvas className="vh-frames" ref={frames} />
            </div>
          </div>
        </div>
        <div className="vh-grade" />
      </div>
      <div className="vh-shade" aria-hidden="true" />

      <div className="wrap vh-grid">
        <div className="vh-copy">
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
