import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Multi-page build:
//   index.html    → the public marketing landing (static HTML, no React)
//   apply.html    → the cohort application (static HTML + Stripe checkout)
//   app.html      → the React SPA shell, served at /community/* via vercel.json
//   students.html → the public cohort showcase SPA, served at /students/*
//
// The public pages stay plain HTML on purpose. WEBSITE-STRATEGY.md argues the
// landing page has to be crawlable; a client-rendered SPA shell is not reliably
// crawled by the non-Google bots (ChatGPT, Perplexity) the keyword strategy targets.

// In production vercel.json rewrites /community/* and /students/* to their SPA
// shells; this mirrors that for `npm run dev` (only for extension-less paths,
// so asset requests pass through untouched).
const spaFallbacks = () => ({
  name: 'spa-fallbacks',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = req.url.split('?')[0];
      if (/^\/students(\/|$)/.test(path) && !path.includes('.')) req.url = '/students.html';
      else if (/^\/community(\/|$)/.test(path) && !path.includes('.')) req.url = '/app.html';
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), spaFallbacks()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        apply: resolve(__dirname, 'apply.html'),
        // Private, unadvertised 10%-discount copy of the application page. Nothing links
        // to it; reachable only by direct URL (/discount).
        discount: resolve(__dirname, 'discount.html'),
        app: resolve(__dirname, 'app.html'),
        students: resolve(__dirname, 'students.html'),
      },
    },
  },
})
