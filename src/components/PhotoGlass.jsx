const BASE = import.meta.env.BASE_URL

/*
  A real photograph of the Falooda, recoloured per flavour. Only the dessert is tinted (the glass interior and the
  scoop are clipped out of a second copy of the photo and colour-graded); the glass edge, reflections, bokeh and
  table keep their original look. Because the grade is a CSS filter, flavour changes interpolate smoothly.
  All filters list the same functions in the same order so they can transition.
*/
const f = (hue, sat, bri, con, sep) => `hue-rotate(${hue}deg) saturate(${sat}) brightness(${bri}) contrast(${con}) sepia(${sep})`
export const GRADE = {
  strawberry: f(0, 1, 1, 1, 0),
  rose: f(-12, 0.85, 1.1, 0.97, 0),
  mango: f(36, 1.2, 1.14, 1, 0.05),
  pistachio: f(116, 0.62, 1.14, 0.98, 0.18),
  chocolate: f(24, 0.55, 0.62, 1.15, 0.35),
  dryfruit: f(38, 0.8, 1.08, 1, 0.35),
}

export default function PhotoGlass({ flavour = 'strawberry', className = '' }) {
  const src = `${BASE}assets/photo/final.jpg`
  const grade = GRADE[flavour] || GRADE.strawberry
  return (
    <div className={`pg ${className}`} role="img" aria-label={`${flavour} falooda`}>
      <img className="pg-l" src={src} alt="" loading="lazy" decoding="async" />
      <img className="pg-l pg-tint pg-in" src={src} alt="" loading="lazy" decoding="async" style={{ filter: grade }} />
      <img className="pg-l pg-tint pg-scoop" src={src} alt="" loading="lazy" decoding="async" style={{ filter: grade }} />
    </div>
  )
}
