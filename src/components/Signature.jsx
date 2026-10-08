import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import FaloodaGlass from './FaloodaGlass'
import { ING } from './Ingredients'
import { prefersReduced, splitWords } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)

const FL = [
  { k: 'petal', x: '14%', y: '16%', mx: '6%', my: '12%', s: 84, ms: 46, rot: 20 },
  { k: 'pistachio', x: '80%', y: '14%', mx: '78%', my: '10%', s: 62, ms: 38, rot: -20 },
  { k: 'jelly', c: '#FF86AB', x: '8%', y: '62%', mx: '4%', my: '60%', s: 58, ms: 36, rot: 10 },
  { k: 'cube', c: '#FFC247', x: '86%', y: '58%', mx: '84%', my: '56%', s: 70, ms: 42, rot: -12, blur: 2 },
  { k: 'basil', x: '22%', y: '86%', mx: '16%', my: '84%', s: 48, ms: 30, rot: 0 },
  { k: 'berry', x: '74%', y: '88%', mx: '70%', my: '86%', s: 60, ms: 38, rot: 14, blur: 1.5 },
  { k: 'almond', x: '30%', y: '34%', mx: '88%', my: '30%', s: 48, ms: 30, rot: 30, hideM: true },
  { k: 'petal', x: '68%', y: '36%', mx: '8%', my: '36%', s: 44, ms: 28, rot: -50, blur: 3, hideM: true },
]

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
      tl.fromTo('.sg-glass', { scale: 0.5, y: 160, rotate: -10 }, { scale: 1.08, y: -10, rotate: 5, duration: 1 }, 0)
        .fromTo('.sg-ring', { scale: 0.4, opacity: 0.1 }, { scale: 1.2, opacity: 1, duration: 1 }, 0)
        .fromTo('.sg-title .wi', { yPercent: 115 }, { yPercent: 0, stagger: 0.06, duration: 0.5, ease: 'power3.out' }, 0.05)
        .fromTo(
          '.sg-fl',
          {
            x: (i, t) => (parseFloat(getComputedStyle(t).left) > window.innerWidth / 2 ? 1 : -1) * window.innerWidth * 0.6,
            y: (i) => (i % 2 ? 1 : -1) * 280,
            scale: 0.4,
            opacity: 0,
          },
          { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'power3.out' },
          0.05,
        )
        .to('.sg-glass', { scale: 1.16, duration: 0.5 }, 1)
        .to('.sg-fl', { y: (i) => (i % 2 ? -40 : 40), duration: 0.5 }, 1)
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

      <div className="sg-fls" aria-hidden="true">
        {FL.map((f, i) => {
          const C = ING[f.k]
          return (
            <div key={i} className={`sg-fl${f.hideM ? ' hide-m' : ''}`} style={{ '--x': f.x, '--y': f.y, '--mx': f.mx, '--my': f.my, '--s': `${f.s}px`, '--ms': `${f.ms}px` }}>
              <div className="float" style={{ '--fy': '12px', '--fr': '9deg', '--dur': `${5 + (i % 4)}s`, '--delay': `${-i}s` }}>
                <C color={f.c} style={{ transform: `rotate(${f.rot}deg)`, filter: f.blur ? `blur(${f.blur}px)` : undefined }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="wrap sg-grid">
        <div className="sg-copy">
          <p className="eyebrow light">The signature</p>
          <h2 className="h2 sg-title" ref={title}>
            Not Just a Drink. <br />
            <em>It’s a Dessert Experience.</em>
          </h2>
        </div>
        <div className="sg-stage">
          <div className="sg-ring" aria-hidden="true" />
          <div className="sg-glass">
            <FaloodaGlass palette="rose" animated />
          </div>
        </div>
      </div>
    </section>
  )
}
