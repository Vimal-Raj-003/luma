import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import PhotoGlass from './PhotoGlass'
import { ING } from './Ingredients'
import { FLAVOURS, SELECTOR, SITE } from '../data/site'
import { prefersReduced, splitWords } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)

const Mango = () => <ING.cube color="#FFC247" />
// toppings that belong to each featured flavour: [component, left %, top %, size px, parallax speed]
const FEAT = [
  { id: 'strawberry', fl: [[ING.berry, 66, 16, 70, 1], [ING.jelly, 82, 68, 56, 1.6], [ING.petal, 60, 80, 44, 2]] },
  { id: 'mango', fl: [[Mango, 64, 18, 60, 1.3], [ING.almond, 88, 22, 54, 1.8], [ING.cherry, 72, 78, 44, 1]] },
  { id: 'pistachio', fl: [[ING.pistachio, 60, 20, 62, 1.5], [ING.basil, 90, 28, 48, 1], [ING.almond, 64, 76, 50, 2]] },
]

/*
  "One Glass. Endless Cravings."  — a pinned scene. The glass stays in the middle; scrolling turns it into the next flavour:
  the old glass tips away, the new one arrives, the glow behind it changes colour, the big word slides past, the flavour's own
  toppings fly in. Everything is one scrubbed timeline, so it plays backwards when you scroll up.
*/
export default function OneGlass() {
  const root = useRef(null)

  useLayoutEffect(() => {
    const el = root.current
    splitWords(el.querySelector('.og-title'))
    if (prefersReduced()) {
      el.classList.add('og-static')
      return
    }
    const mobile = window.innerWidth < 900
    const n = FEAT.length
    const ctx = gsap.context(() => {
      const q = (s, i) => el.querySelectorAll(s)[i]
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el, start: 'top top', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          end: () => `+=${Math.round(window.innerHeight * (mobile ? 1.0 : 1.25) * (n - 1 + 0.7))}`,
          onUpdate: (self) => {
            const i = gsap.utils.clamp(0, n - 1, Math.round((self.progress * tl.duration() - 0.35) / 1))
            el.querySelectorAll('.og-rail button').forEach((b, k) => b.classList.toggle('on', k === i))
          },
        },
      })
      // the title and the stage arrive while the section is still scrolling in
      gsap.from(el.querySelectorAll('.og-title .wi'), { yPercent: 118, rotate: 5, transformOrigin: '0 100%', duration: 1.1, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 75%', toggleActions: 'play none none reverse' } })
      gsap.fromTo('.og-scene', { scale: 0.9, y: 60 }, { scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: 0.6 } })

      FEAT.forEach((_, i) => {
        if (!i) { gsap.set(q('.og-bg', 0), { opacity: 1 }); return }
        const t = 0.35 + (i - 1)
        const set = (s, from, to, at, extra = {}) => tl.fromTo(q(s, i), from, { ...to, duration: 0.75, ...extra }, at)
        const out = (s, to, at) => tl.to(q(s, i - 1), { ...to, duration: 0.6 }, at)
        out('.og-glass', { opacity: 0, scale: 1.2, rotate: 12, xPercent: -35 }, t)
        out('.og-name', { yPercent: -110, opacity: 0 }, t)
        out('.og-info', { opacity: 0, y: -20 }, t)
        out('.og-ghost', { xPercent: -45, opacity: 0 }, t)
        out('.og-fls', { opacity: 0, scale: 0.6 }, t)
        tl.to(q('.og-bg', i - 1), { opacity: 0, duration: 0.8 }, t)
        tl.to(q('.og-bg', i), { opacity: 1, duration: 0.8 }, t)
        set('.og-glass', { opacity: 0, scale: 0.78, rotate: -12, xPercent: 35 }, { opacity: 1, scale: 1, rotate: 0, xPercent: 0, ease: 'power2.out' }, t + 0.2)
        set('.og-name', { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'power2.out' }, t + 0.3)
        set('.og-info', { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, t + 0.45)
        set('.og-ghost', { xPercent: 45, opacity: 0 }, { xPercent: 0, opacity: 1 }, t + 0.1)
        set('.og-fls', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, ease: 'back.out(1.6)' }, t + 0.4)
      })
      tl.to({}, { duration: 0.35 }) // a short hold on the last flavour before the pin releases

      // toppings drift at different speeds as you scroll (depth)
      el.querySelectorAll('.og-fl').forEach((f) => {
        const sp = +f.dataset.sp
        gsap.fromTo(f, { y: 50 * sp }, { y: -70 * sp, rotate: 25 * sp, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.5 } })
      })
      gsap.fromTo('.og-ghost', { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.5 } })

      // rail: jump to a flavour
      el.querySelectorAll('.og-rail button').forEach((b, i) => {
        b.addEventListener('click', () => {
          const st = tl.scrollTrigger
          const time = Math.min(tl.duration(), 0.35 + i + (i ? 0.95 : 0))
          window.scrollTo({ top: st.start + (time / tl.duration()) * (st.end - st.start), behavior: 'smooth' })
        })
      })
    }, el)
    return () => ctx.revert()
  }, [])

  const info = (id) => ({ ...SELECTOR[id], ...FLAVOURS.find((f) => f.id === id) })

  return (
    <section className="scene og" id="cravings" ref={root}>
      <div className="og-bgs" aria-hidden="true">
        {FEAT.map((f) => <div className="og-bg" key={f.id} style={{ '--ac': SELECTOR[f.id].accent }} />)}
      </div>
      <div className="wrap og-scene">
        <div className="og-head">
          <p className="eyebrow light">One glass</p>
          <h2 className="h2 og-title" data-split>One Glass. <em>Endless Cravings.</em></h2>
        </div>
        <ol className="og-rail" aria-label="Featured flavours">
          {FEAT.map((f, i) => (
            <li key={f.id}><button className={i ? '' : 'on'} aria-label={`Show ${SELECTOR[f.id].label}`}><b>0{i + 1}</b><span>{SELECTOR[f.id].label}</span></button></li>
          ))}
        </ol>
        <div className="og-stage">
          {FEAT.map((f) => {
            const d = info(f.id)
            return (
              <article className="og-flav" key={f.id} style={{ '--ac': d.accent }}>
                <div className="og-ghost" aria-hidden="true">{d.label}</div>
                <div className="og-fls" aria-hidden="true">
                  {f.fl.map(([C, x, y, s, sp], k) => (
                    <div className="og-fl" key={k} data-sp={sp} style={{ left: `${x}%`, top: `${y}%`, width: s }}><div className="float" style={{ '--fy': `${10 + k * 4}px`, '--dur': `${5 + k}s` }}><C /></div></div>
                  ))}
                </div>
                <div className="og-glass"><div className="float" style={{ '--fy': '8px', '--fr': '1deg', '--dur': '6s' }}><PhotoGlass flavour={f.id} /></div></div>
                <div className="og-copy">
                  <h3 className="og-name-m"><span className="og-name">{d.title}</span></h3>
                  <div className="og-info">
                    <p>{d.line}</p>
                    <ul>{d.notes.map((x) => <li key={x}>{x}</li>)}</ul>
                    <div className="og-buy"><span className="price">{SITE.currency}{d.price}</span><a className="btn btn-rose btn-sm" href="#flavours">See the menu</a></div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
