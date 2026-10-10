import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ING } from './Ingredients'
import { prefersReduced } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)

// the story, as words; [text, accent?]
const STORY = [
  ['Every', 0], ['glass', 0], ['of', 0], ['LUMA', 1], ['begins', 0], ['the', 0], ['same', 0], ['way:', 0], ['a', 0], ['cold', 0], ['pour,', 0], ['a', 0], ['slow', 0], ['swirl', 0], ['of', 0], ['something', 0], ['sweet,', 1],
  ['and', 0], ['a', 0], ['promise', 0], ['to', 0], ['make', 0], ['you', 0], ['smile.', 1], ['We', 0], ['build', 0], ['it', 0], ['layer', 0], ['by', 0], ['layer', 1], ['—', 0], ['syrup,', 0], ['milk,', 0], ['jelly,', 0], ['cream,', 0], ['crunch', 0], ['—', 0], ['because', 0], ['happiness', 1], ['is', 0], ['better', 0], ['with', 0], ['layers.', 1],
]
const SP = [[ING.petal, 8, 14, 64, 1.6], [ING.pistachio, 88, 22, 58, 1.2], [ING.berry, 12, 74, 78, 1], [ING.almond, 84, 70, 56, 2], [ING.cherry, 52, 6, 44, 1.4]]

/*
  "Our story" — a dark chapter between the making and the reasons to choose LUMA. Large type that lights up word by word with your
  scroll (scrubbed, so it un-lights when you scroll back), an outlined LUMA drifting behind it, ingredients at different depths.
*/
export default function Story() {
  const root = useRef(null)
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const el = root.current
    const mobile = window.innerWidth < 900
    const ctx = gsap.context(() => {
      gsap.fromTo('.story-w', { opacity: 0.14 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: '.story-text', start: 'top 78%', end: 'bottom 52%', scrub: 0.4 } })
      gsap.fromTo('.story-ghost', { xPercent: 12 }, { xPercent: -22, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.5 } })
      gsap.from('.story-eyebrow', { y: 16, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 70%', toggleActions: 'play none none reverse' } })
      el.querySelectorAll('.story-sp').forEach((s) => {
        const sp = +s.dataset.sp
        gsap.fromTo(s.firstChild, { y: 140 * sp * (mobile ? 0.5 : 1), rotate: -40 * sp }, { y: -140 * sp * (mobile ? 0.5 : 1), rotate: 40 * sp, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.5 } })
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section className="scene story" id="story" ref={root}>
      <div className="story-ghost" aria-hidden="true">LUMA</div>
      {SP.map(([C, x, y, s, sp], i) => (
        <div className="story-sp" key={i} data-sp={sp} style={{ left: `${x}%`, top: `${y}%`, width: s }} aria-hidden="true"><div className="float" style={{ '--fy': `${8 + i * 2}px`, '--dur': `${5 + i * 0.8}s` }}><C /></div></div>
      ))}
      <div className="wrap">
        <p className="eyebrow light story-eyebrow">Our story</p>
        <p className="story-text">
          {STORY.map(([w, a], i) => <span key={i} className={`story-w${a ? ' a' : ''}`}>{w} </span>)}
        </p>
      </div>
    </section>
  )
}
