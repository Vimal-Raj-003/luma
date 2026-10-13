/* Super Admin API (/api/admin/*). Every route calls requireAdmin first, so a signed-out visitor gets 401 and any other account gets 403.
   Money is stored in paise; the admin screens receive paise and format it. */
import crypto from 'node:crypto'
import { db } from './db.mjs'
import { requireAdmin } from './auth.mjs'
import { offerSwitch, setOfferEnabled } from './settings.mjs'

const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(body)) }
const bad = (message, status = 400) => Object.assign(new Error(message), { status })
const readJson = (req, max = 5000) => new Promise((ok, no) => {
  let s = ''
  req.on('data', (c) => { s += c; if (s.length > max) { no(bad('Request too large.')); req.destroy() } })
  req.on('end', () => { try { ok(JSON.parse(s || '{}')) } catch { no(bad('Bad JSON.')) } })
  req.on('error', no)
})

const IST = 5.5 * 3600 * 1000
const day = (d) => new Date(d.getTime() + IST).toISOString().slice(0, 10) // calendar day in India
const ORDER_STATUSES = ['CONFIRMED', 'PREPARING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const paymentView = (p) => (p.order.orderStatus === 'CANCELLED' && p.status !== 'PAID' ? 'CANCELLED' : p.status)

async function overview(url) {
  const days = url.searchParams.get('days') === '30' ? 30 : 7
  const since = new Date(new Date(day(new Date(Date.now() - (days - 1) * 86400000)) + 'T00:00:00+05:30'))
  const today = day(new Date())

  const [byPay, orderCount, customers, activeProducts, paid, recent, items, products] = await Promise.all([
    db.order.groupBy({ by: ['paymentStatus'], _count: true }),
    db.order.count(),
    db.user.count(),
    db.product.count({ where: { active: true, archived: false } }),
    db.payment.findMany({ where: { status: 'PAID' }, select: { amount: true, updatedAt: true } }),
    db.order.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.orderItem.findMany({ where: { order: { paymentStatus: 'PAID' } }, select: { productId: true, quantity: true, unitPrice: true, product: { select: { price: true, offerPrice: true } } } }),
    db.product.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true } }),
  ])
  const count = (s) => byPay.find((x) => x.paymentStatus === s)?._count || 0

  const labels = Array.from({ length: days }, (_, i) => day(new Date(since.getTime() + i * 86400000 + 3600000)))
  const rev = Object.fromEntries(labels.map((l) => [l, 0]))
  const ord = Object.fromEntries(labels.map((l) => [l, 0]))
  let totalRevenue = 0, todayRevenue = 0
  for (const p of paid) { totalRevenue += p.amount; const d = day(p.updatedAt); if (d === today) todayRevenue += p.amount; if (d in rev) rev[d] += p.amount }
  for (const o of recent) { const d = day(o.createdAt); if (d in ord) ord[d]++ }

  // sales by product; a line sold at the product's offer price (not its normal price) counts as the ₹1 Special Offer
  const sales = Object.fromEntries([...products.map((p) => [p.id, { name: p.name.replace(/ Falooda$/, ''), units: 0, revenue: 0 }]), ['offer', { name: '₹1 Special Offer', units: 0, revenue: 0 }]])
  for (const it of items) {
    const key = it.product.offerPrice != null && it.unitPrice === it.product.offerPrice && it.unitPrice !== it.product.price ? 'offer' : it.productId
    if (!sales[key]) continue
    sales[key].units += it.quantity
    sales[key].revenue += it.unitPrice * it.quantity
  }
  return {
    days,
    cards: { totalRevenue, todayRevenue, totalOrders: orderCount, paidOrders: count('PAID'), pendingPayments: count('PENDING'), failedPayments: count('FAILED'), customers, activeProducts },
    revenue: labels.map((l) => ({ day: l, value: rev[l] })),
    orders: labels.map((l) => ({ day: l, value: ord[l] })),
    payments: [{ label: 'Successful', value: count('PAID') }, { label: 'Pending', value: count('PENDING') }, { label: 'Failed', value: count('FAILED') }],
    sales: Object.values(sales),
  }
}

async function orders(url) {
  const f = url.searchParams.get('filter') || 'all'
  const where = { paid: { paymentStatus: 'PAID' }, pending: { paymentStatus: 'PENDING', orderStatus: { not: 'CANCELLED' } }, failed: { paymentStatus: 'FAILED', orderStatus: { not: 'CANCELLED' } }, cancelled: { orderStatus: 'CANCELLED' } }[f] || {}
  const rows = await db.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300, include: { user: { select: { name: true, email: true, phone: true } }, items: true } })
  return { orders: rows.map((o) => ({
    id: o.id, customer: o.user.name || '', email: o.user.email || o.user.phone || '',
    items: o.items.map((i) => ({ name: i.productName, quantity: i.quantity })), quantity: o.items.reduce((a, i) => a + i.quantity, 0),
    subtotal: o.subtotal, shipping: o.shipping, total: o.total, paymentStatus: o.paymentStatus, orderStatus: o.orderStatus,
    razorpayOrderId: o.razorpayOrderId, razorpayPaymentId: o.razorpayPaymentId, createdAt: o.createdAt,
  })) }
}

async function setOrderStatus(id, body) {
  const status = body.orderStatus
  if (!ORDER_STATUSES.includes(status)) throw bad('Unknown order status.') // payment states can never be set from here: only Razorpay verification marks an order paid
  const o = await db.order.findUnique({ where: { id } })
  if (!o) throw bad('Order not found.', 404)
  if (o.orderStatus === 'CANCELLED') throw bad('A cancelled order cannot be changed.', 409)
  if (status !== 'CANCELLED' && o.paymentStatus !== 'PAID') throw bad('Only an order with a verified Razorpay payment can be confirmed or fulfilled.', 409)
  await db.order.update({ where: { id }, data: { orderStatus: status } })
  return { ok: true, orderStatus: status }
}

async function payments() {
  const rows = await db.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 300, include: { order: { select: { id: true, orderStatus: true, user: { select: { name: true, email: true, phone: true } } } } } })
  return { payments: rows.map((p) => ({
    id: p.id, orderId: p.order.id, customer: p.order.user.name || '', email: p.order.user.email || p.order.user.phone || '', amount: p.amount,
    razorpayPaymentId: p.razorpayPaymentId, razorpayOrderId: p.razorpayOrderId, status: paymentView(p), createdAt: p.createdAt, updatedAt: p.updatedAt,
  })) }
}

async function customers() {
  const rows = await db.user.findMany({ orderBy: { createdAt: 'desc' }, take: 500, select: { id: true, name: true, email: true, phone: true, createdAt: true, orders: { select: { total: true, paymentStatus: true, createdAt: true } } } })
  return { customers: rows.map((u) => ({
    id: u.id, name: u.name || '', email: u.email || u.phone || '', joined: u.createdAt, orders: u.orders.length,
    spend: u.orders.filter((o) => o.paymentStatus === 'PAID').reduce((a, o) => a + o.total, 0),
    latestOrder: u.orders.length ? new Date(Math.max(...u.orders.map((o) => o.createdAt.getTime()))) : null,
  })) }
}

const IMG_MAX = 700 * 1024 // decoded bytes; the admin screen shrinks images before sending
const MAGIC = { 'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47, 'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, 'image/webp': (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' }
function parseImage(v) { // "data:image/webp;base64,..." -> bytes, only if it really is a png / jpeg / webp of a sane size
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(v))
  if (!m) throw bad('Image must be a PNG, JPEG or WebP file.')
  const bytes = Buffer.from(m[2], 'base64')
  if (!bytes.length || bytes.length > IMG_MAX) throw bad('Image is too large (max 700 KB after compression).')
  if (!MAGIC[m[1]](bytes)) throw bad('That file is not a valid image.')
  return { imageData: bytes, imageType: m[1] }
}

const view = (p) => ({
  id: p.id, name: p.name, flavour: p.flavour, description: p.description || '', price: p.price, offerPrice: p.offerPrice, active: p.active, archived: p.archived, sortOrder: p.sortOrder,
  imageUrl: p.imageType ? `/api/product-image/${p.id}?v=${p.updatedAt.getTime()}` : p.image, orderCount: p._count.items,
})
const products = async () => ({ products: (await db.product.findMany({
  orderBy: [{ archived: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  select: { id: true, name: true, flavour: true, description: true, price: true, offerPrice: true, image: true, imageType: true, active: true, archived: true, sortOrder: true, updatedAt: true, _count: { select: { items: true } } },
})).map(view) })

/* one validator for adding and editing: only the fields that are present are checked and returned */
async function productFields(body, id) {
  const data = {}
  if (body.name !== undefined) {
    const n = String(body.name).trim()
    if (n.length < 2 || n.length > 80) throw bad('Name must be 2 to 80 characters.')
    const dupe = await db.product.findFirst({ where: { archived: false, name: { equals: n, mode: 'insensitive' }, ...(id ? { id: { not: id } } : {}) } })
    if (dupe) throw bad('A product with this name already exists.', 409)
    data.name = n
  }
  if (body.flavour !== undefined) { const f = String(body.flavour).trim(); if (f.length < 1 || f.length > 40) throw bad('Flavour must be 1 to 40 characters.'); data.flavour = f }
  if (body.description !== undefined) { const d = String(body.description).trim(); if (d.length > 400) throw bad('Description is limited to 400 characters.'); data.description = d || null }
  if (body.price !== undefined) { // rupees in, paise stored; the ₹1 offer price is separate and is not touched
    const r = Number(body.price)
    if (!Number.isInteger(r) || r < 1 || r > 100000) throw bad('Price must be a whole number of rupees between 1 and 100000.')
    data.price = r * 100
  }
  if (body.sortOrder !== undefined) { const s = Number(body.sortOrder); if (!Number.isInteger(s) || s < 0 || s > 9999) throw bad('Sort order must be a whole number from 0 to 9999.'); data.sortOrder = s }
  if (body.active !== undefined) { if (typeof body.active !== 'boolean') throw bad('active must be true or false.'); data.active = body.active }
  if (body.archived !== undefined) { if (typeof body.archived !== 'boolean') throw bad('archived must be true or false.'); data.archived = body.archived; if (body.archived) data.active = false }
  if (body.image !== undefined) Object.assign(data, parseImage(body.image))
  return data
}

async function editProduct(id, body) {
  const data = await productFields(body, id)
  if (!Object.keys(data).length) throw bad('Nothing to change.')
  try { await db.product.update({ where: { id }, data }) } catch { throw bad('Product not found.', 404) }
  return products()
}

async function addProduct(body) {
  if (body.name === undefined || body.price === undefined) throw bad('Name and price are required.')
  if (body.image === undefined) throw bad('Please add a product image.')
  const data = await productFields({ flavour: body.name, sortOrder: 100, active: true, ...body })
  const slug = String(body.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'product'
  const id = `${slug}-${crypto.randomBytes(2).toString('hex')}`
  await db.product.create({ data: { id, image: `/api/product-image/${id}`, ...data } })
  return products()
}

/* Remove: a product that appears in any order is archived (hidden, kept for history); one that never sold, and has no ₹1 offer attached, is deleted. */
async function removeProduct(id) {
  const p = await db.product.findUnique({ where: { id }, include: { _count: { select: { items: true } } } })
  if (!p) throw bad('Product not found.', 404)
  if (p._count.items > 0 || p.offerPrice != null) await db.product.update({ where: { id }, data: { archived: true, active: false } })
  else await db.product.delete({ where: { id } })
  return { ...(await products()), result: p._count.items > 0 || p.offerPrice != null ? 'archived' : 'deleted' }
}

async function offer() {
  const [on, p] = await Promise.all([offerSwitch(), db.product.findUnique({ where: { id: 'strawberry' } })])
  return { enabled: on, productActive: !!p?.active, rules: { price: 1, shipping: 0, quantity: 1, handlingFee: 0, paise: p?.offerPrice ?? null } }
}

export function adminApi(req, res) {
  const url = new URL(req.url, 'http://x')
  const path = url.pathname
  const run = async () => {
    await requireAdmin(req) // before anything else, on every admin route
    const m = req.method
    let r, hit
    if (path === '/api/admin/me' && m === 'GET') r = { admin: true }
    else if (path === '/api/admin/overview' && m === 'GET') r = await overview(url)
    else if (path === '/api/admin/orders' && m === 'GET') r = await orders(url)
    else if ((hit = /^\/api\/admin\/orders\/([\w-]+)$/.exec(path)) && m === 'PATCH') r = await setOrderStatus(hit[1], await readJson(req))
    else if (path === '/api/admin/payments' && m === 'GET') r = await payments()
    else if (path === '/api/admin/customers' && m === 'GET') r = await customers()
    else if (path === '/api/admin/products' && m === 'GET') r = await products()
    else if (path === '/api/admin/products' && m === 'POST') r = await addProduct(await readJson(req, 1.1e6))
    else if ((hit = /^\/api\/admin\/products\/([\w-]+)$/.exec(path)) && m === 'PATCH') r = await editProduct(hit[1], await readJson(req, 1.1e6))
    else if ((hit = /^\/api\/admin\/products\/([\w-]+)$/.exec(path)) && m === 'DELETE') r = await removeProduct(hit[1])
    else if (path === '/api/admin/offer' && m === 'GET') r = await offer()
    else if (path === '/api/admin/offer' && m === 'PATCH') { const b = await readJson(req); if (typeof b.enabled !== 'boolean') throw bad('enabled must be true or false.'); await setOfferEnabled(b.enabled); r = await offer() }
    else throw bad('Not found.', 404)
    send(res, 200, r)
  }
  run().catch((e) => { if (!e.status || e.status >= 500) console.error('[admin]', path, e.message); if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Server error.' }) })
}
