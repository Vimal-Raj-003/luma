import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReduced } from '../hooks/motion'
import FaloodaGlass from './FaloodaGlass'
import { SectionHead } from './Flavours'
import { BUILDER, PALETTES, SITE } from '../data/site'

const Check = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

function Step({ n, title, hint, children }) {
  return (
    <fieldset className="b-step">
      <legend>
        <span className="b-n">{n}</span>
        <span className="b-t">{title}</span>
        <span className="b-h">{hint}</span>
      </legend>
      <div className="b-opts">{children}</div>
    </fieldset>
  )
}

export default function Builder() {
  const [base, setBase] = useState('rose')
  const [ice, setIce] = useState('vanilla')
  const [tops, setTops] = useState(['pistachio', 'petals', 'basil'])
  const [extras, setExtras] = useState(['cherry'])
  const [done, setDone] = useState(false)
  const [tick, setTick] = useState(0)
  const last = useRef(null)
  const box = useRef(null)

  const note = (kind, id, on = true) => {
    last.current = { kind, id, on }
    setTick((n) => n + 1)
    setDone(false)
  }
  const toggle = (list, set, kind) => (id) => {
    const on = !list.includes(id)
    if (on || prefersReduced()) {
      set(on ? [...list, id] : list.filter((x) => x !== id))
      note(kind, id, on)
      return
    }
    // removing: the pieces lift off and scatter first, then the layer is taken out of the state
    const items = box.current.querySelectorAll(`.fl-k-${id} .tp`)
    gsap.to(items, {
      y: -80, opacity: 0, rotation: () => gsap.utils.random(-50, 50), transformOrigin: '50% 50%',
      duration: 0.45, stagger: { each: 0.012, from: 'random' }, ease: 'power2.in', overwrite: true,
      onComplete: () => {
        set(list.filter((x) => x !== id))
        note(kind, id, false)
      },
    })
  }

  // a product card's Order Now / click lands here with that flavour chosen
  useEffect(() => {
    const MAP = { rose: ['rose'], mango: ['mango'], pistachio: ['pistachio'], chocolate: ['chocolate', 'chocolate'], strawberry: ['rose', 'strawberry'], dryfruit: ['pistachio', 'kulfi'] }
    const on = (e) => {
      const m = MAP[e.detail?.id]
      if (!m) return
      setBase(m[0]); if (m[1]) setIce(m[1])
      note('base', m[0])
    }
    window.addEventListener('luma:build', on)
    return () => window.removeEventListener('luma:build', on)
  }, [])

  const root = useRef(null)
  useLayoutEffect(() => {
    if (prefersReduced()) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.b-preview-in .glass-box', { scale: 1.4, y: -70, rotate: -5 }, {
        scale: 1, y: 0, rotate: 0, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top 88%', end: 'top 30%', scrub: 0.9 },
      })
      gsap.fromTo('.b-step', { x: 60, opacity: 0.2 }, {
        x: 0, opacity: 1, stagger: 0.12, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top 80%', end: 'top 25%', scrub: 0.9 },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  // every choice visibly acts on the glass
  useEffect(() => {
    const l = last.current
    if (!l || prefersReduced()) return
    const el = box.current
    const q = (s) => el.querySelectorAll(s)
    if (l.kind === 'base') {
      gsap.fromTo(q('.fl-layer'), { y: -22, opacity: 0.2 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power3.out', overwrite: true })
      gsap.fromTo(q('.b-disc'), { scale: 0.7 }, { scale: 1, duration: 1.2, ease: 'expo.out' })
    } else if (l.kind === 'ice') {
      gsap.fromTo(q('.fl-scoop'), { y: -120, opacity: 0, rotation: (i) => [-6, 6, 0][i] }, { y: 0, opacity: 1, rotation: 0, duration: 1, stagger: 0.12, ease: 'power3.out', transformOrigin: '50% 100%', overwrite: true })
    } else if (l.on) {
      gsap.fromTo(
        q(`.fl-k-${l.id} .tp`),
        { y: () => -(90 + Math.random() * 110), opacity: 0, rotation: () => gsap.utils.random(-60, 60), transformOrigin: '50% 50%' },
        { y: 0, opacity: 1, rotation: 0, duration: 0.9, stagger: { each: 0.025, from: 'random' }, ease: 'power3.out', overwrite: true },
      )
    }
    gsap.fromTo(document.querySelectorAll('.b-price'), { scale: 1.18, y: -6 }, { scale: 1, y: 0, duration: 0.7, ease: 'expo.out' })
  }, [tick])

  const iceDef = BUILDER.ice.find((i) => i.id === ice)
  const custom = useMemo(() => {
    const p = PALETTES[base]
    return { ...p, scoops: [iceDef.colors, iceDef.colors, iceDef.colors] }
  }, [base, iceDef])

  const show = {
    basil: tops.includes('basil'), jelly: tops.includes('jelly'), fruit: tops.includes('fruit'),
    pistachio: tops.includes('pistachio'), almond: tops.includes('almond'), petals: tops.includes('petals'),
    extraSev: extras.includes('extraSev'), cream: extras.includes('cream'),
    saffron: extras.includes('saffron'), cherry: extras.includes('cherry'),
  }

  const price =
    BUILDER.bases.find((b) => b.id === base).price +
    iceDef.price +
    BUILDER.toppings.filter((t) => tops.includes(t.id)).reduce((a, t) => a + t.price, 0) +
    BUILDER.extras.filter((t) => extras.includes(t.id)).reduce((a, t) => a + t.price, 0)

  const baseLabel = BUILDER.bases.find((b) => b.id === base).label

  return (
    <section className="section builder" id="build" ref={root}>
      <div className="wrap">
        <SectionHead eyebrow="Make it yours" title={<>Build Your <em>Falooda</em></>}>
          Four quick choices. Watch your glass come together.
        </SectionHead>

        <div className="b-grid">
          <div className="b-preview">
            <div className="b-preview-in" ref={box}>
              <div className="b-disc" style={{ background: BUILDER.bases.find((b) => b.id === base).dot }} aria-hidden="true" />
              <div className="glass-box">
                <FaloodaGlass custom={custom} show={show} animated />
              </div>
            </div>
            <div className="b-sum">
              <div>
                <strong>{baseLabel} Falooda</strong>
                <span>{iceDef.label} · {tops.length} toppings · {extras.length} extras</span>
              </div>
              <div className="b-price">{SITE.currency}{price}</div>
            </div>
            <button className="btn btn-rose b-add b-add-d" onClick={() => setDone(true)}>
              {done ? 'Saved — ordering opens soon' : 'Add to Order'}
            </button>
          </div>

          <div className="b-steps">
            <Step n="1" title="Choose your base" hint="Pick one">
              {BUILDER.bases.map((o) => (
                <button key={o.id} className="opt" aria-pressed={base === o.id} onClick={() => { setBase(o.id); note('base', o.id) }}>
                  <i style={{ background: o.dot }} />
                  {o.label}
                </button>
              ))}
            </Step>
            <Step n="2" title="Choose your ice cream" hint="Pick one">
              {BUILDER.ice.map((o) => (
                <button key={o.id} className="opt" aria-pressed={ice === o.id} onClick={() => { setIce(o.id); note('ice', o.id) }}>
                  <i style={{ background: `linear-gradient(135deg, ${o.colors[0]}, ${o.colors[1]})` }} />
                  {o.label}
                </button>
              ))}
            </Step>
            <Step n="3" title="Choose toppings" hint="Pick any">
              {BUILDER.toppings.map((o) => {
                const on = tops.includes(o.id)
                return (
                  <button key={o.id} className="opt check" aria-pressed={on} onClick={() => toggle(tops, setTops, 'top')(o.id)}>
                    <span className="tick">{on && <Check />}</span>
                    {o.label}
                  </button>
                )
              })}
            </Step>
            <Step n="4" title="Add extras" hint="Pick any">
              {BUILDER.extras.map((o) => {
                const on = extras.includes(o.id)
                return (
                  <button key={o.id} className="opt check" aria-pressed={on} onClick={() => toggle(extras, setExtras, 'extra')(o.id)}>
                    <span className="tick">{on && <Check />}</span>
                    {o.label}
                  </button>
                )
              })}
            </Step>
            <button className="btn btn-rose b-add b-add-m" onClick={() => setDone(true)}>
              {done ? 'Saved — ordering opens soon' : 'Add to Order'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
