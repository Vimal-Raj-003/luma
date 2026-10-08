// Retouching shared by the video renderer and the photo-asset exporter (floating items thinned, empty-glass plate,
// left edge extended). Source stills live in tools/hero-src/.
export const SRC = '/tools/hero-src/'
export const EXT = 120 // px added on the left of every still
export const W = 1792
export const H = 941

const load = (name) =>
  new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = `${SRC}${name}.jpg`
  })

/* ---------- retouching ---------- */
function extend(img) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const x = c.getContext('2d')
  const CUT = 8 // the stills carry a dark 1-2px edge; trim a few px so it never reaches the seam
  // mirrored strip first (extends 40px under the photo so the blur's soft edge is hidden), slightly blurred so it
  // reads as more out-of-focus bokeh; then the photo on top
  x.save()
  x.filter = 'blur(5px)'
  x.translate(EXT + CUT, 0) // mirror axis == the photo's first visible column, so the two halves meet pixel-for-pixel
  x.scale(-1, 1)
  x.drawImage(img, 0, 0, EXT + CUT + 60, H, -CUT, 0, EXT + CUT + 60, H) // starts CUT px "inside" the photo: hides the blur's soft edge
  x.restore()
  x.drawImage(img, CUT, 0, img.width - CUT, H, EXT + CUT, 0, img.width - CUT, H)
  return c
}

const mean = (ctx, pts) => {
  let r = 0, g = 0, b2 = 0
  pts.forEach(([px, py]) => {
    const d = ctx.getImageData(Math.max(0, Math.round(px) - 3), Math.max(0, Math.round(py) - 3), 6, 6).data
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b2 += d[i + 2] }
  })
  const n = pts.length * 36
  return [r / n, g / n, b2 / n]
}
const ring = (cx, cy, rx, ry, k) => Array.from({ length: 16 }, (_, i) => [cx + Math.cos((i / 16) * 6.283) * rx * k, cy + Math.sin((i / 16) * 6.283) * ry * k])

// clone a soft-edged patch of nearby background over a floating item, colour-matched to its surroundings
function patch(c, { x, y, rx, ry, sx, sy }) {
  const ctx = c.getContext('2d', { willReadFrequently: true })
  const w = Math.ceil(rx * 2 + 40)
  const h = Math.ceil(ry * 2 + 40)
  const t = document.createElement('canvas')
  t.width = w
  t.height = h
  const tx = t.getContext('2d', { willReadFrequently: true })
  tx.drawImage(c, sx + EXT - w / 2, sy - h / 2, w, h, 0, 0, w, h)
  // match brightness/colour: ring around the destination vs. ring around the source
  const dst = mean(ctx, ring(x + EXT, y, rx, ry, 1.45))
  const src = mean(ctx, ring(sx + EXT, sy, rx, ry, 1.45))
  const delta = dst.map((v, i) => v - src[i])
  const img = tx.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + delta[0]))
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + delta[1]))
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + delta[2]))
  }
  tx.putImageData(img, 0, 0)
  // feathered elliptical edge
  const m = document.createElement('canvas')
  m.width = w
  m.height = h
  const mx = m.getContext('2d')
  mx.translate(w / 2, h / 2)
  mx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry))
  const R = Math.max(rx, ry)
  const g = mx.createRadialGradient(0, 0, 0, 0, 0, R + 18)
  g.addColorStop(0, '#000')
  g.addColorStop(0.7, '#000')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  mx.fillStyle = g
  mx.fillRect(-w, -h, w * 2, h * 2)
  tx.globalCompositeOperation = 'destination-in'
  tx.drawImage(m, 0, 0)
  ctx.drawImage(t, x + EXT - w / 2, y - h / 2)
}

// ~35% fewer floating strawberries / jelly cubes in every still
const PATCHES = {
  'shot-final': [
    { x: 1270, y: 62, rx: 100, ry: 92, sx: 1566, sy: 70 }, // top strawberry (also touched the top edge)
    { x: 666, y: 316, rx: 66, ry: 66, sx: 470, sy: 250 }, // left jelly
    { x: 1475, y: 226, rx: 72, ry: 70, sx: 1585, sy: 90 }, // right jelly
  ],
  'shot-splash': [
    { x: 610, y: 312, rx: 70, ry: 66, sx: 470, sy: 250 },
    { x: 1468, y: 190, rx: 78, ry: 74, sx: 1585, sy: 80 },
    { x: 700, y: 482, rx: 80, ry: 80, sx: 470, sy: 560 },
  ],
  'shot-pour': [
    { x: 692, y: 202, rx: 70, ry: 66, sx: 470, sy: 160 },
    { x: 1372, y: 352, rx: 72, ry: 66, sx: 1585, sy: 170 },
  ],
  'shot-empty': [
    { x: 650, y: 352, rx: 66, ry: 62, sx: 470, sy: 250 },
    { x: 1405, y: 525, rx: 72, ry: 66, sx: 1585, sy: 600 },
  ],
}

// the empty-glass plate: paint the syrup out of the glass by stretching clean glass wall/air downward
function emptied(c) {
  const x = c.getContext('2d')
  const sx0 = 880 + EXT, sx1 = 1180 + EXT
  const w = sx1 - sx0
  const t = document.createElement('canvas')
  t.width = w
  t.height = 230
  const tx = t.getContext('2d')
  tx.drawImage(c, sx0, 318, w, 100, 0, 0, w, 230) // plain glass above the flutes, stretched down
  tx.globalCompositeOperation = 'destination-in'
  const g = tx.createLinearGradient(0, 0, 0, 230)
  g.addColorStop(0, 'transparent')
  g.addColorStop(0.16, '#000')
  g.addColorStop(0.9, '#000')
  g.addColorStop(1, 'transparent')
  tx.fillStyle = g
  tx.fillRect(0, 0, w, 230)
  x.drawImage(t, sx0, 592)
}

export async function prep() {
  const names = ['shot-empty', 'shot-pour', 'shot-splash', 'shot-final']
  const imgs = await Promise.all(names.map(load))
  const out = {}
  names.forEach((n, i) => {
    const c = extend(imgs[i])
    ;(PATCHES[n] || []).forEach((p) => patch(c, p))
    out[n] = c
  })
  // raw (un-emptied) copy of the empty still for the syrup layer
  const syrup = document.createElement('canvas')
  syrup.width = W
  syrup.height = H
  syrup.getContext('2d').drawImage(out['shot-empty'], 0, 0)
  emptied(out['shot-empty'])
  return { empty: out['shot-empty'], syrup, pour: out['shot-pour'], splash: out['shot-splash'], final: out['shot-final'] }
}

