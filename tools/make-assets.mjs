/*
  Pre-renders the LUMA ingredient sprites as separate transparent PNGs → public/assets/falooda/

  Each sprite is lit (diffuse + specular on a procedural bump map) and carries a soft baked shadow,
  so at runtime the ingredients are real raster layers that GSAP moves independently, instead of flat vector shapes.
  Run:  npm run assets      (needs Chrome; set CHROME_PATH if it is not in the default Windows location)
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { SCOOPS } from '../src/components/glassGeometry.js'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'falooda')
fs.mkdirSync(OUT, { recursive: true })
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

/* ---------- shared filter recipes ---------- */
const shadow = (id, dy = 3, blur = 3, op = 0.3) =>
  `<filter id="${id}" x="-40%" y="-40%" width="180%" height="190%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="#3A1236" flood-opacity="${op}"/></filter>`

// lights the source graphic with bump from noise: multiply (diffuse) + screen (specular)
const material = (id, { freq = 0.06, oct = 3, seed = 2, scale = 2.4, spec = 0.55, exp = 22, bright = 1.28, az = 225, el = 52 } = {}) => `
<filter id="${id}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}" result="n"/>
  <feDiffuseLighting in="n" surfaceScale="${scale}" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="${az}" elevation="${el}"/></feDiffuseLighting>
  <feComponentTransfer in="d" result="db"><feFuncR type="linear" slope="${bright}"/><feFuncG type="linear" slope="${bright}"/><feFuncB type="linear" slope="${bright}"/></feComponentTransfer>
  <feBlend in="SourceGraphic" in2="db" mode="multiply" result="m"/>
  <feSpecularLighting in="n" surfaceScale="${scale}" specularConstant="${spec}" specularExponent="${exp}" lighting-color="#fff" result="s"><feDistantLight azimuth="${az}" elevation="${el}"/></feSpecularLighting>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
  <feBlend in="m" in2="s2" mode="screen" result="o"/>
  <feComposite in="o" in2="SourceAlpha" operator="in"/>
</filter>`

// shading-only layer (no colour of its own): dark dents + bright glints, clipped to the shape's alpha
const shading = (id, { freq = 0.12, oct = 3, seed = 4, scale = 2.6, spec = 0.5, exp = 26, dark = 1.6, az = 225, el = 52 } = {}) => `
<filter id="${id}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${oct}" seed="${seed}" result="n"/>
  <feDiffuseLighting in="n" surfaceScale="${scale}" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="${az}" elevation="${el}"/></feDiffuseLighting>
  <feColorMatrix in="d" type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.04  0 0 0 0 0.1  ${-dark / 3} ${-dark / 3} ${-dark / 3} 0 ${dark * 0.77}" result="dk"/>
  <feSpecularLighting in="n" surfaceScale="${scale}" specularConstant="${spec}" specularExponent="${exp}" lighting-color="#fff" result="s"/>
  <feMerge result="mm"><feMergeNode in="dk"/><feMergeNode in="s"/></feMerge>
  <feComposite in="mm" in2="SourceAlpha" operator="in"/>
</filter>`

const wrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (h, t, to = 255) => '#' + hexToRgb(h).map((c) => Math.round(c + (to - c) * t).toString(16).padStart(2, '0')).join('')

const SPRITES = {}

/* ---------- pistachio kernel + shard ---------- */
const KERNEL = 'M80 16 C113 26 130 66 120 104 C112 133 91 148 72 141 C47 133 33 98 43 62 C49 38 64 18 80 16Z'
SPRITES['pistachio'] = wrap(160, 160, `
<defs>${shadow('sh', 4, 3.2, 0.32)}${material('tx', { freq: 0.2, oct: 2, seed: 7, scale: 0.8, spec: 0.35, bright: 1.1 })}
<radialGradient id="g" cx=".36" cy=".3" r=".9"><stop offset="0" stop-color="#CBE88F"/><stop offset=".45" stop-color="#93C257"/><stop offset=".82" stop-color="#6A9C39"/><stop offset="1" stop-color="#4C7C29"/></radialGradient>
<clipPath id="k"><path d="${KERNEL}"/></clipPath></defs>
<g filter="url(#sh)"><g filter="url(#tx)">
  <path d="${KERNEL}" fill="url(#g)"/>
  <g clip-path="url(#k)" opacity=".5"><path d="M70 150 C100 140 128 112 126 84 C118 120 98 140 62 146Z" fill="#9C6B4B"/><ellipse cx="108" cy="52" rx="14" ry="22" fill="#A9794F" opacity=".5" transform="rotate(20 108 52)"/><ellipse cx="52" cy="104" rx="9" ry="14" fill="#9C6B4B" opacity=".45"/></g>
</g></g>
<path d="M58 40 C66 26 82 22 94 28" fill="none" stroke="#F1FACB" stroke-opacity=".7" stroke-width="3.2" stroke-linecap="round"/>`)

const SHARD = 'M20 92 L60 30 L112 42 L138 98 L92 138 L40 128Z'
SPRITES['pistachio-chip'] = wrap(160, 160, `
<defs>${shadow('sh', 4, 3.2, 0.3)}${material('tx', { freq: 0.22, oct: 2, seed: 11, scale: 1.0, spec: 0.35, bright: 1.1 })}
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B8DC7C"/><stop offset=".6" stop-color="#86B84F"/><stop offset="1" stop-color="#5F9533"/></linearGradient></defs>
<g filter="url(#sh)"><g filter="url(#tx)"><path d="${SHARD}" fill="url(#g)" stroke="#5C8E31" stroke-opacity=".5" stroke-width="2" stroke-linejoin="round"/><path d="M60 30 L112 42 L84 66Z" fill="#E4F4B0" opacity=".45"/></g></g>`)

/* ---------- rose petals ---------- */
const petal = (variant) => {
  const d = variant === 1
    ? 'M80 152 C26 132 12 70 42 30 C58 10 100 8 118 32 C148 66 134 124 80 152Z'
    : 'M80 154 C40 138 28 84 52 40 C64 14 98 6 112 30 C138 70 124 128 80 154Z'
  return wrap(160, 170, `
<defs>${shadow('sh', 4, 3.4, 0.3)}${material('tx', { freq: '0.12 0.012', oct: 2, seed: 5 + variant, scale: 0.35, spec: 0.28, exp: 14, bright: 1.08 })}
<radialGradient id="g" cx=".5" cy=".78" r=".95"><stop offset="0" stop-color="#FFC4D6"/><stop offset=".4" stop-color="#F58CAF"/><stop offset=".85" stop-color="#E0517F"/><stop offset="1" stop-color="#C13A6E"/></radialGradient>
<clipPath id="p"><path d="${d}"/></clipPath></defs>
<g filter="url(#sh)"><g filter="url(#tx)">
  <path d="${d}" fill="url(#g)"/>
  <g clip-path="url(#p)"><path d="M80 154 C78 110 84 66 96 14" fill="none" stroke="#B83A68" stroke-opacity=".22" stroke-width="2"/><path d="M80 150 C62 112 52 76 50 40" fill="none" stroke="#B83A68" stroke-opacity=".2" stroke-width="1.6"/><path d="M80 150 C102 114 112 80 114 42" fill="none" stroke="#B83A68" stroke-opacity=".2" stroke-width="1.6"/>
  <path d="M80 160 C40 140 24 100 36 60 C46 100 60 132 84 150Z" fill="#9E2B5A" opacity=".28"/></g>
</g></g>
<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".38" stroke-width="2.4" stroke-linejoin="round" clip-path="url(#p)"/>
<path d="M50 44 C60 22 84 14 104 22" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3.4" stroke-linecap="round"/>`)
}
SPRITES['petal'] = petal(1)
SPRITES['petal-2'] = petal(2)

/* ---------- jelly cubes (translucent gel, four hues) ---------- */
const jelly = (hex) => {
  const light = mix(hex, 0.55)
  const dark = mix(hex, 0.35, 0)
  return wrap(120, 120, `
<defs>${shadow('sh', 5, 3.4, 0.24)}
<linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".5" stop-color="${hex}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
<radialGradient id="c" cx=".7" cy=".78" r=".5"><stop offset="0" stop-color="${mix(hex, 0.7)}" stop-opacity=".85"/><stop offset="1" stop-color="${hex}" stop-opacity="0"/></radialGradient>
<filter id="bl"><feGaussianBlur stdDeviation="1.1"/></filter></defs>
<g filter="url(#sh)">
  <rect x="22" y="22" width="76" height="76" rx="19" fill="url(#b)" fill-opacity=".8"/>
  <rect x="22" y="22" width="76" height="76" rx="19" fill="url(#c)"/>
  <rect x="30" y="30" width="60" height="60" rx="14" fill="#fff" fill-opacity=".1"/>
  <path d="M26 44 C26 31 34 24 46 24 L70 24" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3.4" stroke-linecap="round" filter="url(#bl)"/>
  <ellipse cx="38" cy="38" rx="5" ry="3" fill="#fff" fill-opacity=".85" transform="rotate(-38 38 38)"/>
  <path d="M94 66 C94 84 86 94 72 94" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2.2" stroke-linecap="round"/>
  <rect x="22" y="22" width="76" height="76" rx="19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/>
  <rect x="23.5" y="23.5" width="73" height="73" rx="17.5" fill="none" stroke="${dark}" stroke-opacity=".28" stroke-width="1"/>
</g>`)
}
const JELLY_HUES = ['#FF86AB', '#A5D98F', '#FFD35F', '#FF9A5C']
JELLY_HUES.forEach((h) => (SPRITES[`jelly-${h.slice(1).toLowerCase()}`] = jelly(h)))

/* ---------- basil seed in its gel ---------- */
SPRITES['basil'] = wrap(80, 100, `
<defs>${shadow('sh', 2.4, 2, 0.22)}
<radialGradient id="h" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset=".75" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity=".55"/></radialGradient>
<radialGradient id="s" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#5A4666"/><stop offset=".5" stop-color="#2A1B33"/><stop offset="1" stop-color="#110716"/></radialGradient>
${material('tx', { freq: 0.5, oct: 2, seed: 3, scale: 1.2, spec: 0.5, exp: 30, bright: 1.1 })}</defs>
<g filter="url(#sh)">
  <ellipse cx="40" cy="50" rx="31" ry="40" fill="url(#h)"/>
  <ellipse cx="40" cy="50" rx="31" ry="40" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.6"/>
  <path d="M22 28 C26 18 34 13 44 12" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="2.6" stroke-linecap="round"/>
  <g filter="url(#tx)" transform="rotate(-14 40 50)"><ellipse cx="40" cy="52" rx="14" ry="21" fill="url(#s)"/></g>
  <ellipse cx="34" cy="42" rx="3.4" ry="6" fill="#fff" fill-opacity=".5" transform="rotate(-14 34 42)"/>
</g>`)

/* ---------- cherry ---------- */
SPRITES['cherry'] = wrap(140, 170, `
<defs>${shadow('sh', 5, 3.6, 0.32)}${material('tx', { freq: 0.5, oct: 2, seed: 9, scale: 0.9, spec: 0.35, exp: 28, bright: 1.12 })}
<radialGradient id="g" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#E84D70"/><stop offset=".45" stop-color="#B8183F"/><stop offset=".85" stop-color="#7A0B2B"/><stop offset="1" stop-color="#560620"/></radialGradient>
<linearGradient id="st" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#6A8A3E"/><stop offset="1" stop-color="#4A6428"/></linearGradient></defs>
<g filter="url(#sh)">
  <path d="M70 52 C72 30 90 12 114 8" fill="none" stroke="url(#st)" stroke-width="5.4" stroke-linecap="round"/>
  <path d="M71 50 C73 32 88 17 108 11" fill="none" stroke="#B4D27C" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>
  <g filter="url(#tx)"><circle cx="66" cy="106" r="52" fill="url(#g)"/></g>
  <ellipse cx="68" cy="60" rx="9" ry="4.4" fill="#3A0414" fill-opacity=".6"/>
  <path d="M30 118 C34 146 58 160 84 156" fill="none" stroke="#FF8CA6" stroke-opacity=".4" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="46" cy="82" rx="15" ry="8.4" fill="#fff" fill-opacity=".78" transform="rotate(-34 46 82)"/>
  <ellipse cx="92" cy="128" rx="14" ry="6" fill="#fff" fill-opacity=".14" transform="rotate(-36 92 128)"/>
</g>`)

/* ---------- almond sliver ---------- */
SPRITES['almond'] = wrap(160, 100, `
<defs>${shadow('sh', 3, 2.6, 0.28)}${material('tx', { freq: '0.02 0.3', oct: 2, seed: 6, scale: 0.45, spec: 0.25, exp: 14, bright: 1.08 })}
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EFD3A6"/><stop offset=".6" stop-color="#D5A972"/><stop offset="1" stop-color="#B98448"/></linearGradient></defs>
<g filter="url(#sh)"><g filter="url(#tx)"><path d="M12 54 C42 20 112 16 148 52 C112 82 42 84 12 54Z" fill="url(#g)"/><path d="M26 54 C58 38 108 36 136 52" fill="none" stroke="#9B6A36" stroke-opacity=".5" stroke-width="2.2" stroke-linecap="round"/></g></g>
<path d="M30 46 C56 28 98 26 126 38" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`)

/* ---------- strawberry slice ---------- */
const HEART = 'M80 146 C34 114 18 78 30 52 C40 30 68 28 80 50 C92 28 120 30 130 52 C142 78 126 114 80 146Z'
SPRITES['berry'] = wrap(160, 160, `
<defs>${shadow('sh', 4, 3.4, 0.3)}${material('tx', { freq: 0.3, oct: 2, seed: 8, scale: 0.55, spec: 0.3, exp: 18, bright: 1.08 })}
<radialGradient id="o" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#FF7C96"/><stop offset=".7" stop-color="#E73A5E"/><stop offset="1" stop-color="#BE1F44"/></radialGradient>
<radialGradient id="i" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#FFF1F2"/><stop offset=".45" stop-color="#FFC1CD"/><stop offset="1" stop-color="#FF8FA6"/></radialGradient></defs>
<g filter="url(#sh)"><g filter="url(#tx)">
  <path d="${HEART}" fill="url(#o)"/>
  <path d="M80 132 C46 106 34 80 42 62 C48 48 68 48 80 64 C92 48 112 48 118 62 C126 80 114 106 80 132Z" fill="url(#i)"/>
  ${Array.from({ length: 9 }, (_, k) => { const a = -Math.PI / 2 + (k - 4) * 0.34; return `<path d="M80 84 L${(80 + Math.cos(a) * 40).toFixed(1)} ${(88 + Math.sin(a) * 36).toFixed(1)}" stroke="#E86C86" stroke-opacity=".35" stroke-width="1.6"/>` }).join('')}
  ${[[44, 70], [58, 54], [102, 54], [116, 70], [52, 96], [108, 96], [80, 116], [66, 108], [94, 108]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="3.4" fill="#FFE29A"/>`).join('')}
</g></g>
<path d="M44 50 C52 38 66 36 76 46" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>`)

/* ---------- fruit chunk shading (drawn over a palette-coloured rounded square) ---------- */
SPRITES['chunk-shade'] = wrap(100, 100, `
<defs>${shading('sd', { freq: 0.1, oct: 3, seed: 12, scale: 1.3, spec: 0.3, exp: 22, dark: 0.55 })}
<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#3A1236" stop-opacity="0"/><stop offset="1" stop-color="#3A1236" stop-opacity=".26"/></linearGradient></defs>
<rect x="8" y="8" width="84" height="84" rx="20" fill="#000" filter="url(#sd)"/>
<rect x="8" y="8" width="84" height="84" rx="20" fill="url(#t)"/>
<rect x="9" y="9" width="82" height="82" rx="19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
<rect x="8" y="8" width="84" height="84" rx="20" fill="none" stroke="#3A1236" stroke-opacity=".16" stroke-width="1.4"/>
<path d="M20 30 C20 22 25 18 34 18 L52 18" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-linecap="round"/>`)

/* ---------- ice-cream scoop shading: one overlay per scoop, aligned to the vector dome ---------- */
const scoopOverlay = (s) => {
  const { x, y, w, h } = s.ov
  const clip = `<clipPath id="c"><path d="${s.d}"/></clipPath>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 3}" height="${h * 3}" viewBox="${x} ${y} ${w} ${h}">
<defs>${clip}${shading('gr', { freq: 0.6, oct: 2, seed: 21 + s.g, scale: 0.5, spec: 0.28, exp: 36, dark: 0.45 })}${shading('lm', { freq: 0.035, oct: 2, seed: 31 + s.g, scale: 1.5, spec: 0.22, exp: 16, dark: 0.4 })}
<radialGradient id="rs" cx=".34" cy=".26" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#4A1942" stop-opacity=".08"/><stop offset="1" stop-color="#4A1942" stop-opacity=".3"/></radialGradient>
<linearGradient id="ao" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="#4A1942" stop-opacity="0"/><stop offset="1" stop-color="#4A1942" stop-opacity=".38"/></linearGradient>
<filter id="bl"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
<g clip-path="url(#c)">
  <path d="${s.d}" fill="#000" filter="url(#lm)" opacity=".75"/>
  <path d="${s.d}" fill="#000" filter="url(#gr)" opacity=".6"/>
  <path d="${s.d}" fill="url(#rs)"/>
  <path d="${s.d}" fill="url(#ao)"/>
  ${s.specks.map((k) => `<circle cx="${k.x.toFixed(1)}" cy="${k.y.toFixed(1)}" r="${(k.r * 0.95).toFixed(2)}" fill="#5A3B22" fill-opacity=".55"/>`).join('')}
  ${s.ridges.map((d) => `<path d="${d}" fill="none" stroke="#4A1942" stroke-opacity=".16" stroke-width="2.2" stroke-linecap="round" filter="url(#bl)"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1" stroke-linecap="round" transform="translate(0 -1.8)"/>`).join('')}
  <path d="${s.d}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3.2" filter="url(#bl)" transform="translate(-1.6 -1.6)"/>
  <ellipse cx="${s.cx - s.r * 0.36}" cy="${s.cy - s.r * 0.58}" rx="${s.r * 0.3}" ry="${s.r * 0.1}" fill="#fff" fill-opacity=".38" transform="rotate(-28 ${s.cx - s.r * 0.36} ${s.cy - s.r * 0.58})" filter="url(#bl)"/>
  <ellipse cx="${s.cx - s.r * 0.43}" cy="${s.cy - s.r * 0.63}" rx="${s.r * 0.07}" ry="${s.r * 0.035}" fill="#fff" fill-opacity=".85" transform="rotate(-28 ${s.cx - s.r * 0.43} ${s.cy - s.r * 0.63})"/>
</g></svg>`
}

// a complete vanilla scoop sprite (used for the story chip): colour + the same shading
const vanilla = SCOOPS[0]
const scoopFull = () => {
  const { x, y, w, h } = vanilla.ov
  const inner = scoopOverlay(vanilla).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 3}" height="${h * 3}" viewBox="${x} ${y} ${w} ${h}">
<defs><radialGradient id="v" cx=".34" cy=".26" r=".95"><stop offset="0" stop-color="#FFF7EA"/><stop offset=".62" stop-color="#FFF7EA"/><stop offset="1" stop-color="#F4DDC2"/></radialGradient>
<filter id="dsh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#3A1236" flood-opacity=".25"/></filter></defs>
<path d="${vanilla.d}" fill="url(#v)" filter="url(#dsh)"/>${inner}</svg>`
}

/* ---------- render ---------- */
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const render = async (name, svg, scale = 2) => {
  const m = svg.match(/width="([\d.]+)" height="([\d.]+)"/)
  const w = Math.ceil(+m[1])
  const h = Math.ceil(+m[2])
  await page.setViewport({ width: w, height: h, deviceScaleFactor: scale })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } })
  console.log('✓', name, `${w * scale}×${h * scale}`)
}
for (const [name, svg] of Object.entries(SPRITES)) await render(name, svg)
for (const s of SCOOPS) await render(`scoop-shade-${s.id}`, scoopOverlay(s), 1)
await render('scoop-vanilla', scoopFull(), 1)
await browser.close()
