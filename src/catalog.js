/* The database is the source of truth for the shop. Before the page renders, the live catalog (names, descriptions, prices, order, availability, uploaded images,
   and whether the ₹1 offer is on) is read from the server and applied to the site's own list, so the customer sees what the Super Admin set and what the server
   will charge. site.js stays only as the fallback (and for the artwork of the six launch flavours). Never blocks the page for long. */
import { FLAVOURS } from './data/site'

export const catalog = { offer: true, images: {} } // images: product id -> uploaded image URL (the built-in artwork is used when there is none)

const get = (url, ms) => Promise.race([
  fetch(url, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
  new Promise((ok) => setTimeout(() => ok(null), ms)),
]).catch(() => null)

export async function syncCatalog() {
  const [prods, offer] = await Promise.all([get('/api/products', 1500), get('/api/offer', 1500)])
  if (prods?.products) {
    const live = new Map(prods.products.map((p) => [p.id, p]))
    for (const p of prods.products) { // the server lists only active, non-archived products, already sorted
      let f = FLAVOURS.find((x) => x.id === p.id)
      if (!f) { f = { id: p.id, glow: '#F0709B', custom: true }; FLAVOURS.push(f) } // a product added by the Super Admin
      f.name = p.name
      f.price = p.price / 100
      if (p.description) f.desc = p.description
      if (p.uploaded) catalog.images[p.id] = p.uploaded
    }
    FLAVOURS.forEach((f) => { f.active = live.has(f.id) })
    for (let i = FLAVOURS.length - 1; i >= 0; i--) if (FLAVOURS[i].custom && !FLAVOURS[i].active) FLAVOURS.splice(i, 1) // a custom product that is off does not exist for the customer
    const rank = new Map(prods.products.map((p, i) => [p.id, i]))
    FLAVOURS.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999)) // sortOrder, as decided by the server
  }
  if (offer) catalog.offer = !!offer.enabled
}
