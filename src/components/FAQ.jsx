import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { SectionHead } from './Flavours'
import { prefersReduced } from '../hooks/motion'

// Answers about ingredients are general; anything operational is a bracketed placeholder to fill in before launch.
const QA = [
  { q: 'What is a falooda?', a: 'A chilled Indian dessert-drink: rose or fruit syrup, milk, basil seeds, falooda sev (vermicelli), jelly and a scoop of ice cream, built in layers.' },
  { q: 'Is everything made fresh?', a: 'Every glass is layered to order and served chilled. Fruit, nuts and rose are the real thing.' },
  { q: 'Can I change what goes in my glass?', a: 'Yes — use Build Your Falooda to pick the base, ice cream, toppings and extras, and watch the glass update.' },
  { q: 'Do you deliver?', a: '[Delivery details — add your delivery areas, times and fees here.]' },
  { q: 'Allergens and dietary needs?', a: '[Allergen information — list nuts, dairy and gluten notes here.]' },
]

export default function FAQ() {
  const [open, setOpen] = useState(0)
  const refs = useRef([])

  // closed panels start collapsed; GSAP owns the height from then on (React never sets it)
  useLayoutEffect(() => { refs.current.forEach((el, i) => i && gsap.set(el, { height: 0, opacity: 0 })) }, [])

  const toggle = (i) => {
    const next = open === i ? -1 : i
    const quick = prefersReduced()
    if (open >= 0) gsap.to(refs.current[open], { height: 0, opacity: 0, duration: quick ? 0 : 0.45, ease: 'power3.inOut' })
    if (next >= 0) gsap.fromTo(refs.current[next], { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: quick ? 0 : 0.6, ease: 'power3.out' })
    setOpen(next)
  }

  return (
    <section className="section faq" id="faq">
      <div className="wrap faq-wrap">
        <SectionHead eyebrow="Good to know" title={<>Questions, <em>answered.</em></>} center />
        <ul className="faq-list">
          {QA.map((x, i) => (
            <li key={x.q} className={`faq-item${open === i ? ' open' : ''}`}>
              <h3>
                <button className="faq-q" aria-expanded={open === i} aria-controls={`faq-a${i}`} onClick={() => toggle(i)}>
                  <span>{x.q}</span>
                  <i className="faq-plus" aria-hidden="true" />
                </button>
              </h3>
              <div className="faq-a" id={`faq-a${i}`} role="region" ref={(el) => (refs.current[i] = el)}>
                <p>{x.a}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
