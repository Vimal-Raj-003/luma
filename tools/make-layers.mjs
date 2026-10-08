/*
  Cuts the Falooda into separate transparent layers from the retouched photographs (public/assets/photo/*.jpg)
  → public/assets/hero/layers/*.png + layers.json. All layers share one crop box so they line up exactly.
    glass    – the EMPTY glass (empty.jpg), black-point crushed so it can be screen-blended: no brown fringe
    syrup / basil / sev / milk – the liquid bands, cut tight inside the glass walls (jelly cubes painted out of the milk)
    cube-N   – every jelly cube as its own piece (colour-keyed + connected components)
    berry-N  – strawberry pieces
    scoop    – ice-cream scoop with its rim toppings and drizzle
  npm run dev, then:  npm run layers
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'assets', 'hero', 'layers')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto(`${process.env.RENDER_URL || 'http://localhost:5180'}/`, { waitUntil: 'domcontentloaded' })

const result = await page.evaluate(async () => {
  const load = async (n) => { const i = new Image(); i.src = `/assets/photo/${n}.jpg`; await i.decode(); return i }
  const [fin, emp] = [await load('final'), await load('empty')]
  const BOX = { X: 560, Y: 20, W: 1080, H: 900 }
  const canvas = () => { const c = document.createElement('canvas'); c.width = BOX.W; c.height = BOX.H; return c }
  const crop = (img) => { const c = canvas(); c.getContext('2d').drawImage(img, -BOX.X, -BOX.Y); return c }
  const FIN = crop(fin), EMP = crop(emp)
  const poly = (pts) => { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x - BOX.X, y - BOX.Y) : p.moveTo(x - BOX.X, y - BOX.Y))); p.closePath(); return p }
  // soft-edged cut: mask (blurred a touch) × source
  const cut = (src, path2d, feather = 1.4) => {
    const m = canvas(), mx = m.getContext('2d'); mx.filter = `blur(${feather}px)`; mx.fillStyle = '#000'; mx.fill(path2d)
    const o = canvas(), ox = o.getContext('2d'); ox.drawImage(m, 0, 0); ox.globalCompositeOperation = 'source-in'; ox.filter = 'none'; ox.drawImage(src, 0, 0)
    return o
  }
  const png = (c) => c.toDataURL('image/png')
  const out = { files: {}, cubes: [], berries: [] }

  // ---- interior of the glass (tight, inside both walls) ----
  const IN = [[946, 262], [1364, 262], [1347, 500], [1302, 880], [1010, 880], [976, 500]]
  const band = (y0, y1, src = FIN) => {
    const p = new Path2D()
    const xs = (y) => { // interpolate the interior walls
      const t = (y - 262) / (880 - 262)
      return [946 + (1010 - 946) * t, 1364 + (1302 - 1364) * t]
    }
    const [l0, r0] = xs(y0), [l1, r1] = xs(y1)
    ;[[l0, y0], [r0, y0], [r1, y1], [l1, y1]].forEach(([x, y], i) => (i ? p.lineTo(x - BOX.X, y - BOX.Y) : p.moveTo(x - BOX.X, y - BOX.Y)))
    p.closePath()
    return cut(src, p, 1.2)
  }

  // ---- jelly cubes: colour-key dark crimson inside the glass, then components ----
  const ctxF = FIN.getContext('2d', { willReadFrequently: true })
  const img = ctxF.getImageData(0, 0, BOX.W, BOX.H)
  const d = img.data
  const inside = canvas(); inside.getContext('2d').fill(poly(IN))
  const insideD = inside.getContext('2d').getImageData(0, 0, BOX.W, BOX.H).data
  const key = new Uint8Array(BOX.W * BOX.H)
  for (let y = 0; y < BOX.H; y++) for (let x = 0; x < BOX.W; x++) {
    const i = y * BOX.W + x, k = i * 4
    const wy = y + BOX.Y
    if (!insideD[k + 3] || wy < 300 || wy > 560) continue
    const r = d[k], g = d[k + 1], b = d[k + 2]
    if (r > 55 && r < 190 && g < 46 && b < 80 && r > g * 2.6) key[i] = 1
  }
  // separate touching cubes: erode the key mask, label the seeds, then grow every seed back over the key mask (multi-source BFS)
  const dil = (m) => { const o = new Uint8Array(m.length); for (let y = 1; y < BOX.H - 1; y++) for (let x = 1; x < BOX.W - 1; x++) { const i = y * BOX.W + x; if (m[i] || m[i - 1] || m[i + 1] || m[i - BOX.W] || m[i + BOX.W]) o[i] = 1 } return o }
  const ero = (m) => { const o = new Uint8Array(m.length); for (let y = 1; y < BOX.H - 1; y++) for (let x = 1; x < BOX.W - 1; x++) { const i = y * BOX.W + x; if (m[i] && m[i - 1] && m[i + 1] && m[i - BOX.W] && m[i + BOX.W]) o[i] = 1 } return o }
  let km = dil(dil(key))
  let seedM = km
  for (let k = 0; k < 9; k++) seedM = ero(seedM)
  const lab = new Int32Array(km.length); let n = 0
  const seeds = []
  for (let s0 = 0; s0 < seedM.length; s0++) {
    if (!seedM[s0] || lab[s0]) continue
    n++; const q = [s0]; lab[s0] = n; let area = 0
    while (q.length) { const i = q.pop(); area++; for (const j of [i - 1, i + 1, i - BOX.W, i + BOX.W]) if (seedM[j] && !lab[j]) { lab[j] = n; q.push(j) } }
    seeds.push({ id: n, area })
  }
  const keep = new Set(seeds.filter((c) => c.area > 40).sort((a, b) => b.area - a.area).slice(0, 7).map((c) => c.id))
  let frontier = []
  for (let i = 0; i < lab.length; i++) { if (lab[i] && !keep.has(lab[i])) lab[i] = 0; else if (lab[i]) frontier.push(i) }
  while (frontier.length) { const nf = []; for (const i of frontier) for (const j of [i - 1, i + 1, i - BOX.W, i + BOX.W]) if (j >= 0 && j < km.length && km[j] && !lab[j]) { lab[j] = lab[i]; nf.push(j) } frontier = nf }
  const bb = new Map()
  for (let i = 0; i < lab.length; i++) if (lab[i]) { const x = i % BOX.W, y = (i / BOX.W) | 0; const c = bb.get(lab[i]) || { id: lab[i], minx: 1e9, miny: 1e9, maxx: 0, maxy: 0, area: 0 }; c.minx = Math.min(c.minx, x); c.maxx = Math.max(c.maxx, x); c.miny = Math.min(c.miny, y); c.maxy = Math.max(c.maxy, y); c.area++; bb.set(lab[i], c) }
  const comps = [...bb.values()].filter((c) => c.area > 700).sort((a, b) => a.miny - b.miny)
  // milk band with the cubes painted out (normalised blur of everything that is not a cube)
  const holeMask = new Uint8Array(km.length)
  comps.forEach((c) => { for (let y = c.miny; y <= c.maxy; y++) for (let x = c.minx; x <= c.maxx; x++) { const i = y * BOX.W + x; if (lab[i] === c.id) holeMask[i] = 1 } })
  const hole2 = dil(dil(dil(holeMask)))
  const noCube = new ImageData(new Uint8ClampedArray(d), BOX.W, BOX.H)
  for (let i = 0; i < hole2.length; i++) if (hole2[i]) noCube.data[i * 4 + 3] = 0
  const base = canvas(); base.getContext('2d').putImageData(noCube, 0, 0)
  const blurred = canvas(), bx = blurred.getContext('2d'); bx.filter = 'blur(16px)'; bx.drawImage(base, 0, 0)
  const bd = bx.getImageData(0, 0, BOX.W, BOX.H)
  const clean = new ImageData(new Uint8ClampedArray(d), BOX.W, BOX.H)
  for (let i = 0; i < hole2.length; i++) if (hole2[i]) { clean.data[i * 4] = bd.data[i * 4]; clean.data[i * 4 + 1] = bd.data[i * 4 + 1]; clean.data[i * 4 + 2] = bd.data[i * 4 + 2] }
  const FINCLEAN = canvas(); FINCLEAN.getContext('2d').putImageData(clean, 0, 0)

  out.files['syrup'] = png(band(618, 892, FINCLEAN))
  out.files['basil'] = png(band(500, 566, FINCLEAN))
  out.files['sev'] = png(band(560, 624, FINCLEAN))
  out.files['milk'] = png(band(262, 506, FINCLEAN))

  // each cube: its own transparent piece (colour of the original photo, soft edge)
  comps.forEach((c, idx) => {
    const pad = 6, w = c.maxx - c.minx + 1 + pad * 2, h = c.maxy - c.miny + 1 + pad * 2
    const cc = document.createElement('canvas'); cc.width = w; cc.height = h
    const x = cc.getContext('2d'); const id = x.createImageData(w, h)
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      const sx = c.minx - pad + xx, sy = c.miny - pad + yy; if (sx < 0 || sy < 0 || sx >= BOX.W || sy >= BOX.H) continue
      const si = sy * BOX.W + sx; if (lab[si] !== c.id) continue
      const k = si * 4, o = (yy * w + xx) * 4
      id.data[o] = d[k]; id.data[o + 1] = d[k + 1]; id.data[o + 2] = d[k + 2]; id.data[o + 3] = 255
    }
    x.putImageData(id, 0, 0)
    const f = document.createElement('canvas'); f.width = w; f.height = h; const fx = f.getContext('2d'); fx.filter = 'blur(0.8px)'; fx.drawImage(cc, 0, 0)
    out.files[`cube-${idx}`] = png(f)
    out.cubes.push({ file: `cube-${idx}`, x: c.minx - pad, y: c.miny - pad, w, h })
  })

  // loose pieces: keep what differs from the surrounding background colour (sampled on a ring just outside), soft threshold
  const looseCut = (cx, cy, rx, ry, rot = 0) => {
    const W = Math.round(rx * 2 + 24), H = Math.round(ry * 2 + 24)
    const sx = cx - BOX.X - W / 2, sy = cy - BOX.Y - H / 2
    const cc = document.createElement('canvas'); cc.width = W; cc.height = H
    const x = cc.getContext('2d', { willReadFrequently: true }); x.drawImage(FIN, -sx, -sy)
    const id = x.getImageData(0, 0, W, H), dd = id.data
    const ex = (px, py) => { const c = Math.cos(-rot), s2 = Math.sin(-rot), dx = px - W / 2, dy = py - H / 2; const u = (dx * c - dy * s2) / rx, v = (dx * s2 + dy * c) / ry; return Math.hypot(u, v) }
    let r = 0, g = 0, b = 0, cnt = 0
    for (let a = 0; a < 360; a += 6) { const px = Math.round(W / 2 + Math.cos((a * Math.PI) / 180) * rx * 1.12), py = Math.round(H / 2 + Math.sin((a * Math.PI) / 180) * ry * 1.12); if (px < 0 || py < 0 || px >= W || py >= H) continue; const k = (py * W + px) * 4; r += dd[k]; g += dd[k + 1]; b += dd[k + 2]; cnt++ }
    r /= cnt; g /= cnt; b /= cnt
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const k = (py * W + px) * 4, e = ex(px, py)
      const dist = Math.hypot(dd[k] - r, dd[k + 1] - g, dd[k + 2] - b)
      let a = Math.max(0, Math.min(1, (dist - 38) / 55))
      a *= Math.max(0, Math.min(1, (1.08 - e) / 0.1))
      dd[k + 3] = Math.round(a * 255)
    }
    x.putImageData(id, 0, 0)
    const f = document.createElement('canvas'); f.width = W; f.height = H; const fx = f.getContext('2d'); fx.filter = 'blur(0.9px)'; fx.drawImage(cc, 0, 0)
    return { canvas: f, x: sx, y: sy, w: W, h: H }
  }

  // ---- strawberries ----
  const ell = (cx, cy, rx, ry, rot) => { const p = new Path2D(); p.ellipse(cx - BOX.X, cy - BOX.Y, rx, ry, rot, 0, 6.2832); return p }
  ;[[808, 748, 112, 100, -0.35], [1482, 800, 104, 96, 0.2]].forEach((e, i) => {
    const r = looseCut(...e)
    out.files[`berry-${i}`] = png(r.canvas)
    out.berries.push({ file: `berry-${i}`, x: r.x, y: r.y, w: r.w, h: r.h })
  })
  // jelly cubes that rest on the table beside the glass
  out.table = []
  ;[[822, 853, 50, 46], [1372, 852, 46, 42], [1612, 822, 46, 44]].forEach((e, i) => {
    const r = looseCut(...e)
    out.files[`tcube-${i}`] = png(r.canvas)
    out.table.push({ file: `tcube-${i}`, x: r.x, y: r.y, w: r.w, h: r.h })
  })

  // ---- scoop (+ rim toppings + drizzle), same crop box ----
  const scoop = new Path2D(); scoop.moveTo(1004 - BOX.X, 266 - BOX.Y); scoop.bezierCurveTo(996 - BOX.X, 150 - BOX.Y, 1070 - BOX.X, 52 - BOX.Y, 1157 - BOX.X, 50 - BOX.Y); scoop.bezierCurveTo(1244 - BOX.X, 52 - BOX.Y, 1318 - BOX.X, 150 - BOX.Y, 1312 - BOX.X, 266 - BOX.Y); scoop.closePath()
  out.files['scoop'] = png(cut(FIN, scoop, 1.6))

  // ---- empty glass: black-point crushed so brown background → black (screen-blended in CSS = invisible) ----
  const glassSel = poly([[904, 236], [1412, 236], [1392, 500], [1340, 884], [966, 884], [920, 500]])
  const gc = cut(EMP, glassSel, 3)
  const gx = gc.getContext('2d'), gd = gx.getImageData(0, 0, BOX.W, BOX.H)
  for (let i = 0; i < gd.data.length; i += 4) {
    const lum = 0.3 * gd.data[i] + 0.59 * gd.data[i + 1] + 0.11 * gd.data[i + 2]
    const a = Math.max(0, Math.min(1, (lum - 75) / 150)) * 0.62
    gd.data[i + 3] = Math.round(gd.data[i + 3] * a)
  }
  gx.putImageData(gd, 0, 0)
  out.files['glass'] = png(gc)
  out.box = BOX
  return out
})

for (const [name, data] of Object.entries(result.files)) fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data.split(',')[1], 'base64'))
fs.writeFileSync(path.join(OUT, '..', 'layers.json'), JSON.stringify({ box: result.box, cubes: result.cubes, berries: result.berries, table: result.table }, null, 1))
console.log('layers:', Object.keys(result.files).join(', '))
console.log('in-glass cubes:', result.cubes.length, '| table cubes:', result.table.length, '| berries:', result.berries.length)
await browser.close()
