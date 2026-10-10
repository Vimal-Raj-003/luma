/*
  Cuts real ingredients (strawberries, jelly cubes, droplets) out of the photographic opening frame (frame 0), with a soft elliptical edge,
  so the hero intro can fly *photographic* pieces into the glass instead of illustrated stickers. Output: public/assets/hero-ing/*.png
    npm run dev, then:  npm run ing:cutouts
  Boxes are in the 1920×1080 frame: [x, y, w, h]. The hero blends them with mix-blend-mode: lighten, so the dark studio background
  around each piece does not show.
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
    // soft elliptical alpha: solid to 68 % of the radius, gone at 100 %
    g.globalCompositeOperation = 'destination-in'
    g.save(); g.translate(w / 2, h / 2); g.scale(w / 2, h / 2)
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1)
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.68, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore()
    out[name] = c.toDataURL('image/png')
  }
  return out
}, BOXES)
for (const [name, url] of Object.entries(res)) {
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'))
  console.log('✓', name + '.png')
}
await b.close()
