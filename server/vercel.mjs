/* Vercel Serverless entry: hands every /api/* request to the SAME router the dev server and server/index.mjs use (server/api.mjs), so there is exactly one set of
   routes and one copy of the business logic (customers, Razorpay, orders, payments, products, Super Admin).
   The router's handlers read the request body from the stream themselves. Depending on the platform's body helpers the stream may already be consumed and the
   parsed body sits on req.body instead, so this reads the raw stream first and falls back to req.body, then gives the router a fresh, replayable request. */
import { Readable } from 'node:stream'
import { api } from './api.mjs'

const NO_BODY = new Set(['GET', 'HEAD', 'OPTIONS', 'DELETE'])

async function rawBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c)
  return Buffer.concat(chunks)
}

const json = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }

export default async function handler(req, res) {
  try {
    let body = NO_BODY.has(req.method) ? Buffer.alloc(0) : await rawBody(req)
    if (!body.length && !NO_BODY.has(req.method) && req.body != null) { // the platform already parsed it: put it back as bytes
      body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
    }
    const r = Readable.from(body.length ? [body] : [])
    Object.assign(r, { method: req.method, url: req.url, headers: req.headers, socket: req.socket, connection: req.socket })
    // the function is finished when the response is: wait for it, so the platform does not freeze the instance mid-request
    await new Promise((done) => {
      res.once('finish', done)
      res.once('close', done)
      api(r, res, () => json(res, 404, { error: 'Not found.' }))
    })
  } catch (e) {
    console.error('[api]', e)
    if (!res.headersSent) json(res, 500, { error: 'Server error. Please try again.' })
  }
}
