import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Multi-page build:
//   index.html  → the public marketing landing (static HTML, no React)
//   apply.html  → the cohort application (static HTML + Stripe checkout)
//   app.html    → the React SPA shell, served at /community/* via vercel.json
//
// The public pages stay plain HTML on purpose. WEBSITE-STRATEGY.md argues the
// landing page has to be crawlable; a client-rendered SPA shell is not reliably
// crawled by the non-Google bots (ChatGPT, Perplexity) the keyword strategy targets.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        apply: resolve(__dirname, 'apply.html'),
        app: resolve(__dirname, 'app.html'),
      },
    },
  },
})
