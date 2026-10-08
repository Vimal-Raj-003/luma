import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { SITE } from '../data/site'
import { prefersReduced } from '../hooks/motion'

export const Logo = ({ light = false }) => (
  <a href="#top" className={`logo${light ? ' light' : ''}`} aria-label="LUMA home">
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <path d="M5 6h22l-4 13c-1 3-4 5-7 5s-6-2-7-5z" fill="#fff" fillOpacity=".25" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 12h18l-1.4 5c-.8 2.6-3.7 4.4-7.6 4.4S9.2 19.6 8.4 17z" fill="#F0709B" />
      <path d="M8.6 17h14.8c-.9 2.6-3.7 4.4-7.4 4.4S9.5 19.6 8.6 17z" fill="#A9D58B" />
      <circle cx="16" cy="5" r="3" fill="#FFBE3B" />
      <path d="M16 24v5M11 29h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
    <span>LUMA</span>
  </a>
)

export default function Nav({ ready }) {
  const [solid, setSolid] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const links = useRef(null)
  const ind = useRef(null)

  useEffect(() => {
    let raf = 0
    const SECTIONS = ['#mood', '#build', '#visit']
    const on = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      setSolid(y > window.innerHeight * 0.6) // the dark hero is washed out to cream by then
      // scroll-spy: the last section whose top has passed 40% of the viewport; none while on the hero
      let active = -1
      SECTIONS.forEach((id, i) => {
        const e = document.querySelector(id)
        if (e && e.getBoundingClientRect().top <= window.innerHeight * 0.4) active = i
      })
      const a = [...links.current.children].filter((c) => c.tagName === 'A')
      a.forEach((c, i) => c.classList.toggle('on', i === active))
      const el = a[active]
      if (!ind.current) return
      if (!el) return void gsap.to(ind.current, { opacity: 0, duration: 0.3 })
      gsap.to(ind.current, { x: el.offsetLeft, scaleX: el.offsetWidth / 40, opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true })
    }
    const tick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(on) }
    on()
    window.addEventListener('scroll', tick, { passive: true })
    window.addEventListener('resize', tick)
    // pinned sections move after layout settles: re-evaluate once things are measured
    const t = setTimeout(on, 1800)
    return () => { window.removeEventListener('scroll', tick); window.removeEventListener('resize', tick); clearTimeout(t); cancelAnimationFrame(raf) }
  }, [])

  // logo softly reveals once the curtain lifts
  useLayoutEffect(() => {
    if (prefersReduced()) return
    gsap.set('.nav .logo, .nav-links a, .nav .btn', { opacity: 0 })
  }, [])
  useEffect(() => {
    if (!ready || prefersReduced()) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.nav .logo', { clipPath: 'inset(0 100% 0 0)', x: -16, opacity: 0 }, { clipPath: 'inset(0 0% 0 0)', x: 0, opacity: 1, duration: 1.5, ease: 'expo.out', delay: 0.2 })
      gsap.fromTo('.nav .logo svg', { rotate: -120, scale: 0.3 }, { rotate: 0, scale: 1, duration: 1.4, ease: 'expo.out', delay: 0.2 })
      gsap.fromTo('.nav-links a, .nav .btn', { y: -16, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.09, ease: 'power3.out', delay: 0.7 })
    })
    return () => ctx.revert()
  }, [ready])

  return (
    <header className={`nav${solid ? ' solid' : ' on-dark'}${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-in">
        <Logo />
        <nav className="nav-links" aria-label="Primary" ref={links}>
          <a href="#mood">Flavours</a>
          <a href="#build">Build Yours</a>
          <a href="#visit">Visit</a>
          <span className="nav-ind" ref={ind} aria-hidden="true" />
        </nav>
        <a className="btn btn-dark btn-sm" href={SITE.contact.orderHref}>
          Order Now
        </a>
      </div>
    </header>
  )
}
