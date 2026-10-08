import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { finePointer, prefersReduced, scene } from '../hooks/motion'

gsap.registerPlugin(ScrollTrigger)
if (import.meta.env.DEV) window.__gsap = { gsap, ScrollTrigger } // dev-only: inspect the scroll system from the console

/*
  "Made Layer by Layer" — a PHOTOGRAPHIC build tied to scroll position (and fully reversible).
  Real photographs are composited with reveal masks; GSAP only sequences them (no drawn food):
    0–15 % empty glass · syrup · basil + sev · milk · jelly + strawberry · ice cream · toppings
  Units below: 10 = 100 %. Each stage owns 1.5 units (the last one 1.0).
*/
const BASE = import.meta.env.BASE_URL
const photo = (n) => `${BASE}assets/photo/${n}.jpg`

const STEPS = [
  { key: 'syrup', title: 'Rose Syrup', text: 'A deep, glossy base poured first.' },
  { key: 'bsev', title: 'Basil Seeds & Sev', text: 'Silky pearls and chilled noodles settle in.' },
  { key: 'milk', title: 'Chilled Milk', text: 'Poured slow, mixing into the syrup.' },
  { key: 'fruit', title: 'Jelly & Strawberries', text: 'Ruby jelly and fresh berries drop through.' },
  { key: 'ice', title: 'Ice Cream', text: 'A hand-scooped crown settles on top.' },
  { key: 'nuts', title: 'Final Toppings', text: 'Pistachio, berries and a syrup drizzle.' },
]
const STARTS = [1.5, 3, 4.5, 6, 7.5, 9]
const END = 10

const LABELS = [{ n: '00', title: 'The empty glass' }, ...STEPS.map((s, i) => ({ n: `0${i + 1}`, title: s.title }))]

export default function PhotoStory() {
  const root = useRef(null)

  useLayoutEffect(() => {
    const el = root.current
    const view = el.querySelector('.ps-view')
    const fit = el.querySelector('.ps-fit')
    const cam = el.querySelector('.ps-cam')
    const steps = [...el.querySelectorAll('.step')]
    const hud = [...el.querySelectorAll('.hl')]
    const pctEl = el.querySelector('.ps-pct b')
    const reduced = prefersReduced()
    const $ = (s) => el.querySelector(s)

    const ctx = gsap.context(() => {
      // fit the 1792×941 photo world to the view, centred on the glass
      const layout = () => {
        const r = view.getBoundingClientRect()
        const s = (r.height * 0.97) / 880
        gsap.set(fit, { scale: s, x: r.width / 2 - 1150 * s, y: r.height / 2 - 470 * s })
      }
      layout()
      ScrollTrigger.addEventListener('refreshInit', layout)

      const L = { i1: $('.i1'), i2: $('.i2'), i3: $('.i3'), i5: $('.i5'), i6: $('.i6'), o3a: $('.o3a'), o3b: $('.o3b'), o2: $('.o2'), o1: $('.o1'), sc: $('.sc') }
      gsap.set([L.o3a, L.o3b, L.o2, L.o1, L.sc, L.i2, L.i5, L.i6], { opacity: 0 })
      gsap.set(L.i1, { '--t': '900px' })
      gsap.set(L.i3, { '--t': '900px' })
      gsap.set(L.i2, { '--t': '500px', '--b': '504px' })
      gsap.set([L.i5, L.i6], { '--t': '0px', '--b': '190px' })
      gsap.set(L.sc, { y: -300 })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        paused: reduced,
        scrollTrigger: reduced
          ? undefined
          : {
              trigger: el,
              start: 'top top',
              end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 900 ? 4.6 : 5.6))}`,
              pin: true,
              scrub: 0.9, // position-linked; scrolling back runs the build in reverse
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const u = self.progress * END
                let i = -1
                STARTS.forEach((st, n) => { if (u >= st - 0.05) i = n })
                steps.forEach((s, n) => {
                  s.classList.toggle('active', n === i)
                  s.classList.toggle('done', n < i)
                })
                el.style.setProperty('--p', Math.max(0, Math.min(1, (u - 1.5) / 8.5)).toFixed(3))
                el.dataset.pct = Math.round(self.progress * 100)
                el.dataset.step = i
                hud.forEach((h, n) => h.classList.toggle('on', n === i + 1))
                if (pctEl) pctEl.textContent = String(Math.round(self.progress * 100)).padStart(2, '0')
              },
            },
      })

      // continuity: the photo window arrives scaled up (the Falooda has just grown toward you in the hero) and settles
      if (!reduced) {
        gsap.fromTo(view, { scale: 1.2, y: 110, borderRadius: 110 }, {
          scale: 1, y: 0, borderRadius: window.innerWidth < 900 ? 26 : 32, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 98%', end: 'top top', scrub: 0.7 },
        })
        gsap.fromTo(el.querySelectorAll('.ps-left .h2, .ps-left .eyebrow'), { y: 60, opacity: 0 }, {
          y: 0, opacity: 1, ease: 'none', stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 25%', scrub: 0.7 },
        })
      }
      // the camera drifts in a few percent over the whole build
      tl.to(cam, { scale: 1.05, duration: END, ease: 'sine.inOut' }, 0)
      // 15–30 %  syrup rises from the bottom of the glass
      tl.fromTo(L.i1, { '--t': '900px' }, { '--t': '612px', duration: 1.4, ease: 'power1.inOut' }, 1.5)
      // 30–45 %  basil seeds + sev settle (revealed top-down, as if falling)
      tl.to(L.i2, { opacity: 1, duration: 0.2 }, 3.0).fromTo(L.i2, { '--t': '500px', '--b': '504px' }, { '--t': '500px', '--b': '652px', duration: 1.3, ease: 'power1.inOut' }, 3.0)
      // 45–60 %  milk: the stream appears and the liquid climbs, turning the syrup pink
      tl.to(L.o3a, { opacity: 1, duration: 0.5, ease: 'power1.inOut' }, 4.4)
        .fromTo(L.i3, { '--t': '900px' }, { '--t': '560px', duration: 1.4, ease: 'power1.inOut' }, 4.5)
        .to(L.o3b, { opacity: 1, duration: 0.2 }, 5.7)
        .to(L.o3a, { opacity: 0, duration: 0.4, ease: 'power1.inOut' }, 5.8)
      // 60–75 %  jelly + strawberries: the cream climbs through them
      tl.fromTo(L.i3, { '--t': '560px' }, { '--t': '250px', duration: 1.3, ease: 'power1.inOut', immediateRender: false }, 6.0)
      // 75–90 %  ice cream drops in, squashes, settles; creamy drips run down the glass
      tl.to(L.sc, { opacity: 1, duration: 0.1 }, 7.5)
        .fromTo(L.sc, { y: -300 }, { y: 0, duration: 0.8, ease: 'power2.in' }, 7.5)
        .to(L.sc, { scaleY: 0.93, scaleX: 1.04, duration: 0.08, ease: 'power1.out' }, 8.3)
        .to(L.sc, { scaleY: 1, scaleX: 1, duration: 0.2, ease: 'power1.inOut' }, 8.4)
        .to(L.o2, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, 8.3)
        .to(L.o3b, { opacity: 0, duration: 0.6, ease: 'power1.inOut' }, 8.5)
        .to(L.i5, { opacity: 1, duration: 0.2 }, 8.3)
        .fromTo(L.i5, { '--t': '0px', '--b': '190px' }, { '--t': '0px', '--b': '900px', duration: 0.9, ease: 'power1.inOut' }, 8.3)
      // 90–100 %  toppings + the syrup drizzle: the final composition
      tl.to(L.o1, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, 9.0)
        .to(L.o2, { opacity: 0, duration: 0.7, ease: 'power1.inOut' }, 9.2)
        .to(L.i6, { opacity: 1, duration: 0.2 }, 9.0)
        .fromTo(L.i6, { '--t': '0px', '--b': '190px' }, { '--t': '0px', '--b': '900px', duration: 0.9, ease: 'power1.inOut' }, 9.0)
        .to({}, { duration: 0.01 }, END)

      if (reduced) {
        tl.progress(1)
        steps.forEach((s) => s.classList.add('done'))
      } else {
        scene.st = tl.scrollTrigger
        scene.storyAt = 0.12
      }

      // depth: the photo shifts a few px against the cursor (touch: leans toward the finger)
      const fine = finePointer()
      const px = gsap.quickTo(cam, 'x', { duration: 1.2, ease: 'power3.out' })
      const py = gsap.quickTo(cam, 'y', { duration: 1.2, ease: 'power3.out' })
      const amp = reduced ? 0 : fine ? 14 : 8
      const lean = (cx, cy) => {
        const r = el.getBoundingClientRect()
        if (r.bottom < 0 || r.top > window.innerHeight) return
        px(-(cx / window.innerWidth - 0.5) * amp)
        py(-(cy / window.innerHeight - 0.5) * amp)
      }
      const onPointer = (e) => lean(e.clientX, e.clientY)
      const onTouch = (e) => e.touches[0] && lean(e.touches[0].clientX, e.touches[0].clientY)
      if (fine) window.addEventListener('pointermove', onPointer, { passive: true })
      else {
        window.addEventListener('touchstart', onTouch, { passive: true })
        window.addEventListener('touchmove', onTouch, { passive: true })
      }
      return () => {
        ScrollTrigger.removeEventListener('refreshInit', layout)
        window.removeEventListener('pointermove', onPointer)
        window.removeEventListener('touchstart', onTouch)
        window.removeEventListener('touchmove', onTouch)
      }
    }, el)

    return () => {
      ctx.revert()
      scene.st = null
    }
  }, [])

  return (
    <section className="pstory" id="craft" ref={root} data-pct="0" data-step="-1">
      <div className="ps-inner wrap">
        <div className="ps-left" id="story">
          <p className="eyebrow">The craft</p>
          <h2 className="h2">
            Made <em>Layer</em> by Layer
          </h2>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <li className="step" key={s.key}>
                <span className="step-n">0{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="ps-view" role="img" aria-label="A strawberry falooda being built layer by layer">
          <div className="ps-cam">
            <div className="ps-fit">
              <div className="ps-world">
                <img className="ps-l base" src={photo('empty')} alt="" />
                <img className="ps-l out o3a" src={photo('pour')} alt="" loading="lazy" />
                <img className="ps-l out nostream o3b" src={photo('pour')} alt="" loading="lazy" />
                <img className="ps-l scoop sc" src={photo('splash')} alt="" loading="lazy" />
                <img className="ps-l out o2" src={photo('splash')} alt="" loading="lazy" />
                <img className="ps-l out o1" src={photo('final')} alt="" loading="lazy" />
                <img className="ps-l in i1" src={photo('syrup')} alt="" />
                <img className="ps-l in i2" src={photo('final')} alt="" loading="lazy" />
                <img className="ps-l in i3" src={photo('pour')} alt="" loading="lazy" />
                <img className="ps-l in i5" src={photo('splash')} alt="" loading="lazy" />
                <img className="ps-l in i6" src={photo('final')} alt="" loading="lazy" />
              </div>
            </div>
          </div>
          <div className="ps-shade" aria-hidden="true" />
          <div className="ps-hud" aria-hidden="true">
            <div className="ps-labels">
              {LABELS.map((l, i) => (
                <span className={`hl${i === 0 ? ' on' : ''}`} key={l.n}>
                  <i>{l.n}</i>
                  {l.title}
                </span>
              ))}
            </div>
            <div className="ps-pct"><b>00</b>%</div>
          </div>
        </div>
      </div>
    </section>
  )
}
