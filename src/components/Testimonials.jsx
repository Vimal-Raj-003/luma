import { useEffect, useRef } from 'react'
import { SectionHead } from './Flavours'
import { REVIEWS } from '../data/site'
import { prefersReduced } from '../hooks/motion'

const Stars = () => (
  <div className="stars" aria-label="5 out of 5">
    {Array.from({ length: 5 }, (_, i) => (
      <svg key={i} viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
        <path d="M10 1.5l2.5 5.4 5.9.7-4.4 4 1.2 5.8L10 14.5 4.8 17.4 6 11.6 1.6 7.6l5.9-.7z" fill="#FFB627" />
      </svg>
    ))}
  </div>
)

export default function Testimonials() {
  const track = useRef(null)
  const paused = useRef(false)

  const go = (dir) => {
    const t = track.current
    const card = t.querySelector('.review')
    t.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: 'smooth' })
  }

  // gentle autoplay, paused on hover/touch/focus and for reduced motion
  useEffect(() => {
    if (prefersReduced()) return
    const t = track.current
    const id = setInterval(() => {
      if (paused.current) return
      const end = t.scrollLeft + t.clientWidth >= t.scrollWidth - 8
      if (end) t.scrollTo({ left: 0, behavior: 'smooth' })
      else go(1)
    }, 4800)
    return () => clearInterval(id)
  }, [])

  const hold = (v) => () => (paused.current = v)

  return (
    <section className="section reviews" id="reviews">
      <div className="wrap">
        <div className="rev-head">
          <SectionHead eyebrow="Kind words" title={<>Loved, <em>layer by layer.</em></>} />
          <div className="rev-nav" data-reveal>
            <button onClick={() => go(-1)} aria-label="Previous review">
              <svg viewBox="0 0 20 20" width="18" height="18"><path d="M12 4l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => go(1)} aria-label="Next review">
              <svg viewBox="0 0 20 20" width="18" height="18"><path d="M8 4l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>
      <div
        data-reveal
        className="rev-track"
        ref={track}
        tabIndex={0}
        aria-label="Customer reviews"
        onPointerEnter={hold(true)}
        onPointerLeave={hold(false)}
        onTouchStart={hold(true)}
        onFocus={hold(true)}
        onBlur={hold(false)}
      >
        {REVIEWS.map((r, i) => (
          <figure className="review" key={i}>
            <span className="q" aria-hidden="true">“</span>
            <Stars />
            <blockquote>{r.quote}</blockquote>
            <figcaption>
              <b>{r.who}</b>
              <span>{r.tag}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
