/*
  Bakes the glass reshaping (src/components/glassWarp.js) into the finished-Falooda frame the hero shows: public/hero-frames/ezgif-frame-030.jpg  →  public/hero-frames-v2/
  The originals are left untouched (switch back by pointing Hero.jsx at hero-frames/).
    npm run dev, then:  npm run frames:falooda        (PREVIEW_PNG=path also writes a before/after crop of frames 0, 1 and 30)
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { SRC_W, SRC_H, OUT_H, GLASS_CX, invY, hs } from '../src/components/glassWarp.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'hero-frames-v2')
const PREVIEW = process.env.PREVIEW_PNG
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null
fs.mkdirSync(OUT, { recursive: true })

const rows = Array.from({ length: OUT_H }, (_, yo) => { const ys = invY(yo + 0.5); return [ys, hs(ys)] })
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.goto(`${process.env.RENDER_URL || 'http://localhost:5180'}/`, { waitUntil: 'domcontentloaded' })
const frames = ONLY || [30] // the hero shows one frame: the finished Falooda (set ONLY=0,1,… to bake more)
const prev = []
for (const n of frames) {
  const name = `ezgif-frame-${String(n).padStart(3, '0')}.jpg`
  const src = path.join(ROOT, 'public', 'hero-frames', name)
  if (!fs.existsSync(src)) continue
  const res = await p.evaluate(async (url, rows, W, H, OH, CX, wantCmp, Q) => {
    const im = new Image(); im.src = url; await im.decode()
    const c = document.createElement('canvas'); c.width = W; c.height = OH
    const g = c.getContext('2d')
    // per-row inverse mapping with bilinear sampling: rows[yo] = [source row, horizontal scale about the glass axis]. A band-limited warp (only the
    // glass reshaped, the rest of the picture untouched) was tried and rejected: its blend edge rippled through the milk splash.
    const sc0 = document.createElement('canvas'); sc0.width = W; sc0.height = H
    const sx = sc0.getContext('2d', { willReadFrequently: true }); sx.drawImage(im, 0, 0)
    const S = sx.getImageData(0, 0, W, H).data
    const out = new ImageData(W, OH), O = out.data
    for (let yo = 0; yo < OH; yo++) {
      const [yg, s] = rows[yo]
      const ys = yg - 0.5
      const y0 = Math.max(0, Math.min(H - 2, Math.floor(ys))), fy = Math.max(0, Math.min(1, ys - y0))
      for (let xo = 0; xo < W; xo++) {
        const xs = CX + (xo + 0.5 - CX) / s - 0.5
        const x0 = Math.max(0, Math.min(W - 2, Math.floor(xs))), fx = Math.max(0, Math.min(1, xs - x0))
        const i00 = (y0 * W + x0) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4, o = (yo * W + xo) * 4
        for (let ch = 0; ch < 3; ch++) O[o + ch] = S[i00 + ch] * (1 - fx) * (1 - fy) + S[i10 + ch] * fx * (1 - fy) + S[i01 + ch] * (1 - fx) * fy + S[i11 + ch] * fx * fy
        O[o + 3] = 255
      }
    }
    g.putImageData(out, 0, 0)
    let cmp = null
    if (wantCmp) {
      const o = document.createElement('canvas'); o.width = 1400; o.height = 760
      const x = o.getContext('2d'); x.fillStyle = '#222'; x.fillRect(0, 0, 1400, 760)
      x.drawImage(im, 700, 0, 960, 1080, 0, 0, 640, 720); x.drawImage(c, 700, 0, 960, OH, 700, 0, 640, 760 * 1)
      cmp = o.toDataURL('image/jpeg', 0.9)
    }
    return { jpg: c.toDataURL('image/jpeg', Q), cmp }
  }, 'data:image/jpeg;base64,' + fs.readFileSync(src).toString('base64'), rows, SRC_W, SRC_H, OUT_H, GLASS_CX, !!PREVIEW && [0, 30].includes(n), +(process.env.QUALITY || 0.86))
  fs.writeFileSync(path.join(OUT, name), Buffer.from(res.jpg.split(',')[1], 'base64'))
  if (res.cmp) prev.push([n, res.cmp])
}
if (PREVIEW) for (const [n, d] of prev) fs.writeFileSync(PREVIEW.replace('.png', `-${n}.jpg`), Buffer.from(d.split(',')[1], 'base64'))
console.log('✓ frames written to public/hero-frames-v2 (', frames.length, 'frames, output', SRC_W + '×' + OUT_H, ')')
await b.close()
