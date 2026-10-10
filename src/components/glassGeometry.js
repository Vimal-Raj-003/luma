// Deterministic geometry for the Falooda glass illustration. Used by tools/make-assets.mjs (which renders the ingredient sprites).
// (so the pre-rendered shading sprites line up exactly with the vector scoops).

export const rng = (seed) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const rand = rng(23)

// half-width of the bowl interior at height y (for placing seeds inside the glass)
export const hw = (y) =>
  y <= 170 ? 148
  : y <= 266 ? 148 - (y - 170) * (11 / 96)
  : y <= 351 ? 137 - (y - 266) * (31 / 85)
  : y <= 405 ? 106 - (y - 351) * (31 / 54)
  : 75 - (y - 405) * (63 / 53)

export const BOWL = 'M52 170 C52 300 118 428 188 458 L212 458 C282 428 348 300 348 170 Z'
export const BOWL_CLIP = 'M52 -520 L348 -520 L348 170 C348 300 282 428 212 458 L188 458 C118 428 52 300 52 170 Z'
export const TOP = { milk: 196, sev: 268, basil: 330, syrup: 392 }

export const waveLine = (y, amp, x0 = -100, x1 = 500, len = 80) => {
  let d = `M${x0} ${y}`
  let up = true
  for (let x = x0; x < x1; x += len / 2) {
    d += ` q ${len / 4} ${up ? -amp : amp} ${len / 2} 0`
    up = !up
  }
  return d
}
export const wave = (y, amp, bottom = 480) => `${waveLine(y, amp)} L500 ${bottom} L-100 ${bottom} Z`

/* ---------- liquid layer details ---------- */
export const BASIL = Array.from({ length: 52 }, () => {
  const y = 336 + rand() * 50
  return { x: 200 + (rand() * 2 - 1) * (hw(y) - 20), y, rot: rand() * 180, s: 0.8 + rand() * 0.45 }
})

// thin, overlapping, natural-looking noodles
const strand = (y, a, flip, off) => {
  let d = `M${20 + off} ${y}`
  let s = flip
  for (let i = 0; i < 18; i++) {
    d += ` q ${9 + rand() * 6} ${s * a * (0.6 + rand() * 0.8)} ${22 + rand() * 8} ${(rand() - 0.5) * 3}`
    s *= -1
  }
  return d
}
export const NOODLES = Array.from({ length: 17 }, (_, i) => ({
  d: strand(274 + i * 3.7, 1.6 + rand() * 3.2, i % 2 ? 1 : -1, rand() * 18),
  w: 1.3 + rand() * 1.2,
  o: 0.55 + rand() * 0.4,
}))
export const EXTRA_NOODLES = Array.from({ length: 9 }, (_, i) => ({
  d: strand(276 + i * 6.2, 2 + rand() * 3, i % 2 ? -1 : 1, rand() * 18),
  w: 1.5 + rand() * 1.1,
  o: 0.85,
}))

/* ---------- ice cream: irregular domes with ruffled skirts, speckles and scoop ridges ---------- */
export const SCOOPS = [
  { cx: 140, cy: 190, r: 56, g: 0, id: 'a' },
  { cx: 260, cy: 190, r: 56, g: 1, id: 'b' },
  { cx: 200, cy: 132, r: 54, g: 2, id: 'c' },
].map((s) => {
  const j = () => (rand() - 0.5) * 9
  let d = `M${s.cx - s.r} ${s.cy} C${s.cx - s.r + j()} ${s.cy - s.r * 1.36} ${s.cx + s.r + j()} ${s.cy - s.r * 1.36} ${s.cx + s.r} ${s.cy}`
  const n = 7
  const w = (2 * s.r) / n
  for (let k = 0; k < n; k++) d += ` q ${-w / 2} ${s.r * (0.18 + rand() * 0.2)} ${-w} 0`
  const specks = []
  while (specks.length < 16) {
    const x = s.cx + (rand() * 2 - 1) * s.r * 0.86
    const y = s.cy - rand() * s.r * 0.92
    if (((x - s.cx) / s.r) ** 2 + ((s.cy - y) / (s.r * 0.95)) ** 2 < 0.78) specks.push({ x, y, r: 0.55 + rand() * 0.7 })
  }
  const ridges = Array.from({ length: 3 }, () => {
    const x = s.cx + (rand() * 2 - 1) * s.r * 0.5
    const y = s.cy - s.r * (0.2 + rand() * 0.5)
    return `M${x - 14} ${y} q 14 ${-5 - rand() * 4} 28 ${rand() * 3}`
  })
  const ov = { x: s.cx - s.r - 12, y: s.cy - s.r * 1.3, w: s.r * 2 + 24, h: s.r * 1.3 + s.r * 0.46 }
  return { ...s, d: d + 'Z', specks, ridges, ov }
})

const onScoops = (n, minR = 0.2, maxR = 0.9) =>
  Array.from({ length: n }, () => {
    const s = SCOOPS[Math.floor(rand() * 3)]
    const ang = (-168 + rand() * 156) * (Math.PI / 180)
    const rr = s.r * (minR + rand() * (maxR - minR))
    return { x: s.cx + Math.cos(ang) * rr, y: s.cy + Math.sin(ang) * rr * 0.92 - 4, rot: rand() * 180, s: 0.7 + rand() * 0.6 }
  })
export const PISTA = onScoops(22)
export const ALMOND = onScoops(8, 0.3, 0.85)
export const SAFFRON = onScoops(12, 0.1, 0.95).map((p) => ({ ...p, rot: p.rot - 90 }))
export const PETALS = [
  { x: 160, y: 120, r: -32, s: 0.95 },
  { x: 246, y: 108, r: 30, s: 0.85 },
  { x: 110, y: 172, r: -68, s: 0.8 },
]
// sauce drizzle: cap + drips, clipped to the top scoop so only the dome edge shows
export const SAUCE =
  'M120 40 H280 V108 C268 110 262 116 258 124 q -3 18 -9 18 q -6 0 -7 -16 C238 114 232 112 226 118 q -3 26 -10 26 q -7 0 -8 -22 C202 114 196 112 190 118 q -2 14 -8 14 q -6 0 -7 -12 C168 112 160 112 150 120 L120 108Z'

export const COND = Array.from({ length: 16 }, () => {
  const y = 205 + rand() * 225
  const side = rand() < 0.5 ? -1 : 1
  return { x: 200 + side * hw(y) * (0.55 + rand() * 0.4), y, rx: 1 + rand() * 1.4, ry: 1.5 + rand() * 2.2 }
})
export const BUBBLES = Array.from({ length: 9 }, () => ({ x: 90 + rand() * 220, y: 215 + rand() * 110, r: 1 + rand() * 1.8, d: 5 + rand() * 6, l: -rand() * 8 }))

