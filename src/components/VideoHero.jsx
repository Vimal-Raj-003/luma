import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { SITE } from '../data/site'
import { prefersReduced } from '../hooks/motion'

/*
  Front page: a looping, muted, full-bleed commercial of the Falooda being built (see tools/render-hero.mjs).
  Desktop gets the 16:9 render, phones get a dedicated portrait render with the glass framed high and clean space below
  for the copy. The copy appears once the build is nearly complete (REVEAL_AT seconds into the video) and then stays,
  so the loop restarting never makes the text flicker.
*/
const REVEAL_AT = 12.9
const BASE = import.meta.env.BASE_URL
const src = (mode, ext) => `${BASE}assets/hero/hero-${mode}.${ext}`

const usePortrait = () => {
  const q = '(max-width: 899px), (max-aspect-ratio: 1/1)'
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

  // copy starts hidden (unless motion is reduced: then the finished frame and text are simply shown)
  useLayoutEffect(() => {
    if (still) return
    const ctx = gsap.context(() => {
      gsap.set('.vh-word', { yPercent: 125, rotate: 6 })
      gsap.set('.vh-in', { y: 28, opacity: 0 })
    }, root)
    return () => ctx.revert()
  }, [still])

  useEffect(() => {
    if (still) return
    const el = root.current
    const v = video.current
    const ctx = gsap.context(() => {})
    const reveal = () => {
      if (revealed.current) return
      revealed.current = true
      ctx.add(() => {
        gsap.timeline()
          .to('.vh-word', { yPercent: 0, rotate: 0, duration: 1.2, stagger: 0.14, ease: 'expo.out' })
          .to('.vh-in', { y: 0, opacity: 1, duration: 0.9, stagger: 0.13, ease: 'power3.out' }, 0.25)
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
    // pause when scrolled away (saves battery/GPU), resume when back
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {})
      else v.pause()
    }, { threshold: 0.05 })
    io.observe(el)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('error', fail)
      clearTimeout(safety)
      io.disconnect()
      ctx.revert()
    }
  }, [still, mode])

  return (
    <section className={`vhero${still ? ' still' : ''}`} id="top" ref={root}>
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
      <div className="vh-shade" aria-hidden="true" />

      <div className="wrap vh-grid">
        <div className="vh-copy">
          <p className="eyebrow light vh-in">Falooda, reimagined</p>
          <h1 aria-label="Layers of Happiness.">
            <span className="vh-line" aria-hidden="true">
              <span className="vh-mask"><span className="vh-word">Layers</span></span>{' '}
              <span className="vh-mask"><span className="vh-word">of</span></span>
            </span>
            <span className="vh-line" aria-hidden="true">
              <span className="vh-mask"><span className="vh-word"><em>Happiness.</em></span></span>
            </span>
          </h1>
          <p className="vh-sub vh-in">Creamy. Colourful. Refreshingly unforgettable.</p>
          <div className="vh-cta vh-in">
            <a className="btn btn-rose" href="#flavours">
              Explore Faloodas
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a className="btn btn-glass" href={SITE.contact.orderHref}>Order Now</a>
          </div>
        </div>
      </div>

      <svg className="vh-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 80V44C240 4 480 74 720 44S1200 4 1440 44V80Z" fill="var(--paper)" />
      </svg>
    </section>
  )
}
