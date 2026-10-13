/* Vercel Serverless Function for EVERY /api/* route (customers, Razorpay, orders, payments, products, Super Admin).
   vercel.json rewrites /api/:path* to this one function, which hands the request to the existing router: see server/vercel.mjs and server/api.mjs.
   (A "[...path].js" catch-all file only matches ONE path segment on Vercel's plain-function routing, so nested routes such as /api/admin/overview and
   /api/my/orders returned Vercel's own 404; the explicit rewrite covers any depth.) */
import handler from '../server/vercel.mjs'

export default handler
export const config = { api: { bodyParser: false } } // the router reads the raw body itself
