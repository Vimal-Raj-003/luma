import { SectionHead } from './Flavours'

const Leaf = () => (
  <svg viewBox="0 0 64 64" className="ico ico-leaf" aria-hidden="true">
    <g className="ico-sway">
      <path d="M32 56V30" stroke="#6FA85A" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M32 34C16 34 10 22 12 10c14 0 22 8 20 24Z" fill="#A9D58B" />
      <path d="M32 28C46 28 54 18 52 6c-14 0-22 8-20 22Z" fill="#8CC76E" />
    </g>
  </svg>
)
const Drop = () => (
  <svg viewBox="0 0 64 64" className="ico ico-drop" aria-hidden="true">
    <path className="ico-pulse" d="M32 6C44 24 52 32 52 42a20 20 0 0 1-40 0C12 32 20 24 32 6Z" fill="#F0709B" />
    <path d="M23 40c0-5 3-9 7-13" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="3.4" strokeLinecap="round" />
    <circle className="ico-ring" cx="32" cy="42" r="20" fill="none" stroke="#F0709B" strokeWidth="2" />
  </svg>
)
const Scoop = () => (
  <svg viewBox="0 0 64 64" className="ico ico-scoop" aria-hidden="true">
    <path d="M22 36h20L32 60Z" fill="#FFBE3B" />
    <g className="ico-bob">
      <path d="M13 34a19 19 0 0 1 38 0q-4 7-7.6 0t-7.4 0t-7.4 0t-7.6 0Z" fill="#FFE9D2" stroke="#F0C9A8" strokeWidth="1.6" />
      <ellipse cx="24" cy="22" rx="6" ry="3.2" fill="#fff" opacity=".7" transform="rotate(-25 24 22)" />
    </g>
  </svg>
)
const Rose = () => (
  <svg viewBox="0 0 64 64" className="ico ico-rose" aria-hidden="true">
    <g className="ico-spin">
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d="M32 32C22 28 20 14 32 8c12 6 10 20 0 24Z" fill="#F0709B" opacity=".92" transform={`rotate(${r} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="7" fill="#FFBE3B" />
    </g>
  </svg>
)

const ITEMS = [
  { i: <Leaf />, t: 'Fresh Ingredients', d: 'Real fruit, nuts and rose — nothing artificial.' },
  { i: <Drop />, t: 'Made Fresh', d: 'Layered to order, chilled and served at once.' },
  { i: <Scoop />, t: 'Premium Ice Cream', d: 'Slow-churned, creamy and never icy.' },
  { i: <Rose />, t: 'Authentic Flavours', d: 'Classic recipes with a modern, lighter hand.' },
]

export default function WhyLuma() {
  return (
    <section className="section why" id="why">
      <div className="wrap">
        <SectionHead eyebrow="Why LUMA" title={<>Small details. <em>Big delight.</em></>} center />
        <ul className="why-grid">
          {ITEMS.map((x, n) => (
            <li key={x.t} className="why-item" data-reveal data-delay={n * 0.07}>
              <div className="why-ico">{x.i}</div>
              <h3>{x.t}</h3>
              <p>{x.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
