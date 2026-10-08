import gsap from 'gsap'
import './scene.css'
import { prep } from './prep.js'

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
export const DURATION = 17.2

const url = (c) => c.toDataURL('image/jpeg', 0.96)
const P = await prep()
const U = { empty: url(P.empty), syrup: url(P.syrup), pour: url(P.pour), splash: url(P.splash), final: url(P.final) }

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
