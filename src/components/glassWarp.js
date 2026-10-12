/*
  Reshapes the photographed glass into a taller, more elegant falooda glass. The photograph's glass is a short, straight-sided tumbler; this
  is a smooth, continuous warp of each frame (no cut-and-paste):
    vertical : the body of the glass is stretched (layers get taller, so syrup / seeds / jelly / sev read more clearly), the foot is made
               heavier, the area above the rim (the scoop and toppings) is left alone so nothing is stretched out of shape
    horizontal: the glass flares towards the rim and tapers gently towards the foot (a tulip silhouette)
  Used by tools/make-falooda-frames.mjs (which bakes it into public/hero-frames-v2) and by Hero.jsx (to place things in the new frame).
  All numbers are in pixels of the 1920×1080 source frame.
*/
export const SRC_W = 1920
export const SRC_H = 1080

const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

// vertical scale at a source row: 1 above the rim, BODY through the glass, FOOT in the heavy base ring, 1 on the table
const BODY = 1.42
const FOOT = 1.25
const vs = (y) => 1 + (BODY - 1) * sm(250, 340, y) * (1 - sm(850, 900, y)) + (FOOT - 1) * sm(868, 892, y) * (1 - sm(944, 962, y))

// cumulative: output row of every source row
const F = new Float64Array(SRC_H + 1)
for (let y = 1; y <= SRC_H; y++) F[y] = F[y - 1] + vs(y - 0.5)
export const OUT_H = Math.round(F[SRC_H])
export const mapY = (y) => { const i = Math.max(0, Math.min(SRC_H - 1, Math.floor(y))); return F[i] + (F[i + 1] - F[i]) * (y - i) }
export const invY = (yo) => { // output row → source row
  let lo = 0, hi = SRC_H
  while (hi - lo > 0.01) { const m = (lo + hi) / 2; if (mapY(m) < yo) lo = m; else hi = m }
  return (lo + hi) / 2
}

// horizontal scale about the glass axis at a source row: opens up towards the rim, narrows to a slim waist, then spreads into a wide heavy foot
export const GLASS_CX = 1180
const TOP = 1.24 // at the rim
const WAIST = 0.8 // just above the foot
const FOOTW = 1.1 // the foot ring
export const hs = (y) => {
  if (y < 285) return 1 + (TOP - 1) * sm(60, 285, y) // the scoop gets a little room as the glass opens
  const body = TOP + (WAIST - TOP) * sm(285, 872, y)
  const foot = body + (FOOTW - body) * sm(872, 930, y)
  return foot + (1 - foot) * sm(940, 1010, y)
}
