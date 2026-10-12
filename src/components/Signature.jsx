import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReduced, splitWords } from '../hooks/motion'
import PhotoGlass from './PhotoGlass'

gsap.registerPlugin(ScrollTrigger)

/* Pinned: the glass pushes toward camera while the ingredients converge on it from outside the frame. */
export default function Signature() {
  const root = useRef(null)
  const title = useRef(null)

  useLayoutEffect(() => {
    if (prefersReduced()) return
    const el = root.current
    splitWords(title.current) // the tween below targets .wi — they must exist first
    const ctx = gsap.context(() => {
      const mobile = window.innerWidth < 900
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * (mobile ? 0.9 : 1.1))}`,
          pin: true,
          scrub: 0.9,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
      tl.fromTo('.sg-photo', { scale: 0.62, y: 120, rotate: -2.5 }, { scale: 1, y: 0, rotate: 0, duration: 1 }, 0)
        .fromTo('.sg-photo .pg', { scale: 1.12 }, { scale: 1, duration: 1.4 }, 0)
        .fromTo('.sg-ring', { scale: 0.4, opacity: 0.1 }, { scale: 1.2, opacity: 1, duration: 1 }, 0)
        .fromTo('.sg-title .wi', { yPercent: 115 }, { yPercent: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out' }, 0.05)
        .to('.sg-photo .pg', { scale: 1.04, duration: 0.5 }, 1)
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="signature" id="signature" ref={root}>
      <svg className="sg-wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0h1440v30C1200 80 1000 0 720 30S240 80 0 30Z" fill="var(--paper)" />
      </svg>
      <svg className="sg-wave bot" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0h1440v30C1200 80 1000 0 720 30S240 80 0 30Z" fill="var(--paper)" />
      </svg>

      <div className="wrap sg-grid">
        <div className="sg-copy">
          <p className="eyebrow light">The signature</p>
          <h2 className="h2 sg-title" ref={title}>
            Crafted in Layers. <br />
            <em>Made to Be Remembered.</em>
          </h2>
        </div>
        <div className="sg-stage">
          <div className="sg-ring" aria-hidden="true" />
          <div className="sg-photo">
            <PhotoGlass flavour="strawberry" />
          </div>
        </div>
      </div>
    </section>
  )
}
