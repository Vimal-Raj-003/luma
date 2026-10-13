/* Vercel Serverless Function for EVERY /api/* route (customers, Razorpay, orders, payments, products, Super Admin).
   One catch-all function in front of the existing router: see server/vercel.mjs and server/api.mjs. */
import handler from '../server/vercel.mjs'

export default handler
export const config = { api: { bodyParser: false } } // the router reads the raw body itself
