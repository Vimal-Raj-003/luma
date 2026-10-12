import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { razorpayApi } from './server/razorpay.mjs'

// the payment API runs inside the dev / preview server, so `npm run dev` is all that is needed
const api = { name: 'luma-api', configureServer(s) { s.middlewares.use(razorpayApi) }, configurePreviewServer(s) { s.middlewares.use(razorpayApi) } }

export default defineConfig({
  plugins: [react(), api],
  server: { port: 5180, strictPort: true, host: true },
})
