import FaloodaGlass from './FaloodaGlass'
import { FLAVOURS, SITE } from '../data/site'

export function SectionHead({ eyebrow, title, children, center = false }) {
  return (
    <div className={`sec-head${center ? ' center' : ''}`} data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="h2" data-split>{title}</h2>
      {children && <p className="lede">{children}</p>}
    </div>
  )
}

export default function Flavours() {
  return (
    <section className="section" id="flavours">
      <div className="wrap">
        <SectionHead eyebrow="The menu" title={<>Six ways to say <em>yes.</em></>}>
          Each one built layer by layer, chilled to order.
        </SectionHead>

        <ul className="cards">
          {FLAVOURS.map((f, i) => (
            <li key={f.id} data-reveal data-delay={(i % 3) * 0.06}>
              <article className="card" style={{ '--glow': f.glow }}>
                <span className="card-no">0{i + 1}</span>
                <div className="card-media">
                  <div className="card-glow" aria-hidden="true" />
                  <div className="glass-box">
                    <FaloodaGlass palette={f.id} lite />
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
                    <a className="btn btn-dark btn-sm" href={SITE.contact.orderHref} aria-label={`Order ${f.name}`}>
                      Order Now
                    </a>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
