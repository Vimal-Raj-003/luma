/*
  Makes the opening "empty glass" frame from frame 1: the syrup at the bottom of the glass is painted out by stretching a clean
  strip of glass interior down over it, following the glass taper row by row. The result is public/hero-frames/ezgif-frame-000.jpg,
  which the hero shows first and dissolves into frame 1, so the syrup visibly arrives.
    npm run dev, then:  npm run frame:empty
  (Wall geometry measured on frame 1: left outer wall x = 921 + 0.2045 · (y − 367); the right wall mirrors it around x = 1180.)
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'hero-frames', 'ezgif-frame-000.jpg')
const PREVIEW = process.env.PREVIEW_PNG // optional: also write a before/after crop for inspection
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.goto(`${process.env.RENDER_URL || 'http://localhost:5180'}/`, { waitUntil: 'domcontentloaded' })
const res = await p.evaluate(async () => {
  const im = new Image(); im.src = '/hero-frames/ezgif-frame-001.jpg'; await im.decode()
  const W = 1920, H = 1080
  const src = document.createElement('canvas'); src.width = W; src.height = H
  const sx = src.getContext('2d', { willReadFrequently: true }); sx.drawImage(im, 0, 0)
  const S = sx.getImageData(0, 0, W, H)
  const out = new ImageData(new Uint8ClampedArray(S.data), W, H)
  const CX = 1180
  const left = (y) => 921 + 0.2045 * (y - 367)
  const right = (y) => 2 * CX - left(y)
  const Y0 = 705, Y1 = 938 // rows to clean (the syrup + its splash)
  const SRC0 = 500, SRC1 = 665 // clean glass interior used as the source texture
  const INSET = 16 // keep the original glass walls
  const px = (x, y, c) => {
    const x0 = Math.max(0, Math.min(W - 2, Math.floor(x))), y0 = Math.max(0, Math.min(H - 2, Math.floor(y)))
    const fx = x - x0, fy = y - y0
    const i00 = (y0 * W + x0) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4
    return S.data[i00 + c] * (1 - fx) * (1 - fy) + S.data[i10 + c] * fx * (1 - fy) + S.data[i01 + c] * (1 - fx) * fy + S.data[i11 + c] * fx * fy
  }
  for (let y = Y0; y <= Y1; y++) {
    const t = (y - Y0) / (Y1 - Y0)
    const sy = SRC0 + t * (SRC1 - SRC0) // stretch the strip down
    const L = left(y) + INSET, R = right(y) - INSET
    const sL = left(sy) + INSET, sR = right(sy) - INSET
    const vA = Math.min(1, (y - Y0) / 34) * Math.min(1, (Y1 - y) / 30) // vertical feather
    for (let x = Math.floor(L); x <= Math.ceil(R); x++) {
      const u = (x - L) / (R - L)
      const hA = Math.min(1, (x - L) / 22) * Math.min(1, (R - x) / 22) // horizontal feather at the walls
      const a = vA * hA
      if (a <= 0) continue
      const o = (y * W + x) * 4
      for (let c = 0; c < 3; c++) out.data[o + c] = S.data[o + c] * (1 - a) + px(sL + u * (sR - sL), sy, c) * a
    }
  }
  // red residue left on the glass walls and the base ring: pull any red-dominant pixel there toward neutral glass
  const deRed = (x0, x1, y0, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = Math.floor(x0(y)); x <= Math.ceil(x1(y)); x++) {
      const o = (y * W + x) * 4, r = out.data[o], g = out.data[o + 1], bl = out.data[o + 2]
      if (r > g * 1.35 && r > 90) {
        const lum = 0.3 * r + 0.59 * g + 0.11 * bl
        const k = Math.min(1, (r / Math.max(1, g) - 1.35) / 0.9) * 0.92
        out.data[o] = r + (lum * 1.05 - r) * k; out.data[o + 1] = g + (lum - g) * k; out.data[o + 2] = bl + (lum * 0.98 - bl) * k
      }
    }
  }
  deRed((y) => left(y) - 8, (y) => left(y) + INSET + 26, Y0 - 20, Y1 + 18)
  deRed((y) => right(y) - INSET - 26, (y) => right(y) + 8, Y0 - 20, Y1 + 18)
  deRed(left, right, Y1 - 6, Y1 + 20) // the base ring
  const dst = document.createElement('canvas'); dst.width = W; dst.height = H
  dst.getContext('2d').putImageData(out, 0, 0)
  // before/after crop for visual inspection
  const cmp = document.createElement('canvas'); cmp.width = 1300; cmp.height = 560
  const cx = cmp.getContext('2d')
  cx.drawImage(src, 860, 480, 640, 560, 0, 0, 640, 560); cx.drawImage(dst, 860, 480, 640, 560, 660, 0, 640, 560)
  return { jpg: dst.toDataURL('image/jpeg', 0.93), cmp: cmp.toDataURL('image/png') }
})
fs.writeFileSync(OUT, Buffer.from(res.jpg.split(',')[1], 'base64'))
if (PREVIEW) fs.writeFileSync(PREVIEW, Buffer.from(res.cmp.split(',')[1], 'base64'))
console.log('✓ ezgif-frame-000.jpg', Math.round(fs.statSync(OUT).size / 1024) + ' KB')
await b.close()
