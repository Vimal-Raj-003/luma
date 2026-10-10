/*
  Cuts real ingredients (strawberries, jelly cubes, droplets) out of the photographic opening frame (frame 0), with a soft elliptical edge,
  so the hero intro can fly *photographic* pieces into the glass instead of illustrated stickers. Output: public/assets/hero-ing/*.png
    npm run dev, then:  npm run ing:cutouts
  Boxes are in the 1920×1080 frame: [x, y, w, h]. The studio backdrop around each piece is keyed out, so they are plain transparent PNGs.
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'assets', 'hero-ing')
const BOXES = {
  'straw-half': [722, 482, 220, 212],
  'straw-whole': [1470, 175, 230, 280],
  'jelly-a': [668, 342, 156, 138],
  'jelly-b': [1530, 525, 170, 150],
  'drop-a': [820, 185, 66, 72],
  'drop-b': [1410, 640, 72, 92],
  'drop-c': [1498, 74, 44, 44],
}
fs.mkdirSync(OUT, { recursive: true })
const b = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] })
const p = await b.newPage()
await p.goto(`${process.env.RENDER_URL || 'http://localhost:5180'}/`, { waitUntil: 'domcontentloaded' })
const res = await p.evaluate(async (boxes) => {
  const im = new Image(); im.src = '/hero-frames/ezgif-frame-000.jpg'; await im.decode()
  const out = {}
  for (const [name, [x, y, w, h]] of Object.entries(boxes)) {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const g = c.getContext('2d')
    g.drawImage(im, x, y, w, h, 0, 0, w, h)
    // transparency: key out the local studio backdrop (its colour is read from the border of the box), keep the core solid,
    // fade the rim on an ellipse — plain transparent PNGs, so the hero needs no blend mode
    const d = g.getImageData(0, 0, w, h), px = d.data
    let br = 0, bg = 0, bb = 0, bn = 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < 5 || y < 5 || x >= w - 5 || y >= h - 5) { const i = (y * w + x) * 4; br += px[i]; bg += px[i + 1]; bb += px[i + 2]; bn++ }
    br /= bn; bg /= bn; bb /= bn
    const sm = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t) }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const nx = (x + 0.5 - w / 2) / (w / 2), ny = (y + 0.5 - h / 2) / (h / 2), rho = Math.hypot(nx, ny)
      const dist = Math.hypot(px[i] - br, px[i + 1] - bg, px[i + 2] - bb)
      const key = sm(34, 80, dist)
      const core = 1 - sm(0.4, 0.6, rho)
      px[i + 3] = Math.round(255 * Math.max(key, core) * (1 - sm(0.82, 1, rho)))
    }
    g.putImageData(d, 0, 0)
    out[name] = c.toDataURL('image/png')
  }
  return out
}, BOXES)
for (const [name, url] of Object.entries(res)) {
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'))
  console.log('✓', name + '.png')
}
await b.close()
