/*
  Builds the six flavour pictures of the Falooda (public/assets/flavours/<flavour>.jpg) from the ONE premium-glass photograph
  (public/hero-frames-v2/ezgif-frame-030.jpg, see tools/make-falooda-frames.mjs), so the glass is identical everywhere and only the flavour changes.
  Each flavour is a colour mapping of the whole picture (not a filter laid over part of it):
    - the red family (strawberry, syrup, pink milk, scoop, jelly) moves to the flavour's own hue, keeping its shading
    - the warm studio backdrop and table take the flavour's tone, so nothing stays strawberry-red or orange by accident
    - greens (leaves) are kept
  then flavour-specific garnish is drawn on the scoop and rim (pistachio crumbs, almond slivers, saffron, chocolate shards, rose petals, mango cubes).
    npm run dev, then:  npm run flavours:build        (PREVIEW_PNG=path also writes a contact sheet)
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { mapY, hs, invY, OUT_H } from '../src/components/glassWarp.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'public', 'hero-frames-v2', 'ezgif-frame-030.jpg')
const OUT = path.join(ROOT, 'public', 'assets', 'flavours')
const PREVIEW = process.env.PREVIEW_PNG
fs.mkdirSync(OUT, { recursive: true })

// colour mapping per flavour: red family → hue H (spread keeps the original variation), saturation ×S, lightness +L; backdrop → hue BH, ×BS, ×BL
// natural, restrained colour: the studio backdrop is left exactly as photographed for every flavour (same shoot), only the dessert changes.
// lift: lightens the dark jelly / fruit pieces (mango cubes, pistachio pieces); calm: how far floating fruit outside the glass is pushed back
const FLAVOURS = {
  strawberry: { H: 352, spread: 1, S: 0.9, L: -0.01, lift: 0, calm: 0.3 },
  rose: { H: 347, spread: 0.55, S: 0.72, L: 0.05, lift: 0.1, calm: 0.5 },
  mango: { H: 40, spread: 0.45, S: 0.92, L: 0.1, lift: 0.26, calm: 0.75 },
  pistachio: { H: 92, spread: 0.55, S: 0.45, L: 0.12, lift: 0.12, calm: 0.9 },
  chocolate: { H: 22, spread: 0.45, S: 0.6, L: -0.2, lift: 0, calm: 0.8 },
  dryfruit: { H: 38, spread: 0.5, S: 0.46, L: 0.06, lift: 0.14, calm: 0.8 },
}
// the photograph's own backdrop (bokeh, fruit, table) re-toned per flavour: [hue, saturation ×, lightness ×]
const BACKDROP = {
  strawberry: [348, 0.78, 0.82],
  rose: [343, 0.55, 0.92],
  mango: [37, 1.0, 1.0],
  pistachio: [92, 0.62, 0.95],
  chocolate: [22, 0.62, 0.62],
  dryfruit: [38, 0.55, 0.92],
}
const GARNISH = { strawberry: [], rose: ['petal'], mango: ['mango'], pistachio: ['pist'], chocolate: ['choc'], dryfruit: ['almond', 'cashew', 'pist', 'saffron'] }

// the glass silhouette (scoop + body + foot) in the reshaped frame: everything outside it may be softened
const half = (y) => (y < 285 ? 205 : 259 - 0.2045 * (y - 367) + 22) * hs(y) + (y > 900 ? 20 : 0)
const ys = [40, 120, 200, 285, 300, 360, 440, 520, 600, 680, 760, 840, 900, 940, 975]
const POLY = [...ys.map((y) => [1180 + half(y), mapY(y)]), ...[...ys].reverse().map((y) => [1180 - half(y), mapY(y)])]
// glass half-width at every row of the reshaped frame (glass wall + a margin): fruit beyond it is 'outside the glass'
// tighter silhouette for the cut-out: the scoop (ellipse) + the glass from its rim down, hugging the wall
const half2 = (y) => (y < 250 ? 200 : (259 - 0.2045 * (y - 367) + 12) * hs(y)) + (y > 900 ? 26 : 0)
const ys2 = [225, 250, 262, 270, 285, 300, 340, 400, 460, 520, 580, 640, 700, 760, 820, 870, 900, 925, 950, 975]
const POLY2 = [...ys2.map((y) => [1180 + half2(y), mapY(y)]), ...[...ys2].reverse().map((y) => [1180 - half2(y), mapY(y)])]
const SCOOP = { cx: 1186, cy: mapY(160), rx: 190, ry: 130 }
const HALF = Array.from({ length: OUT_H }, (_, yo) => half(invY(yo + 0.5)))
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.goto(`${process.env.RENDER_URL || 'http://localhost:5180'}/`, { waitUntil: 'domcontentloaded' })
const res = await p.evaluate(async (url, FL, GA, POLY, HALF, POLY2, SCOOP, RIMROW, NR, BD) => {
  const im = new Image(); im.src = url; await im.decode()
  const W = im.width, H = im.height, CROP = { x: 760, w: 840 }
  const base = document.createElement('canvas'); base.width = W; base.height = H
  const bx = base.getContext('2d', { willReadFrequently: true }); bx.drawImage(im, 0, 0)
  const SRC = bx.getImageData(0, 0, W, H)
  const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
  const rgb2hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60 } return [h, s, l] }
  const hsl2rgb = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p }; if (s === 0) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q; return [f(pp, q, h + 1 / 3) * 255, f(pp, q, h) * 255, f(pp, q, h - 1 / 3) * 255] }
  const wrap = (d) => ((d + 540) % 360) - 180
  // soft masks: computed per pixel, then blurred so JPEG blocks in the source never show as blocks in the recoloured picture
  const N = W * H
  const mRed = new Float32Array(N), mBg = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const [h, sat] = rgb2hsl(SRC.data[i * 4], SRC.data[i * 4 + 1], SRC.data[i * 4 + 2])
    const hwR = HALF[Math.floor(i / W)], inGlass = Math.floor(i / W) > 318 && Math.abs((i % W) - 1180) < hwR - 10
    const dh = wrap(h - 352) // pink / magenta side reaches further than the orange side (the warm backdrop sits on the orange side)
    const hueW = dh <= 0 ? 1 - sm(38, 58, -dh) : inGlass ? 1 - sm(27, 35, dh) : Math.max(1 - sm(14, 26, dh), (1 - sm(34, 46, dh)) * (1 - sm(0.17, 0.27, sat))) // pale peach-pink milk reaches further than the saturated brown backdrop
    const wr = hueW * sm(0.02, 0.09, sat)
    mRed[i] = wr
    mBg[i] = (1 - sm(16, 30, Math.abs(wrap(h - 32)))) * sm(0.1, 0.24, sat) * (1 - wr)
  }
  const blurMask = (m, px) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d', { willReadFrequently: true }); const im2 = g.createImageData(W, H)
    for (let i = 0; i < N; i++) { const v = Math.round(m[i] * 255); im2.data[i * 4] = im2.data[i * 4 + 1] = im2.data[i * 4 + 2] = v; im2.data[i * 4 + 3] = 255 }
    g.putImageData(im2, 0, 0)
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H
    const g2 = c2.getContext('2d', { willReadFrequently: true }); g2.filter = 'blur(' + px + 'px)'; g2.drawImage(c, 0, 0)
    const d = g2.getImageData(0, 0, W, H).data, o = new Float32Array(N)
    for (let i = 0; i < N; i++) o[i] = d[i * 4] / 255
    return o
  }
  const bRed = blurMask(mRed, 2.5), bBg = blurMask(mBg, 5)
  // blurred hue/sat of the original, so the new colour follows the local tone rather than pixel noise
  const recolour = (P) => {
    const out = new ImageData(new Uint8ClampedArray(SRC.data), W, H), D = out.data
    for (let i = 0; i < N; i++) {
      const wR = mRed[i] * 0.5 + bRed[i] * 0.5
      if (wR < 0.003) continue
      const o = i * 4, x = i % W
      const [h, s0, l] = rgb2hsl(D[o], D[o + 1], D[o + 2])
      const hw = HALF[Math.min(HALF.length - 1, Math.floor(i / W))]
      const outside = sm(hw + 6, hw + 60, Math.abs(x - 1180)) * P.calm // floating fruit outside the glass: pushed back so the dessert carries the colour
      let nl = l + P.L * (0.4 + 0.6 * (1 - Math.abs(l - 0.5) * 1.4)) + P.lift * Math.max(0, 0.55 - l) * 1.6
      nl = Math.max(0, Math.min(1, nl)) * (1 - outside * 0.5)
      const ns = Math.min(1, s0 * P.S) * (1 - outside * 0.65)
      let [r, g, b2] = hsl2rgb(P.H + wrap(h - 352) * P.spread, ns, nl)
      // floating fruit outside the glass dissolves into the (unchanged) warm backdrop instead of becoming oddly coloured fruit
      if (outside > 0) { const [br, bg2, bb] = hsl2rgb(27, 0.4, Math.max(0.1, nl * 0.62)); const t = Math.min(1, outside * 1.15); r += (br - r) * t; g += (bg2 - g) * t; b2 += (bb - b2) * t }
      D[o] += (r - D[o]) * wR; D[o + 1] += (g - D[o + 1]) * wR; D[o + 2] += (b2 - D[o + 2]) * wR
    }
    return out
  }
  // ---- garnish (drawn, seeded, small and restrained) ----
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const SC = { x: 1188, y: 172, rx: 150, ry: 92 } // the scoop, upper surface
  const onScoop = (n, a0 = 205, a1 = 335) => Array.from({ length: n }, () => { const a = ((a0 + rnd() * (a1 - a0)) * Math.PI) / 180, k = 0.55 + rnd() * 0.4; return [SC.x + Math.cos(a) * SC.rx * k, SC.y + Math.sin(a) * SC.ry * k - 6, rnd() * 360] })
  const onRim = (n) => Array.from({ length: n }, () => [1180 + (rnd() - 0.5) * 560, 286 + rnd() * 18, rnd() * 360])
  const shadow = (g, a = 0.35, bl = 4) => { g.shadowColor = `rgba(20,6,12,${a})`; g.shadowBlur = bl; g.shadowOffsetY = 2 }
  const draw = {
    pist: (g) => { for (const [x, y, r] of [...onScoop(30), ...onRim(8)]) { const s = 5 + rnd() * 7; g.save(); shadow(g, 0.3, 3); g.translate(x, y); g.rotate((r * Math.PI) / 180); const gr = g.createLinearGradient(-s, -s, s, s); gr.addColorStop(0, '#c9e59a'); gr.addColorStop(1, '#5f9a3c'); g.fillStyle = gr; g.beginPath(); g.moveTo(-s, 0); g.lineTo(-s * 0.3, -s * 0.8); g.lineTo(s * 0.8, -s * 0.5); g.lineTo(s, s * 0.3); g.lineTo(-s * 0.2, s * 0.8); g.closePath(); g.fill(); g.restore() } },
    almond: (g) => { for (const [x, y, r] of [...onScoop(10, 215, 325), ...onRim(4)]) { const L = 20 + rnd() * 9, T = L * 0.45; g.save(); shadow(g, 0.3, 3); g.translate(x, y); g.rotate((r * Math.PI) / 180); const gr = g.createLinearGradient(0, -T, 0, T); gr.addColorStop(0, '#f6e6c4'); gr.addColorStop(1, '#c79a58'); g.fillStyle = gr; g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -T * 1.3, L, 0); g.quadraticCurveTo(0, T * 1.3, -L, 0); g.fill(); g.restore() } },
    cashew: (g) => { for (const [x, y, r] of [...onScoop(7, 215, 325), ...onRim(3)]) { const L = 15 + rnd() * 6; g.save(); shadow(g, 0.3, 3); g.translate(x, y); g.rotate((r * Math.PI) / 180); const gr = g.createLinearGradient(-L, -L, L, L); gr.addColorStop(0, '#f3dcae'); gr.addColorStop(1, '#c9a063'); g.fillStyle = gr; g.beginPath(); g.moveTo(-L, 2); g.quadraticCurveTo(-L * 0.2, -L * 0.9, L, -L * 0.2); g.quadraticCurveTo(L * 0.2, L * 0.15, -L * 0.2, L * 0.5); g.quadraticCurveTo(-L * 0.8, L * 0.6, -L, 2); g.fill(); g.restore() } },
    saffron: (g) => { g.save(); g.lineCap = 'round'; for (const [x, y, r] of onScoop(14, 215, 325)) { g.save(); shadow(g, 0.25, 2); g.translate(x, y); g.rotate((r * Math.PI) / 180); g.strokeStyle = rnd() > 0.4 ? '#e8631a' : '#f08a24'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(0, -5 - rnd() * 5, 13, rnd() * 4); g.stroke(); g.restore() } g.restore() },
    choc: (g) => { for (const [x, y, r] of [...onScoop(9, 215, 325), ...onRim(3)]) { const w = 16 + rnd() * 14, h = 7 + rnd() * 6; g.save(); shadow(g, 0.4, 4); g.translate(x, y); g.rotate((r * Math.PI) / 180); const gr = g.createLinearGradient(-w, -h, w, h); gr.addColorStop(0, '#7a4a30'); gr.addColorStop(0.55, '#4a2616'); gr.addColorStop(1, '#2a140b'); g.fillStyle = gr; g.beginPath(); g.moveTo(-w, -h * 0.4); g.lineTo(w * 0.8, -h); g.lineTo(w, h * 0.5); g.lineTo(-w * 0.6, h); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,220,190,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-w, -h * 0.4); g.lineTo(w * 0.8, -h); g.stroke(); g.restore() } },
    petal: (g) => { for (const [x, y, r] of [...onScoop(9, 205, 335), ...onRim(4)]) { const L = 20 + rnd() * 12, T = L * 0.55; g.save(); shadow(g, 0.28, 4); g.translate(x, y); g.rotate((r * Math.PI) / 180); const gr = g.createLinearGradient(-L, 0, L, 0); gr.addColorStop(0, '#f9b7c9'); gr.addColorStop(1, '#df5f86'); g.fillStyle = gr; g.beginPath(); g.moveTo(-L, 0); g.bezierCurveTo(-L * 0.5, -T * 1.4, L * 0.7, -T, L, 0); g.bezierCurveTo(L * 0.6, T * 1.1, -L * 0.4, T * 1.2, -L, 0); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-L * 0.8, 0); g.quadraticCurveTo(0, -T * 0.3, L * 0.8, 0); g.stroke(); g.restore() } },
    mango: (g) => { for (const [x, y, r] of [...onScoop(10, 210, 330), ...onRim(5)]) { const s = 9 + rnd() * 6; g.save(); shadow(g, 0.35, 4); g.translate(x, y); g.rotate((r * Math.PI) / 180); const gr = g.createLinearGradient(-s, -s, s, s); gr.addColorStop(0, '#ffe07a'); gr.addColorStop(1, '#f09a1a'); g.fillStyle = gr; const rr = 3; g.beginPath(); g.moveTo(-s + rr, -s); g.lineTo(s - rr, -s); g.quadraticCurveTo(s, -s, s, -s + rr); g.lineTo(s, s - rr); g.quadraticCurveTo(s, s, s - rr, s); g.lineTo(-s + rr, s); g.quadraticCurveTo(-s, s, -s, s - rr); g.lineTo(-s, -s + rr); g.quadraticCurveTo(-s, -s, -s + rr, -s); g.fill(); g.fillStyle = 'rgba(255,255,255,0.38)'; g.fillRect(-s + 2, -s + 2, s * 0.9, s * 0.35); g.restore() } },
  }
  const out = {}
  for (const [name, P] of Object.entries(FL)) {
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d')
    {
      g.putImageData(recolour(P), 0, 0)
      // light defocus outside the glass; 'darken' means it can only soften, never glow
      const bl = document.createElement('canvas'); bl.width = W; bl.height = H
      const bg = bl.getContext('2d'); bg.filter = 'blur(4px)'; bg.drawImage(c, 0, 0)
      const mk = document.createElement('canvas'); mk.width = W; mk.height = H
      const mg = mk.getContext('2d')
      mg.fillStyle = 'rgba(0,0,0,' + (0.35 + 0.5 * P.calm) + ')'; mg.fillRect(0, 0, W, H)
      mg.globalCompositeOperation = 'destination-out'; mg.filter = 'blur(7px)'; mg.fillStyle = '#000'
      mg.beginPath(); POLY.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fill()
      bg.filter = 'none'; bg.globalCompositeOperation = 'destination-in'; bg.drawImage(mk, 0, 0)
      g.globalCompositeOperation = 'darken'; g.drawImage(bl, 0, 0); g.globalCompositeOperation = 'source-over'
    }
    // ---- background plate: this flavour's own photo backdrop, glass removed, tinted, extended across the section ----
    {
      const [bh, bs, bl] = BD[name]
      const pc = document.createElement('canvas'); pc.width = W; pc.height = H
      const pg = pc.getContext('2d', { willReadFrequently: true }); pg.drawImage(c, 0, 0)
      const id2 = pg.getImageData(0, 0, W, H), Q = id2.data
      // soft backdrop mask (warm brown pixels), blurred so JPEG blocks never show
      const mb = new Float32Array(W * H)
      for (let i = 0; i < W * H; i++) { const [h, sat] = rgb2hsl(Q[i * 4], Q[i * 4 + 1], Q[i * 4 + 2]); mb[i] = (1 - sm(12, 26, Math.abs(wrap(h - 28)))) * sm(0.18, 0.34, sat) }
      const mc = document.createElement('canvas'); mc.width = W; mc.height = H
      const mx = mc.getContext('2d', { willReadFrequently: true }); const mi = mx.createImageData(W, H)
      for (let i = 0; i < W * H; i++) { const v = Math.round(mb[i] * 255); mi.data[i * 4] = mi.data[i * 4 + 1] = mi.data[i * 4 + 2] = v; mi.data[i * 4 + 3] = 255 }
      mx.putImageData(mi, 0, 0)
      const mc2 = document.createElement('canvas'); mc2.width = W; mc2.height = H
      const m2 = mc2.getContext('2d', { willReadFrequently: true }); m2.filter = 'blur(5px)'; m2.drawImage(mc, 0, 0)
      const md = m2.getImageData(0, 0, W, H).data
      for (let i = 0; i < W * H; i++) {
        const w = md[i * 4] / 255; if (w < 0.01) continue
        const [h, sat, l] = rgb2hsl(Q[i * 4], Q[i * 4 + 1], Q[i * 4 + 2])
        const [r, g2, b2] = hsl2rgb(bh + wrap(h - 28) * 0.35, Math.min(1, sat * bs), Math.min(1, l * bl))
        Q[i * 4] += (r - Q[i * 4]) * w; Q[i * 4 + 1] += (g2 - Q[i * 4 + 1]) * w; Q[i * 4 + 2] += (b2 - Q[i * 4 + 2]) * w
      }
      pg.putImageData(id2, 0, 0)
      // the glass area (silhouette + scoop, generously dilated so no glass pixels are used) is filled smoothly from the backdrop around it:
      // diffusion on a small copy (each unknown pixel relaxes to the mean of its neighbours), then scaled up and feathered in
      const mk = document.createElement('canvas'); mk.width = W; mk.height = H
      const mg2 = mk.getContext('2d'); mg2.fillStyle = '#000'; mg2.strokeStyle = '#000'; mg2.lineWidth = 120; mg2.lineJoin = 'round'
      mg2.beginPath(); POLY.forEach(([x, y], i) => (i ? mg2.lineTo(x, y) : mg2.moveTo(x, y))); mg2.closePath(); mg2.fill(); mg2.stroke()
      mg2.beginPath(); mg2.ellipse(SCOOP.cx, SCOOP.cy, SCOOP.rx + 40, SCOOP.ry + 36, 0, 0, 6.2832); mg2.fill(); mg2.lineWidth = 90; mg2.stroke()
      const SW = 240, SH = Math.round((SW * H) / W)
      const sc = document.createElement('canvas'); sc.width = SW; sc.height = SH
      const sg = sc.getContext('2d', { willReadFrequently: true }); sg.imageSmoothingQuality = 'high'; sg.drawImage(pc, 0, 0, SW, SH)
      const sm2 = document.createElement('canvas'); sm2.width = SW; sm2.height = SH
      const smg = sm2.getContext('2d', { willReadFrequently: true }); smg.drawImage(mk, 0, 0, SW, SH)
      const col = sg.getImageData(0, 0, SW, SH), md2 = smg.getImageData(0, 0, SW, SH).data
      const C = col.data, unk = new Uint8Array(SW * SH)
      let mr = 0, mgc = 0, mbc = 0, nk = 0
      for (let i = 0; i < SW * SH; i++) { if (md2[i * 4 + 3] > 100) unk[i] = 1; else { mr += C[i * 4]; mgc += C[i * 4 + 1]; mbc += C[i * 4 + 2]; nk++ } }
      for (let i = 0; i < SW * SH; i++) if (unk[i]) { C[i * 4] = mr / nk; C[i * 4 + 1] = mgc / nk; C[i * 4 + 2] = mbc / nk }
      for (let it = 0; it < 900; it++) for (let y = 1; y < SH - 1; y++) for (let x = 1; x < SW - 1; x++) { const i = y * SW + x; if (!unk[i]) continue; for (let ch = 0; ch < 3; ch++) C[i * 4 + ch] = (C[(i - 1) * 4 + ch] + C[(i + 1) * 4 + ch] + C[(i - SW) * 4 + ch] + C[(i + SW) * 4 + ch]) / 4 }
      sg.putImageData(col, 0, 0)
      const fillUp = document.createElement('canvas'); fillUp.width = W; fillUp.height = H
      const fu = fillUp.getContext('2d'); fu.imageSmoothingQuality = 'high'; fu.drawImage(sc, 0, 0, W, H)
      const feather = document.createElement('canvas'); feather.width = W; feather.height = H
      const fe = feather.getContext('2d'); fe.filter = 'blur(14px)'; fe.drawImage(mk, 0, 0)
      fu.globalCompositeOperation = 'destination-in'; fu.drawImage(feather, 0, 0)
      const fill = document.createElement('canvas'); fill.width = W; fill.height = H
      const fg = fill.getContext('2d'); fg.drawImage(pc, 0, 0); fg.drawImage(fillUp, 0, 0)
      // real texture in the gap: the bokeh and fruit to the left of the glass, mirrored across, blended in through a feathered mask
      const mir = document.createElement('canvas'); mir.width = W; mir.height = H
      const mi2 = mir.getContext('2d'); mi2.save(); mi2.filter = 'blur(22px)'; mi2.translate(1680, 0); mi2.scale(-1, 1); mi2.drawImage(pc, 0, 0); mi2.restore()
      const inner = document.createElement('canvas'); inner.width = W; inner.height = H
      const ig = inner.getContext('2d'); ig.filter = 'blur(36px)'; ig.drawImage(mk, 0, 0)
      mi2.globalCompositeOperation = 'destination-in'; mi2.drawImage(inner, 0, 0)
      fg.globalAlpha = 0.85; fg.drawImage(mir, 0, 0); fg.globalAlpha = 1
      // a little depth at the edges
      const vg = fg.createRadialGradient(W * 0.55, H * 0.5, H * 0.35, W * 0.55, H * 0.5, W * 0.72)
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(14,4,8,0.4)')
      fg.fillStyle = vg; fg.fillRect(0, 0, W, H)
      out[name + '.bg'] = fill.toDataURL('image/webp', 0.8)
    }
    seed = 7
    for (const k of GA[name]) draw[k](g)
    const o = document.createElement('canvas'); o.width = CROP.w; o.height = H
    o.getContext('2d').drawImage(c, CROP.x, 0, CROP.w, H, 0, 0, CROP.w, H)
    out[name] = o.toDataURL('image/jpeg', 0.88)
    // ---- transparent cut-out: only the glass, the dessert, the scoop and the garnish ----
    const poly = (blur) => { const m = document.createElement('canvas'); m.width = W; m.height = H; const mg = m.getContext('2d'); mg.filter = 'blur(' + blur + 'px)'; mg.fillStyle = '#fff'; mg.beginPath(); POLY2.forEach(([x, y], i) => (i ? mg.lineTo(x, y) : mg.moveTo(x, y))); mg.closePath(); mg.fill(); mg.beginPath(); mg.ellipse(SCOOP.cx, SCOOP.cy, SCOOP.rx, SCOOP.ry, 0, 0, 6.2832); mg.fill(); return m }
    const cut = document.createElement('canvas'); cut.width = W; cut.height = H
    const cg = cut.getContext('2d', { willReadFrequently: true }); cg.drawImage(c, 0, 0)
    cg.globalCompositeOperation = 'destination-in'; cg.drawImage(poly(1.6), 0, 0); cg.globalCompositeOperation = 'source-over'
    const deep = poly(16).getContext('2d').getImageData(0, 0, W, H).data // 1 deep inside the silhouette, lower near its edge
    const cd = cg.getImageData(0, 0, W, H), D2 = cd.data
    if (name !== 'chocolate') for (let i = 0; i < W * H; i++) {
      const o2 = i * 4; if (D2[o2 + 3] === 0) continue
      const row = (i / W) | 0
      const dx = Math.abs((i % W) - 1180)
      const wedge = row > 225 && row < RIMROW && dx > 196 ? 1 : 0 // backdrop seen through the open top, beside the scoop
      const band = Math.max(1 - deep[o2] / 255, wedge, row < 262 ? 0.75 : 0) // the glass wall zone, the open top and the scoop's dark corners
      if (band < 0.04) continue
      const [h, sat, l] = rgb2hsl(D2[o2], D2[o2 + 1], D2[o2 + 2])
      const isBackdrop = (1 - sm(10, 18, Math.abs(wrap(h - 28)))) * sm(0.3, 0.42, sat) * (1 - sm(0.46, 0.6, l))
      const dark = 1 - sm(0.14, 0.26, l) // near-black corners left by the cut
      D2[o2 + 3] = Math.round(D2[o2 + 3] * (1 - Math.min(1, band * 1.4 * Math.max(isBackdrop, dark))))
    }
    cg.putImageData(cd, 0, 0)
    { // the glass wall: a faint light edge and inner tint, so the transparent glass reads on any section colour
      cg.save(); cg.globalCompositeOperation = 'source-over'
      const pts = POLY2.slice(0, NR), pl = POLY2.slice(NR).reverse()
      for (const line of [pts.slice(2), pl.slice(2)]) { cg.beginPath(); line.forEach(([x, y], i) => (i ? cg.lineTo(x, y) : cg.moveTo(x, y))); cg.strokeStyle = 'rgba(255,255,255,0)'; cg.lineWidth = 3; cg.filter = 'blur(1.2px)'; cg.stroke() }
      cg.restore()
    }
    const oc = document.createElement('canvas'); oc.width = CROP.w; oc.height = H
    oc.getContext('2d').drawImage(cut, CROP.x, 0, CROP.w, H, 0, 0, CROP.w, H)
    out[name + '.cut'] = oc.toDataURL('image/webp', 0.92)
  }
  return out
}, 'data:image/jpeg;base64,' + fs.readFileSync(SRC).toString('base64'), FLAVOURS, GARNISH, POLY, HALF, POLY2, SCOOP, mapY(335), ys2.length, BACKDROP)
for (const [name, url] of Object.entries(res)) {
  const cut = name.endsWith('.cut'), bg = name.endsWith('.bg'), f = path.join(OUT, cut ? name.replace('.cut', '') + '.webp' : bg ? name.replace('.bg', '') + '-bg.webp' : name + '.jpg')
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'))
  console.log('✓', path.basename(f), Math.round(fs.statSync(f).size / 1024) + ' KB')
}
await b.close()
