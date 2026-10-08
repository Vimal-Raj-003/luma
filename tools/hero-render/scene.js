import gsap from 'gsap'
import './scene.css'

/*
  Render scene for the LUMA hero video. Built from the four reference stills (same studio, same table):
  the stills are retouched (floating items thinned out, an empty-glass plate made, the left edge extended so the
  Falooda can sit right of centre), then composited in stages with reveal masks, so the dessert is "built" in front
  of the camera. tools/render-hero.mjs steps this timeline frame by frame and encodes the result.

    0.0  fade up from black, empty glass rises           9.0  jelly + strawberry
    1.6  empty glass, held                              11.0  ice cream drops
    2.6  syrup                                          12.9  toppings, syrup drizzle
    4.6  basil seeds + sev                              14.4  hold (text is overlaid by the page here)
    6.6  milk                                           15.8  dissolve to the empty glass → black (loop point)
*/

const params = new URLSearchParams(location.search)
const MODE = params.get('mode') === 'portrait' ? 'portrait' : 'desktop'
const SRC = '/tools/hero-src/'
const EXT = 120 // px added on the left of every still
const W = 1792
const H = 941
export const DURATION = 17.2

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

async function prep() {
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
  const url = (c) => c.toDataURL('image/jpeg', 0.96)
  return { empty: url(out['shot-empty']), syrup: url(syrup), pour: url(out['shot-pour']), splash: url(out['shot-splash']), final: url(out['shot-final']) }
}

const U = await prep()

/* ---------- DOM ---------- */
const app = document.getElementById('app')
app.innerHTML = `
<div class="fit" id="fit"><div class="cam" id="cam"><div class="rise" id="rise">
  <img class="layer base" src="${U.empty}">
  <div class="stack" id="stack">
    <img class="layer out o3a" src="${U.pour}">
    <img class="layer out nostream o3b" src="${U.pour}">
    <img class="layer scoop sc" src="${U.splash}">
    <img class="layer out o2" src="${U.splash}">
    <img class="layer out o1" src="${U.final}">
    <img class="layer in i1" src="${U.syrup}">
    <img class="layer in i2" src="${U.final}">
    <img class="layer in i3" src="${U.pour}">
    <img class="layer in i5" src="${U.splash}">
    <img class="layer in i6" src="${U.final}">
  </div>
</div></div></div>
<div class="shade vignette"></div><div class="shade grain"></div><div class="shade black" id="black"></div>`
await Promise.all([...app.querySelectorAll('img')].map((i) => i.decode()))
const $ = (s) => app.querySelector(s)

/* ---------- viewport ---------- */
const VW = MODE === 'portrait' ? 720 : 1600
const VH = MODE === 'portrait' ? 1280 : 900
app.style.cssText = `position:fixed;left:0;top:0;width:${VW}px;height:${VH}px;overflow:hidden`
const fit = $('#fit')
if (MODE === 'portrait') {
  const s = 0.9
  gsap.set(fit, { scale: s, x: VW / 2 - 1150 * s, y: 92 - 40 * s }) // scoop top ~92px down: clear of the nav on phones
  fit.style.webkitMaskImage = fit.style.maskImage = 'linear-gradient(to bottom, transparent 0, #000 3.4%, #000 78%, transparent 94%)' // feathered top (scoop starts below the fade) and bottom
} else {
  const s = VW / 1673 // original x window [-70, 1603] → left extension gives the Falooda its rightward offset
  gsap.set(fit, { scale: s, x: -50 * s, y: 0 })
}

/* ---------- timeline ---------- */
const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
const L = {
  rise: $('#rise'), black: $('#black'), cam: $('#cam'),
  i1: $('.i1'), i2: $('.i2'), i3: $('.i3'), i5: $('.i5'), i6: $('.i6'),
  o3a: $('.o3a'), o3b: $('.o3b'), o2: $('.o2'), o1: $('.o1'), sc: $('.sc'), stack: $('#stack'),
}
// initial states
gsap.set([L.o3a, L.o3b, L.o2, L.o1, L.sc, L.i2, L.i5, L.i6], { opacity: 0 })
gsap.set(L.i1, { '--t': '900px' })
gsap.set(L.i3, { '--t': '900px' })
gsap.set(L.i2, { '--t': '500px', '--b': '504px' })
gsap.set([L.i5, L.i6], { '--t': '0px', '--b': '190px' })
gsap.set(L.sc, { y: -300 })
gsap.set(L.rise, { y: 110, scale: 1.03, transformOrigin: '1150px 700px' })
gsap.set(L.black, { opacity: 1 })

// camera: one slow push-in that never crops the top (origin sits near the top of the glass)
tl.to(L.cam, { scale: 1.025, duration: 15.8, ease: 'sine.inOut' }, 0)
  .to(L.cam, { scale: 1, duration: 0.9, ease: 'sine.inOut' }, 15.8)

// 0.0 — up from black; the empty glass rises and settles
tl.to(L.black, { opacity: 0, duration: 1.4, ease: 'power2.out' }, 0)
  .to(L.rise, { y: 0, scale: 1, duration: 1.7, ease: 'expo.out' }, 0)

// 2.6 — syrup rises from the bottom
tl.to(L.i1, { '--t': '612px', duration: 2.0, ease: 'power1.inOut' }, 2.6)

// 4.6 — basil seeds + sev: the band appears top-down, as if settling
tl.to(L.i2, { opacity: 1, duration: 0.3 }, 4.6)
  .to(L.i2, { '--t': '500px', '--b': '652px', duration: 1.8, ease: 'power1.inOut' }, 4.6)

// 6.6 — milk: the stream appears, the liquid rises and turns the syrup pink
tl.to(L.o3a, { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, 6.4)
  .to(L.i3, { '--t': '560px', duration: 2.2, ease: 'power1.inOut' }, 6.6)
  .to(L.o3b, { opacity: 1, duration: 0.3 }, 8.7)
  .to(L.o3a, { opacity: 0, duration: 0.6, ease: 'power1.inOut' }, 8.8)

// 9.0 — jelly + strawberries: the milk climbs through them
tl.to(L.i3, { '--t': '250px', duration: 1.9, ease: 'power1.inOut' }, 9.0)

// 11.0 — ice cream drops (squash on landing), then the creamy drips run down the glass
tl.to(L.sc, { opacity: 1, duration: 0.15 }, 10.7)
  .to(L.sc, { y: 0, duration: 1.15, ease: 'power2.in' }, 10.7)
  .to(L.sc, { scaleY: 0.93, scaleX: 1.04, duration: 0.08, ease: 'power1.out' }, 11.85)
  .to(L.sc, { scaleY: 1.02, scaleX: 0.99, duration: 0.12, ease: 'power1.out' }, 11.93)
  .to(L.sc, { scaleY: 1, scaleX: 1, duration: 0.18, ease: 'power1.inOut' }, 12.05)
  .to(L.o2, { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, 11.9)
  .to(L.o3b, { opacity: 0, duration: 0.9, ease: 'power1.inOut' }, 12.2)
  .to(L.i5, { opacity: 1, duration: 0.2 }, 11.9)
  .to(L.i5, { '--b': '900px', duration: 1.5, ease: 'power1.inOut' }, 11.9)

// 12.9 — toppings + the syrup drizzle settles into the final composition
tl.to(L.o1, { opacity: 1, duration: 1.2, ease: 'power1.inOut' }, 12.9)
  .to(L.o2, { opacity: 0, duration: 1.2, ease: 'power1.inOut' }, 13.3)
  .to(L.i6, { opacity: 1, duration: 0.2 }, 12.9)
  .to(L.i6, { '--b': '900px', duration: 1.4, ease: 'power1.inOut' }, 12.9)

// 14.4 — hold; 15.8 — dissolve back to the empty glass, then fade through black (frame 0 == last frame)
tl.to(L.stack, { opacity: 0, duration: 1.0, ease: 'power1.inOut' }, 15.8)
  .to(L.black, { opacity: 1, duration: 0.7, ease: 'power1.in' }, 16.5)
  .to({}, { duration: 0.01 }, DURATION)

window.__render = {
  duration: tl.duration(),
  mode: MODE,
  width: VW,
  height: VH,
  seek: (t) => {
    tl.time(t, false)
    return t
  },
}
