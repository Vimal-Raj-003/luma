import { catalog } from '../catalog'

const BASE = import.meta.env.BASE_URL

/*
  The Falooda in the one premium glass, in the colours of its flavour, as a transparent cut-out of the glass alone (tools/make-flavour-visuals.mjs builds public/assets/flavours/<flavour>.webp from
  the same photograph, so the glass, garnish position and lighting are identical everywhere — only the flavour changes). Used by the menu cards, the
  product sheet, the One Glass scene and the final call to action.
*/
// the photograph's own backdrop for this flavour (bokeh, fruit, table), glass removed and extended: used as the section background
export const FLAVOUR_BG = (id) => `${BASE}assets/flavours/${id}-bg.webp`
// an image the Super Admin uploaded for this product wins over the built-in artwork
export const FLAVOUR_IMG = (id) => catalog.images[id] || `${BASE}assets/flavours/${id}.webp`

export default function PhotoGlass({ flavour = 'strawberry', className = '' }) {
  return (
    <div className={`pg ${className}`} role="img" aria-label={`${flavour} falooda`}>
      <img className="pg-img" src={FLAVOUR_IMG(flavour)} alt="" loading="lazy" decoding="async" draggable="false" />
    </div>
  )
}
