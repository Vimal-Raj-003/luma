/*
  Exports the retouched stills (floating items thinned, empty-glass plate, extended left edge) to public/assets/photo/
  for the photographic scroll story and Signature section.   npm run dev, then:  npm run photos:prep
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'assets', 'photo')
fs.mkdirSync(OUT, { recursive: true })
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.goto(`${process.env.RENDER_URL || 'http://localhost:5180'}/photo-prep.html`, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => !!window.__prep, { timeout: 60000 })
const files = await page.evaluate(() => window.__prep())
for (const [name, data] of Object.entries(files)) {
  const f = path.join(OUT, `${name}.jpg`)
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'))
  console.log('✓', name + '.jpg', Math.round(fs.statSync(f).size / 1024) + ' KB')
}
await browser.close()
