/* Standalone API for production hosting:  node server/index.mjs
   (the Vite dev and preview servers mount the same handlers themselves, so `npm run dev` needs nothing else) */
import http from 'node:http'
import { api } from './api.mjs'

const port = Number(process.env.PORT) || 5181
http.createServer((req, res) => api(req, res, () => { res.statusCode = 404; res.end('Not found') }))
  .listen(port, () => console.log(`LUMA API on http://localhost:${port}`))
