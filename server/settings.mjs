/* Admin-controlled switches, stored in the Setting table. */
import { db } from './db.mjs'

const OFFER_KEY = 'offer.enabled'
const OFFER_PRODUCT = 'strawberry'

// the switch itself: no row means on (the behaviour before this existed)
export const offerSwitch = async () => {
  const s = await db.setting.findUnique({ where: { key: OFFER_KEY } })
  return s ? s.value === 'true' : true
}
export const setOfferEnabled = (on) => db.setting.upsert({ where: { key: OFFER_KEY }, create: { key: OFFER_KEY, value: String(on) }, update: { value: String(on) } })

// what visitors see: the switch is on AND the offer product is active and still at its ₹1 offer price
export async function offerEnabled() {
  const [on, p] = await Promise.all([offerSwitch(), db.product.findUnique({ where: { id: OFFER_PRODUCT } })])
  return on && !!p && p.active && !p.archived && p.offerPrice === 100
}
