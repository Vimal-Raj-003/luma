import { useId } from 'react'
import { PALETTES } from '../data/site'
import { A, jellyUrl } from '../assets'
import {
  BOWL, BOWL_CLIP, TOP, waveLine, wave, BASIL, NOODLES, EXTRA_NOODLES, SCOOPS, PISTA, ALMOND, SAFFRON, PETALS, SAUCE, COND, BUBBLES,
} from './glassGeometry'

/*
  The hero product: a layered Falooda in a transparent tulip glass, drawn as SVG.
  Layers (bottom → top): rose syrup, basil seeds, falooda sev, chilled milk, ice cream, nuts & toppings.
  - Colours come from a palette and CSS-transition between palettes (flavour switching).
  - Each layer is a `.fl-layer.fl-<name>` group so scroll timelines can pour them in.
  - Geometry is deterministic and computed once at module load. No SVG filters (cheap to transform).
*/

const DEFAULT_SHOW = {
  basil: true, jelly: true, sev: true, fruit: true,
  pistachio: true, almond: true, petals: true, cherry: true, sauce: true,
  cream: false, saffron: false, extraSev: false,
}

// gel cube: transparent PNG sprite (cube occupies 76/120 of the image)
const Jel = ({ x, y, s, r, c }) => {
  const k = s * 1.58
  return (
    <g className="tp" data-ry={y}>
      <g transform={`translate(${x} ${y}) rotate(${r})`}>
        <image href={jellyUrl(c)} x={-k / 2} y={-k / 2} width={k} height={k} />
      </g>
    </g>
  )
}

// fruit chunk: palette-coloured body + pre-rendered pulp shading sprite
const BERRY_COLOURS = new Set(['#FF5A78', '#FF6A82'])

// fruit piece: a real strawberry-slice sprite for berry palettes, otherwise a shaded chunk
const Chunk = ({ x, y, s, r, fill, berry }) => {
  const k = (s * 100) / 84
  const b = s * 1.5
  return (
    <g className="tp" data-ry={y}>
      <g transform={`translate(${x} ${y}) rotate(${r})`}>
        {berry ? (
          <image href={A('berry')} x={-b / 2} y={-b / 2} width={b} height={b} />
        ) : (
          <>
            <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.24} style={{ fill }} className="tf" />
            <image href={A('chunk-shade')} x={-k / 2} y={-k / 2} width={k} height={k} />
          </>
        )}
      </g>
    </g>
  )
}

// slow ribbons of syrup colour folding through the milk
const Swirl = ({ ys, color }) => (
  <g className="fl-swirl">
    {ys.map((y, i) => (
      <path
        key={i}
        d={`M20 ${y} C 90 ${y - 20 - i * 3} 140 ${y + 24} 210 ${y + 2} S 330 ${y - 16} 400 ${y + 8}`}
        fill="none"
        strokeLinecap="round"
        strokeWidth={9 - i * 1.6}
        style={{ stroke: color, animationDuration: `${6 + i * 1.7}s`, animationDelay: `${-i * 1.3}s` }}
      />
    ))}
  </g>
)

export default function FaloodaGlass({ palette = 'rose', custom, show, animated = false, lite = false, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const id = (n) => `${uid}-${n}`
  const p = custom || PALETTES[palette]
  const sh = { ...DEFAULT_SHOW, ...show }
  const t = (key) => `fl-t fl-k-${key}${sh[key] ? '' : ' off'}`
  const sc = p.scoops
  const nBasil = lite ? 26 : BASIL.length
  const nPista = lite ? 12 : PISTA.length
  const nNoodle = lite ? 10 : NOODLES.length
  const berry = BERRY_COLOURS.has(p.fruit)

  return (
    <svg
      className={`fl-glass ${animated ? 'is-animated' : ''} ${className}`}
      viewBox="0 20 400 560"
      role="img"
      aria-label="A layered Falooda in a tall glass"
    >
      <defs>
        <clipPath id={id('bowl')}>
          <path d={BOWL_CLIP} />
        </clipPath>
        <clipPath id={id('scC')}>
          <path d={SCOOPS[2].d} />
        </clipPath>
        <linearGradient id={id('syrup')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: p.syrup[0] }} />
          <stop offset="1" style={{ stopColor: p.syrup[1] }} />
        </linearGradient>
        <linearGradient id={id('milk')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: p.milk[0] }} />
          <stop offset="1" style={{ stopColor: p.milk[1] }} />
        </linearGradient>
        <linearGradient id={id('basil')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: p.milk[1], stopOpacity: 0.8 }} />
          <stop offset="1" style={{ stopColor: p.syrup[0], stopOpacity: 0.8 }} />
        </linearGradient>
        {sc.map((s, i) => (
          <radialGradient key={i} id={id(`sc${i}`)} cx=".34" cy=".26" r=".95">
            <stop offset="0" style={{ stopColor: s[0] }} />
            <stop offset=".62" style={{ stopColor: s[0] }} />
            <stop offset="1" style={{ stopColor: s[1] }} />
          </radialGradient>
        ))}
        <linearGradient id={id('scshade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".5" stopColor="#4A1942" stopOpacity="0" />
          <stop offset="1" stopColor="#4A1942" stopOpacity=".2" />
        </linearGradient>
        {/* glass volume: edges of the liquid read darker/denser, as light travels through more glass */}
        <linearGradient id={id('vol')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4A1942" stopOpacity=".26" />
          <stop offset=".2" stopColor="#4A1942" stopOpacity=".03" />
          <stop offset=".62" stopColor="#4A1942" stopOpacity="0" />
          <stop offset="1" stopColor="#4A1942" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id={id('volv')} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" stopColor="#4A1942" stopOpacity="0" />
          <stop offset="1" stopColor="#4A1942" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".34" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('glintL')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset=".7" stopColor="#fff" stopOpacity=".18" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('shell')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" />
          <stop offset=".28" stopColor="#fff" stopOpacity=".05" />
          <stop offset=".72" stopColor="#fff" stopOpacity=".02" />
          <stop offset="1" stopColor="#fff" stopOpacity=".36" />
        </linearGradient>
        <linearGradient id={id('stem')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".8" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".7" stopColor="#4A1942" stopOpacity=".07" />
          <stop offset="1" stopColor="#fff" stopOpacity=".6" />
        </linearGradient>
        <radialGradient id={id('shadow')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#4A1942" stopOpacity=".3" />
          <stop offset="1" stopColor="#4A1942" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('caustic')} cx=".5" cy=".5" r=".5">
          <stop offset="0" style={{ stopColor: p.syrup[0], stopOpacity: 0.5 }} />
          <stop offset="1" style={{ stopColor: p.syrup[0], stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={id('cherry')} cx=".34" cy=".3" r=".85">
          <stop offset="0" stopColor="#D8345C" />
          <stop offset=".6" stopColor="#A81238" />
          <stop offset="1" stopColor="#6E0A27" />
        </radialGradient>
      </defs>

      {/* ground shadow + light coloured by the liquid, cast through the glass */}
      <ellipse cx="200" cy="568" rx="132" ry="12" fill={`url(#${id('shadow')})`} />
      <ellipse cx="214" cy="569" rx="82" ry="8" fill={`url(#${id('caustic')})`} />

      {/* glass back wall */}
      <path d={BOWL} fill="#fff" fillOpacity=".2" />

      {/* ---------- liquid layers (clipped to the bowl) ---------- */}
      <g clipPath={`url(#${id('bowl')})`}>
        <g className="fl-layer fl-milk">
          <g className="fl-drift d1">
            <g className="fl-body">
              <path d={wave(TOP.milk, 5)} fill={`url(#${id('milk')})`} />
              <path d={waveLine(TOP.milk + 3, 5)} fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="6" />
              <path d={waveLine(TOP.milk, 5)} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" />
              <Swirl ys={[214, 238, 258]} color={p.syrup[0]} />
            </g>
            <g className="fl-bubbles">
              {BUBBLES.map((b, i) => (
                <circle key={i} className="fl-bub" cx={b.x} cy={b.y} r={b.r} fill="#fff" fillOpacity=".18" stroke="#fff" strokeOpacity=".7" strokeWidth=".6" style={{ animationDuration: `${b.d}s`, animationDelay: `${b.l}s` }} />
              ))}
            </g>
            <g className={t('fruit')}>
              <Chunk x={119} y={233} s={21} r={-14} fill={p.fruit} berry={berry} />
              <Chunk x={278} y={224} s={19} r={18} fill={p.fruit} berry={berry} />
              <Chunk x={195} y={247} s={17} r={-6} fill={p.fruit} berry={berry} />
            </g>
            <g className={t('jelly')}>
              <Jel x={236} y={246} s={17} r={-10} c={p.jelly[0]} />
              <Jel x={150} y={252} s={15} r={14} c={p.jelly[2]} />
            </g>
            <circle cx="96" cy="222" r="2.4" fill="#fff" opacity=".4" />
            <circle cx="310" cy="236" r="2" fill="#fff" opacity=".4" />
            <circle cx="216" cy="216" r="1.6" fill="#fff" opacity=".45" />
          </g>
        </g>

        <g className="fl-layer fl-sev">
          <g className="fl-drift d2">
            <g className="fl-body">
              <path d={wave(TOP.sev, 4.5)} fill={`url(#${id('milk')})`} />
              <path d={wave(TOP.sev, 4.5)} fill="#fff" opacity=".14" />
              <path d={waveLine(TOP.sev, 4.5)} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1" />
              <Swirl ys={[284, 306]} color={p.syrup[0]} />
            </g>
            <g className={t('sev')}>
              {NOODLES.slice(0, nNoodle).map((n, i) => (
                <g key={i} className="tp" data-ry="300">
                  <path d={n.d} pathLength="1" fill="none" stroke="#4A1942" strokeOpacity=".12" strokeWidth={n.w} strokeLinecap="round" transform="translate(0 1.2)" />
                  <path d={n.d} pathLength="1" fill="none" stroke="#fff" strokeOpacity={n.o} strokeWidth={n.w} strokeLinecap="round" />
                </g>
              ))}
            </g>
            <g className={t('extraSev')}>
              {EXTRA_NOODLES.map((n, i) => (
                <path key={i} className="tp" d={n.d} fill="none" stroke="#fff" strokeOpacity={n.o} strokeWidth={n.w} strokeLinecap="round" />
              ))}
            </g>
          </g>
        </g>

        <g className="fl-layer fl-basil">
          <g className="fl-drift d3">
            <g className="fl-body">
              <path d={wave(TOP.basil, 4)} fill={`url(#${id('basil')})`} />
              <path d={waveLine(TOP.basil + 3, 4)} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="6" />
              <path d={waveLine(TOP.basil, 4)} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.1" />
            </g>
            <g className={t('basil')}>
              {BASIL.slice(0, nBasil).map((b, i) => (
                <g key={i} className="tp" data-ry={b.y}><g transform={`rotate(${b.rot} ${b.x} ${b.y}) scale(${b.s})`} style={{ transformOrigin: `${b.x}px ${b.y}px` }}>
                  <image href={A('basil')} x={b.x - 8.6} y={b.y - 10.8} width="17.2" height="21.5" />
                </g></g>
              ))}
            </g>
            <g className={t('jelly')}>
              <Jel x={160} y={358} s={19} r={-12} c={p.jelly[1]} />
              <Jel x={246} y={348} s={17} r={16} c={p.jelly[0]} />
              <Jel x={206} y={372} s={14} r={8} c={p.jelly[2]} />
            </g>
          </g>
        </g>

        <g className="fl-layer fl-syrup">
          <g className="fl-drift d4">
            <g className="fl-body">
              {/* syrup bleeding upward into the basil layer */}
              {[150, 212, 262].map((x, i) => (
                <ellipse key={x} cx={x} cy={394 - i * 2} rx={10 + i * 2} ry={16 + i * 3} style={{ fill: p.syrup[0] }} className="tf" opacity=".22" />
              ))}
              <path d={wave(TOP.syrup, 4)} fill={`url(#${id('syrup')})`} />
              <path d={waveLine(TOP.syrup + 3, 4)} fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="6" />
              <path d={waveLine(TOP.syrup, 4)} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.1" />
              <ellipse cx="150" cy="420" rx="24" ry="4" fill="#fff" opacity=".14" transform="rotate(-8 150 420)" />
              <circle cx="226" cy="432" r="2.4" fill="#fff" opacity=".22" />
              <circle cx="180" cy="444" r="1.6" fill="#fff" opacity=".22" />
            </g>
            <g className={t('jelly')}>
              <Jel x={196} y={420} s={15} r={10} c={p.jelly[1]} />
            </g>
          </g>
        </g>

        {/* glass volume + travelling sheen: sits over the liquid, fades in once the glass is full */}
        <g className="fl-vol">
          <rect x="40" y="170" width="320" height="300" fill={`url(#${id('vol')})`} />
          <rect x="40" y="170" width="320" height="300" fill={`url(#${id('volv')})`} />
          <rect className="fl-sheen" x="-30" y="170" width="64" height="300" fill={`url(#${id('sheen')})`} />
        </g>
      </g>

      {/* ---------- ice cream ---------- */}
      <g className="fl-layer fl-ice">
        {SCOOPS.map((s) => (
          <g key={s.id} className="fl-scoop">
            <ellipse cx={s.cx} cy={s.cy + 6} rx={s.r * 0.95} ry="7" fill="#4A1942" opacity=".13" />
            <path d={s.d} fill={`url(#${id(`sc${s.g}`)})`} />
            <image href={A(`scoop-shade-${s.id}`)} x={s.ov.x} y={s.ov.y} width={s.ov.w} height={s.ov.h} />
          </g>
        ))}
        <g className="fl-sauce"><g className={t('sauce')} clipPath={`url(#${id('scC')})`}>
          <path d={SAUCE} style={{ fill: p.syrup[0] }} className="tf" opacity=".92" />
          <path d={SAUCE} fill="none" style={{ stroke: p.syrup[1] }} strokeOpacity=".4" strokeWidth="1.2" className="tf" transform="translate(0 2)" />
          <path d="M160 106 C176 98 196 98 212 104" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
        </g></g>
      </g>

      {/* pour stream used by the scroll story (hidden until animated) */}
      <rect className="fl-pour" x="195.5" y="30" width="9" height="0" rx="4.5" opacity="0" fill="#fff" />
      <ellipse className="fl-ripple" cx="200" cy="392" rx="12" ry="2.4" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" opacity="0" />
      <g className="fl-splash">
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} className="fl-drop" cx={196 + (i - 4) * 2.2} cy="392" r={1.6 + (i % 3) * 0.7} fill="#fff" opacity="0" />
        ))}
      </g>

      {/* ---------- nuts & toppings ---------- */}
      <g className="fl-layer fl-top">
        <g className={t('saffron')}>
          {SAFFRON.map((s, i) => (
            <g key={i} className="tp"><path d="M0 0 q 4 -7 10 -3" transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`} fill="none" stroke="#F28A12" strokeWidth="1.2" strokeLinecap="round" /></g>
          ))}
        </g>
        <g className={t('pistachio')}>
          {PISTA.slice(0, nPista).map((s, i) => (
            <g key={i} className="tp"><image href={A(i % 4 === 0 ? 'pistachio' : 'pistachio-chip')} x="-7.5" y="-7.5" width="15" height="15" transform={`translate(${s.x} ${s.y}) rotate(${s.rot}) scale(${s.s})`} /></g>
          ))}
        </g>
        <g className={t('almond')}>
          {ALMOND.map((s, i) => (
            <g key={i} className="tp"><image href={A('almond')} x="-10" y="-6.3" width="20" height="12.5" transform={`translate(${s.x} ${s.y}) rotate(${s.rot}) scale(${0.9 + s.s * 0.3})`} /></g>
          ))}
        </g>
        <g className={t('petals')}>
          {PETALS.map((s, i) => (
            <g key={i} className="tp"><g transform={`translate(${s.x} ${s.y}) rotate(${s.r}) scale(${s.s})`}>
              <image href={A(i % 2 ? 'petal-2' : 'petal')} x="-16" y="-31" width="32" height="34" />
            </g></g>
          ))}
        </g>
        <g className={t('cream')}><g className="tp">
          <path d="M168 96 q-4 -14 14 -18 q4 -14 22 -10 q18 -2 20 12 q16 4 12 16 q-2 8 -14 8 h-40 q-18 0 -14 -8Z" fill="#FFFDF8" />
          <path d="M176 92 q20 -8 44 0" fill="none" stroke="#EADBC8" strokeWidth="2" strokeLinecap="round" />
          <path d="M184 80 q14 -6 28 0" fill="none" stroke="#EADBC8" strokeWidth="1.6" strokeLinecap="round" />
        </g></g>
        <g className={t('cherry')}><g className="tp">
          <image href={A('cherry')} x="181.6" y="54" width="39" height="47.4" />
        </g></g>
      </g>

      {/* ---------- glass shell: wall thickness, rim, tapered reflections ---------- */}
      <path d={BOWL} fill={`url(#${id('shell')})`} />
      <path d={BOWL} fill="none" stroke="#4A1942" strokeOpacity=".14" strokeWidth="1.4" />
      <path d={BOWL} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2" transform="translate(0 -.6)" />
      <path d={BOWL} fill="none" stroke="#fff" strokeOpacity=".34" strokeWidth="1.1" transform="translate(200 172) scale(.958 .962) translate(-200 -172)" />
      <ellipse cx="200" cy="170" rx="148" ry="14" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="2.4" />
      <ellipse cx="200" cy="170" rx="148" ry="14" fill="none" stroke="#4A1942" strokeOpacity=".13" strokeWidth="1" />
      <ellipse cx="200" cy="171" rx="142" ry="11.5" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1" />
      <path d="M62 178 A148 14 0 0 1 112 160" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="2.6" strokeLinecap="round" />
      {/* long tapered reflection, left */}
      <path d="M72 192 C74 296 120 396 174 442 C126 392 90 300 84 192Z" fill={`url(#${id('glintL')})`} />
      <path d="M92 188 C92 214 95 238 99 260 C96 240 94 216 94 188Z" fill="#fff" opacity=".8" />
      {/* thin reflection, right */}
      <path d="M328 204 C324 264 306 320 282 358 C304 322 318 266 322 204Z" fill="#fff" opacity=".34" />
      {/* soft window reflection */}
      <path d="M232 178 C236 232 230 292 218 346 L240 340 C250 288 252 232 246 178Z" fill="#fff" opacity=".07" />

      {/* condensation on the outside of the bowl */}
      <g className="fl-cond">
        {COND.map((c, i) => (
          <g key={i}>
            <ellipse cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} fill="#fff" fillOpacity=".2" stroke="#fff" strokeOpacity=".65" strokeWidth=".6" />
            <ellipse cx={c.x - c.rx * 0.3} cy={c.y - c.ry * 0.35} rx={c.rx * 0.35} ry={c.ry * 0.3} fill="#fff" opacity=".9" />
          </g>
        ))}
      </g>

      {/* stem + foot */}
      <rect x="188" y="452" width="24" height="86" fill={`url(#${id('stem')})`} />
      <rect x="188" y="452" width="24" height="86" fill="none" stroke="#4A1942" strokeOpacity=".12" />
      <ellipse cx="200" cy="494" rx="19" ry="6.5" fill={`url(#${id('stem')})`} stroke="#4A1942" strokeOpacity=".14" />
      <ellipse cx="197" cy="493" rx="9" ry="2.2" fill="#fff" opacity=".5" />
      <path d="M200 534 C150 536 112 544 112 554 C112 566 150 572 200 572 C250 572 288 566 288 554 C288 544 250 536 200 534Z" fill={`url(#${id('stem')})`} stroke="#4A1942" strokeOpacity=".15" />
      <ellipse cx="200" cy="545" rx="64" ry="7" fill="#fff" opacity=".42" />
      <path d="M126 556 C150 566 250 566 274 556" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
