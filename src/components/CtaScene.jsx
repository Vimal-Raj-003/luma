import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PhotoGlass from './PhotoGlass'
import { ING } from './Ingredients'
import { SITE } from '../data/site'
import { prefersReduced, splitWords } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)

const SPR = [[ING.berry, 12, 30, 84, 1.4], [ING.petal, 84, 22, 64, 2], [ING.pistachio, 22, 64, 56, 1.8], [ING.jelly, 76, 58, 66, 1.1], [ING.cherry, 60, 14, 46, 1.6], [ING.almond, 90, 74, 58, 1.3]]

/*
  "Your Next Craving Starts Here." — the finale. The glass rises out of the bottom of the scene as you arrive (scrubbed, scale + lift),
  the headline reveals line by line, toppings orbit at different depths, buttons land last.
*/
export default function CtaScene() {
  const root = useRef(null)
  useLayoutEffect(() => {
    const el = root.current
    splitWords(el.querySelector('.cta-title'))
    if (prefersReduced()) return
    const mobile = window.innerWidth < 900
    const ctx = gsap.context(() => {
      const arrive = { trigger: el, start: 'top 85%', end: 'center center', scrub: 0.7 }
      gsap.fromTo('.cta-glass', { yPercent: 55, scale: 0.8, rotate: -4 }, { yPercent: 0, scale: 1, rotate: 0, ease: 'none', scrollTrigger: arrive })
      gsap.fromTo('.cta-halo', { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: arrive })
      gsap.fromTo('.cta-bg i', { yPercent: (i) => 20 * (i + 1) }, { yPercent: (i) => -25 * (i + 1), ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.5 } })
      el.querySelectorAll('.cta-sp').forEach((s) => {
        const sp = +s.dataset.sp
        gsap.fromTo(s.firstChild, { y: 120 * sp * (mobile ? 0.5 : 1), rotate: -30 * sp }, { y: -120 * sp * (mobile ? 0.5 : 1), rotate: 30 * sp, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.5 } })
      })
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 60%', toggleActions: 'play none none reverse' } })
        .from('.cta-eyebrow', { y: 16, opacity: 0, duration: 0.6, ease: 'power3.out' }, 0)
        .from('.cta-title .wi', { yPercent: 118, rotate: 5, transformOrigin: '0 100%', duration: 1.1, stagger: 0.07, ease: 'expo.out' }, 0.1)
        .from('.cta-sub', { y: 20, opacity: 0, duration: 0.7, ease: 'power3.out' }, 0.55)
        .from('.cta-btns .btn', { y: 26, opacity: 0, scale: 0.9, duration: 0.7, stagger: 0.1, ease: 'back.out(1.7)' }, 0.8)
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="scene cta" id="order" ref={root}>
      <div className="cta-bg" aria-hidden="true"><i /><i /><i /></div>
      <div className="cta-halo" aria-hidden="true" />
      <div className="cta-glass" aria-hidden="true"><div className="float" style={{ '--fy': '10px', '--fr': '1deg', '--dur': '7s' }}><PhotoGlass flavour="strawberry" /></div></div>
      {SPR.map(([C, x, y, s, sp], i) => (
        <div className="cta-sp" key={i} data-sp={sp} style={{ left: `${x}%`, top: `${y}%`, width: s }} aria-hidden="true"><div className="float" style={{ '--fy': `${8 + i * 2}px`, '--dur': `${5 + i * 0.7}s`, '--delay': `${i * -0.8}s` }}><C /></div></div>
      ))}
      <div className="wrap cta-in">
        <p className="eyebrow light cta-eyebrow">Ready when you are</p>
        <h2 className="h2 cta-title" data-split>Your Next Craving <em>Starts Here.</em></h2>
        <p className="cta-sub">Creamy. Colourful. Refreshingly unforgettable.</p>
        <div className="cta-btns">
          <a className="btn btn-rose" href={SITE.contact.orderHref}>Order Now</a>
          <a className="btn btn-glass" href="#flavours">Explore Flavours</a>
        </div>
      </div>
    </section>
  )
}
