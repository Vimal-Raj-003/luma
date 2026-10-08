/*
  Renders the hero video from tools/hero-render (frame-exact GSAP timeline) and encodes it for the web.
    npm run dev            (in another terminal — the render scene is served by Vite)
    npm run hero:render    (both formats)   |   node tools/render-hero.mjs desktop   |   node tools/render-hero.mjs portrait
  Output → public/assets/hero/   hero-<mode>.mp4 (H.264) · hero-<mode>.webm (VP9) · hero-<mode>-poster.jpg · hero-<mode>-final.jpg
  Needs Chrome (CHROME_PATH to override) and ffmpeg (ffmpeg-static, or FFMPEG_PATH).
*/
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const require = createRequire(import.meta.url)
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'assets', 'hero')
const FFMPEG = process.env.FFMPEG_PATH || require('ffmpeg-static')
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL_BASE = process.env.RENDER_URL || 'http://localhost:5180'
const FPS = 30
const POSTER_T = 2.0 // empty glass, settled
const FINAL_T = 15.0 // finished Falooda
const modes = process.argv[2] ? [process.argv[2]] : ['desktop', 'portrait']

fs.mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })

for (const mode of modes) {
  const t0 = Date.now()
  const page = await browser.newPage()
  await page.goto(`${URL_BASE}/hero-render.html?mode=${mode}`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => !!window.__render, { timeout: 90000 })
  const { duration, width, height } = await page.evaluate(() => ({ duration: window.__render.duration, width: window.__render.width, height: window.__render.height }))
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.evaluate(() => document.fonts && document.fonts.ready)

  const dir = path.join(os.tmpdir(), `luma-hero-${mode}`)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })

  const frames = Math.round(duration * FPS)
  const shoot = async (t, file, quality) => {
    await page.evaluate((x) => { window.__render.seek(x); return 1 }, t)
    await page.screenshot({ path: file, type: 'jpeg', quality })
  }
  for (let i = 0; i < frames; i++) {
    await shoot(Math.min(duration, i / FPS), path.join(dir, `${String(i).padStart(4, '0')}.jpg`), 94)
    if (i % 60 === 0) console.log(`${mode}: frame ${i}/${frames}`)
  }
  await shoot(POSTER_T, path.join(OUT, `hero-${mode}-poster.jpg`), 86)
  await shoot(FINAL_T, path.join(OUT, `hero-${mode}-final.jpg`), 86)
  await page.close()

  const input = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg')]
  execFileSync(FFMPEG, [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(OUT, `hero-${mode}.mp4`)], { stdio: 'inherit' })
  execFileSync(FFMPEG, [...input, '-c:v', 'libvpx-vp9', '-crf', '37', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', '-an', path.join(OUT, `hero-${mode}.webm`)], { stdio: 'inherit' })
  fs.rmSync(dir, { recursive: true, force: true })

  const kb = (f) => Math.round(fs.statSync(path.join(OUT, f)).size / 1024)
  console.log(`✓ ${mode}: ${frames} frames (${width}×${height}, ${duration.toFixed(1)}s) in ${Math.round((Date.now() - t0) / 1000)}s → mp4 ${kb(`hero-${mode}.mp4`)} KB · webm ${kb(`hero-${mode}.webm`)} KB`)
}
await browser.close()
