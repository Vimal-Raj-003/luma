import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SITE } from '../data/site'
import { finePointer, prefersReduced } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)

/*
  Front page. A looping, muted commercial of the Falooda being built, with everything around it driven by GSAP:
    - copy reveals in order once the build is nearly done: logo → headline word-by-word → supporting text → buttons
    - cursor parallax (video drifts one way, copy the other) and a scroll hand-off: the hero pins briefly, the Falooda
      scales toward the camera while the frame washes from dark plum into cream, then the story section takes over
  Desktop gets the 16:9 render, portrait screens a dedicated portrait render. Reveals are tied to the video's clock,
  so the copy appears when the dessert is finished, and then stays (the loop restarting never makes it flicker).
*/
const REVEAL_AT = 12.4
const BASE = import.meta.env.BASE_URL
const src = (mode, ext) => `${BASE}assets/hero/hero-${mode}.${ext}`

const usePortrait = () => {
  const q = '(max-aspect-ratio: 1/1)'
  const [p, setP] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false))
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setP(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return p
}

export default function VideoHero() {
  const root = useRef(null)
  const video = useRef(null)
  const revealed = useRef(false)
  const portrait = usePortrait()
  const mode = portrait ? 'portrait' : 'desktop'
  const still = prefersReduced()

  // copy starts hidden (reduced motion: the finished frame and the text are simply shown)
  useLayoutEffect(() => {
    if (still) return
    const ctx = gsap.context(() => {
      gsap.set('.vh-logo', { clipPath: 'inset(0 100% 0 0)', x: -18, opacity: 0 })
      gsap.set('.vh-logo svg', { rotate: -140, scale: 0.3 })
      gsap.set('.vh-word', { yPercent: 125, rotate: 6 })
      gsap.set('.vh-sub', { y: 26, opacity: 0 })
      gsap.set('.vh-cta .btn', { y: 30, opacity: 0, scale: 0.94 })
    }, root)
    return () => ctx.revert()
  }, [still, mode])

  useEffect(() => {
    if (still) return
    const el = root.current
    const v = video.current
    const ctx = gsap.context(() => {})

    /* ---- ordered reveal: logo → headline → supporting text → buttons ---- */
    const reveal = () => {
      if (revealed.current) return
      revealed.current = true
      ctx.add(() => {
        const tl = gsap.timeline()
        tl.to('.vh-logo', { clipPath: 'inset(0 0% 0 0)', x: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }, 0)
          .to('.vh-logo svg', { rotate: 0, scale: 1, duration: 1.2, ease: 'expo.out' }, 0)
          .to('.vh-word', { yPercent: 0, rotate: 0, duration: 1.25, stagger: 0.16, ease: 'expo.out' }, 0.7)
          .to('.vh-sub', { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, 1.65)
          .to('.vh-cta .btn', { y: 0, opacity: 1, scale: 1, duration: 0.9, stagger: 0.14, ease: 'power3.out' }, 2.05)
      })
    }
    const onTime = () => v.currentTime >= REVEAL_AT && reveal()
    v.addEventListener('timeupdate', onTime)
    // if the video can't play (blocked / error / very slow), never leave the page without its headline
    const fail = () => setTimeout(reveal, 400)
    v.addEventListener('error', fail)
    v.muted = true
    const play = v.play()
    if (play && play.catch) play.catch(fail)
    const safety = setTimeout(() => v.paused && reveal(), 4500)

    /* ---- scroll hand-off: the Falooda scales toward the camera, the frame washes plum → cream ---- */
    ctx.add(() => {
      const mobile = window.innerWidth < 900
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * (mobile ? 0.55 : 0.75))}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onToggle: (self) => (self.isActive ? v.play().catch(() => {}) : null),
        },
      })
      tl.to('.vh-copy', { y: -90, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
        .to('.vh-bg', { scale: mobile ? 1.22 : 1.34, yPercent: -3, duration: 1, transformOrigin: mobile ? '50% 42%' : '66% 55%' }, 0)
        .to('.vh-shade', { opacity: 0, duration: 0.6 }, 0.1)
        .to('.vh-wash', { yPercent: -100, duration: 0.85, ease: 'power1.in' }, 0.2)
    })

    /* ---- cursor parallax (desktop): the video drifts one way, the copy the other ---- */
    const cleanups = []
    if (finePointer()) {
      const bx = gsap.quickTo('.vh-media', 'x', { duration: 1.4, ease: 'power3.out' })
      const by = gsap.quickTo('.vh-media', 'y', { duration: 1.4, ease: 'power3.out' })
      const cx = gsap.quickTo('.vh-grid', 'x', { duration: 1.2, ease: 'power3.out' })
      const cy = gsap.quickTo('.vh-grid', 'y', { duration: 1.2, ease: 'power3.out' })
      const move = (e) => {
        if (window.scrollY > window.innerHeight * 0.5) return
        const nx = e.clientX / window.innerWidth - 0.5
        const ny = e.clientY / window.innerHeight - 0.5
        bx(-nx * 22)
        by(-ny * 14)
        cx(nx * 12)
        cy(ny * 8)
      }
      window.addEventListener('pointermove', move, { passive: true })
      cleanups.push(() => window.removeEventListener('pointermove', move))
    }

    // pause when scrolled far away (saves battery/GPU), resume when back
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.02 })
    io.observe(el)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('error', fail)
      clearTimeout(safety)
      io.disconnect()
      cleanups.forEach((f) => f())
      ctx.revert()
    }
  }, [still, mode])

  return (
    <section className={`vhero${still ? ' still' : ''}`} id="top" ref={root}>
      <div className="vh-bg">
        {still ? (
          <img className="vh-media" src={`${BASE}assets/hero/hero-${mode}-final.jpg`} alt="" />
        ) : (
          <video
            key={mode}
            ref={video}
            className="vh-media"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={`${BASE}assets/hero/hero-${mode}-poster.jpg`}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={src(mode, 'webm')} type="video/webm" />
            <source src={src(mode, 'mp4')} type="video/mp4" />
          </video>
        )}
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

      {/* dark berry/plum → cream: slides up over the hero as you scroll */}
      <div className="vh-wash" aria-hidden="true" />
    </section>
  )
}
