import { SectionHead } from './Flavours'
import { SITE } from '../data/site'

export default function Visit() {
  return (
    <section className="section visit" id="visit">
      <div className="wrap visit-grid">
        <div>
          <SectionHead eyebrow="Find us" title={<>Visit <em>LUMA</em></>} />
          <address className="addr">
            {SITE.address.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </address>

          <dl className="hours">
            {SITE.hours.map(([d, h]) => (
              <div key={d}>
                <dt>{d}</dt>
                <dd>{h}</dd>
              </div>
            ))}
          </dl>

          <div className="hero-cta">
            <a className="btn btn-dark" href={SITE.contact.phoneHref} id="contact">Contact Us</a>
            <a className="btn btn-ghost" href={SITE.contact.directionsHref}>
              Get Directions
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 15L15 5M7 5h8v8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
        </div>

        {/* Placeholder map tile — swap for an embed later */}
        <div className="map" role="img" aria-label="Map placeholder">
          <svg viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect width="400" height="320" fill="#FBEFE0" />
            <path d="M-20 80C80 60 140 140 230 110S380 40 430 70" stroke="#fff" strokeWidth="26" fill="none" />
            <path d="M60 340C90 240 160 220 200 160S300 100 330 -20" stroke="#fff" strokeWidth="20" fill="none" />
            <path d="M-20 250C100 230 220 280 430 220" stroke="#fff" strokeWidth="14" fill="none" />
            <circle cx="320" cy="250" r="46" fill="#E2F0D2" />
            <circle cx="90" cy="150" r="34" fill="#FFE0E9" />
            <g transform="translate(200 150)">
              <circle r="34" fill="#F0709B" opacity=".18" className="pin-pulse" />
              <path d="M0 24C-14 6-18-2-18-10a18 18 0 0 1 36 0C18-2 14 6 0 24Z" fill="#4A1942" />
              <circle cy="-10" r="6.5" fill="#FFF6E8" />
            </g>
          </svg>
          <span className="map-tag">Map placeholder</span>
        </div>
      </div>
    </section>
  )
}
