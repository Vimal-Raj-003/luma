/* Seeds / refreshes the product table from the site's own price list. Safe to re-run: it upserts by id and never deletes. */
import { PrismaClient } from '@prisma/client'
import { FLAVOURS } from '../src/data/site.js'

const OFFER = { strawberry: 100 } // paise: Strawberry is ₹1 for the launch offer (one unit per order)
const db = new PrismaClient()
for (const f of FLAVOURS) {
  const data = { name: f.name, flavour: f.name.replace(/ Falooda$/, '').replace(/^Royal /, ''), price: f.price * 100, offerPrice: OFFER[f.id] ?? null, image: `/assets/flavours/${f.id}.webp`, active: true }
  await db.product.upsert({ where: { id: f.id }, create: { id: f.id, ...data }, update: data })
}
console.log('products:', await db.product.count())
await db.$disconnect()
