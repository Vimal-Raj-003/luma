import { useState } from 'react'
import PhotoGlass, { FLAVOUR_BG } from './PhotoGlass'
import AddToCart from './AddToCart'
import ProductSheet, { Heart, burst } from './ProductSheet'
import { toggleWish, useStore } from '../store'
import { prefersReduced } from '../hooks/motion'
import { FLAVOURS, SITE } from '../data/site'

export function SectionHead({ eyebrow, title, children, center = false }) {
  return (
    <div className={`sec-head${center ? ' center' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="h2" data-split>{title}</h2>
      {children && <p className="lede">{children}</p>}
    </div>
  )
}

export default function Flavours() {
  const [sheet, setSheet] = useState(null)
  const store = useStore()
  const wish = (e, id) => {
    e.stopPropagation()
    const on = !store.wish.includes(id)
    toggleWish(id)
    if (on && !prefersReduced()) burst(e.currentTarget)
  }
  return (
    <section className="section" id="flavours">
      <div className="wrap">
        <SectionHead eyebrow="The menu" title={<>Six signature <em>flavours.</em></>}>
          Every Falooda is layered to order and served chilled.
        </SectionHead>

        <ul className="cards">
          {FLAVOURS.map((f, i) => (
            <li key={f.id}>
              <article className="card" data-flavour={f.id} style={{ '--glow': f.glow, '--bg': `url(${FLAVOUR_BG(f.id)})` }} onClick={(e) => !e.target.closest('a, button') && setSheet(f)}>
                <button className="card-heart" aria-pressed={store.wish.includes(f.id)} aria-label={`${store.wish.includes(f.id) ? 'Remove' : 'Save'} ${f.name} ${store.wish.includes(f.id) ? 'from' : 'to'} wishlist`} onClick={(e) => wish(e, f.id)}><Heart /></button>
                <span className="card-no">0{i + 1}</span>
                <div className="card-media">
                  <div className="card-glow" aria-hidden="true" />
                  <div className="glass-box">
                    <PhotoGlass flavour={f.id} />
                  </div>
                </div>
                <div className="card-body">
                  <h3>{f.name}</h3>
                  <p>{f.desc}</p>
                  <div className="card-foot">
                    <span className="price">
                      {SITE.currency}
                      {f.price}
                    </span>
                    <div className="card-btns">
                      <a className="btn btn-dark btn-sm" href="#flavours" aria-label={`Order ${f.name}`} onClick={(e) => { e.preventDefault(); setSheet(f) }}>
                        Order Now
                      </a>
                      <AddToCart id={f.id} name={f.name} />
                    </div>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
      {sheet && <ProductSheet f={sheet} onClose={() => setSheet(null)} />}
    </section>
  )
}
