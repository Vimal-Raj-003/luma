import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// local development and preview: the same API router that production runs as a Vercel Serverless Function (api/[...path].js). It is loaded only when the dev / preview
// server starts, so a production build never imports the backend (or needs its environment variables).
const mount = async (s) => { const { api: lumaApi } = await import('./server/api.mjs'); s.middlewares.use(lumaApi) }
const api = { name: 'luma-api', configureServer: mount, configurePreviewServer: mount }

export default defineConfig({
  plugins: [react(), api],
  server: { port: 5180, strictPort: true, host: true },
})
