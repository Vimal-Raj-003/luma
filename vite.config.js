import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { api as lumaApi } from './server/api.mjs'

// the API (auth, products, payments) runs inside the dev / preview server, so `npm run dev` is all that is needed
const api = { name: 'luma-api', configureServer(s) { s.middlewares.use(lumaApi) }, configurePreviewServer(s) { s.middlewares.use(lumaApi) } }

export default defineConfig({
  plugins: [react(), api],
  server: { port: 5180, strictPort: true, host: true },
})
