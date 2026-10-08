import { A, jellyUrl } from '../assets'

// Small flat-vector ingredients used for floating depth layers. No gradients/defs so they render
// correctly even when a sibling SVG is display:none.

const S = ({ children, className, style, vb = '0 0 60 60' }) => (
  <svg viewBox={vb} className={className} style={style} aria-hidden="true" focusable="false">
    {children}
  </svg>
)

const Img = ({ name, src, className, style }) => (
  <img className={`ing${className ? ' ' + className : ''}`} src={src || A(name)} style={style} alt="" draggable="false" decoding="async" />
)

export const Pistachio = ({ className, style }) => <Img name="pistachio" className={className} style={style} />
export const Petal = ({ className, style }) => <Img name="petal" className={className} style={style} />
export const Jelly = ({ className, style, color = '#FF86AB' }) => <Img src={jellyUrl(color)} className={className} style={style} />
export const Basil = ({ className, style }) => <Img name="basil" className={className} style={style} />
export const Berry = ({ className, style }) => <Img name="berry" className={className} style={style} />
export const Almond = ({ className, style }) => <Img name="almond" className={className} style={style} />
export const Cherry = ({ className, style }) => <Img name="cherry" className={className} style={style} />
export const Cube = ({ className, style, color = '#FFC247' }) => (
  <S className={className} style={style} vb="0 0 100 100">
    <rect x="8" y="8" width="84" height="84" rx="20" fill={color} transform="rotate(-12 50 50)" />
    <image href={A('chunk-shade')} x="0" y="0" width="100" height="100" transform="rotate(-12 50 50)" />
  </S>
)

export const Drop = ({ className, style, color = '#EE6593', stroke }) => (
  <S className={className} style={style}>
    <path d="M30 5C40 21 48 29 48 39a18 18 0 0 1-36 0C12 29 20 21 30 5Z" fill={color} stroke={stroke} strokeWidth={stroke ? 1.6 : 0} />
    <path d="M22 36c0-5 3-9 6-13" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" strokeLinecap="round" />
  </S>
)

export const Noodles = ({ className, style }) => (
  <S className={className} style={style}>
    {[16, 25, 34, 43].map((y, i) => (
      <path
        key={y}
        d={`M6 ${y} q 8 ${i % 2 ? 8 : -8} 16 0 t 16 0 t 16 0`}
        fill="none"
        stroke="#F6B6CB"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    ))}
  </S>
)

export const ScoopIcon = ({ className, style }) => <Img name="scoop-vanilla" className={className} style={style} />

export const ING = {
  pistachio: Pistachio,
  petal: Petal,
  jelly: Jelly,
  basil: Basil,
  cube: Cube,
  berry: Berry,
  almond: Almond,
  cherry: Cherry,
}

/* Story chips: ingredient + label, one per layer */
export const CHIPS = {
  syrup: { label: 'Rose Syrup', render: () => <Drop color="#EE6593" /> },
  basil: { label: 'Basil Seeds', render: () => <Basil /> },
  sev: { label: 'Falooda Sev', render: () => <Noodles /> },
  bsev: {
    label: 'Basil & Sev',
    render: () => (
      <div className="chip-duo">
        <Basil />
        <Noodles />
      </div>
    ),
  },
  fruit: {
    label: 'Jelly & Strawberry',
    render: () => (
      <div className="chip-duo">
        <Jelly color="#E8325A" />
        <Berry />
      </div>
    ),
  },
  milk: { label: 'Chilled Milk', render: () => <Drop color="#FFF4EA" stroke="#F3CFDB" /> },
  ice: { label: 'Ice Cream', render: () => <ScoopIcon /> },
  nuts: {
    label: 'Nuts & Toppings',
    render: () => (
      <div className="chip-duo">
        <Pistachio />
        <Almond />
      </div>
    ),
  },
}
