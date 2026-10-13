/* All of LUMA's API routes as one Connect-style middleware. */
import { razorpayApi } from './razorpay.mjs'
import { requireUser, isAdmin } from './auth.mjs'
import { adminApi } from './admin.mjs'
import { offerEnabled } from './settings.mjs'
import { createGuest } from './guest.mjs'
import { myOrders } from './orders.mjs'
import { health } from './health.mjs'
import { db } from './db.mjs'

const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }

export function api(req, res, next) {
  const path = (req.url || '').split('?')[0]
  const fail = (e) => { console.error('[api]', path, e.message); if (!res.headersSent) send(res, e.status || 500, { error: e.message }) }

  if (path === '/api/me' && req.method === 'POST') { // signed in → make sure the customer exists, return it
    // `admin` is worked out here from SUPER_ADMIN_EMAIL; the browser only uses it to show the menu item (every admin API call is checked again)
    return requireUser(req).then(async (u) => send(res, 200, { id: u.id, name: u.name, email: u.email, created: u.created, admin: await isAdmin(req) })).catch(fail)
  }
  if (path === '/api/guest' && req.method === 'POST') return createGuest(req).then((r) => send(res, 200, r)).catch(fail) // name + mobile -> a lightweight customer (no OTP)
  if (path === '/api/health' && req.method === 'GET') return health().then((r) => { res.setHeader('Cache-Control', 'no-store'); send(res, 200, r) }).catch(fail) // which settings the running server can see (names and kinds only, never values)
  if (path === '/api/my/orders' && req.method === 'GET') return myOrders(req).then((r) => { res.setHeader('Cache-Control', 'no-store'); send(res, 200, r) }).catch(fail) // a verified customer's own orders
  if (path.startsWith('/api/admin/')) return adminApi(req, res)
  if (path === '/api/offer' && req.method === 'GET') { // public: is the ₹1 offer currently on?
    return offerEnabled().then((enabled) => { res.setHeader('Cache-Control', 'no-store'); send(res, 200, { enabled }) }).catch(fail)
  }
  if (path === '/api/products' && req.method === 'GET') { // public catalog: only products that are available and not archived, in the admin's sort order
    res.setHeader('Cache-Control', 'no-store')
    return db.product.findMany({ where: { active: true, archived: false }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, name: true, flavour: true, description: true, price: true, offerPrice: true, image: true, imageType: true, sortOrder: true, updatedAt: true } })
      .then((p) => send(res, 200, { products: p.map(({ imageType, updatedAt, ...r }) => ({ ...r, uploaded: imageType ? `/api/product-image/${r.id}?v=${updatedAt.getTime()}` : null })) })).catch(fail)
  }
  let img // an uploaded product image, served from the database (the ?v= in its URL changes whenever the product does, so it can be cached for good)
  if (req.method === 'GET' && (img = /^\/api\/product-image\/([\w-]+)$/.exec(path))) {
    return db.product.findUnique({ where: { id: img[1] }, select: { imageData: true, imageType: true } }).then((p) => {
      if (!p?.imageData) return send(res, 404, { error: 'No image.' })
      res.statusCode = 200; res.setHeader('Content-Type', p.imageType); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.end(Buffer.from(p.imageData))
    }).catch(fail)
  }
  return razorpayApi(req, res, next)
}
