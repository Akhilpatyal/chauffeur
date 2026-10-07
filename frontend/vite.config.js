import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    /*
     * Split the libraries out of the app chunk.
     *
     * React, GSAP and Lenis change only when we upgrade them; app code changes
     * on every deploy. Keeping them in one chunk meant every release
     * invalidated ~300 KB of unchanged library code in every returning
     * visitor's cache. Separated, a normal deploy re-downloads only the app.
     */
    rollupOptions: {
      output: {
        /* Rolldown (Vite 8) takes a function here, not a map. */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) {
            return 'vendor-react';
          }
          if (/[\/]node_modules[\/](gsap|lenis|@gsap)[\/]/.test(id)) {
            return 'vendor-motion';
          }
          return undefined;
        },
      },
    },
    /* Source maps stay on: they cost nothing to users (loaded only when
     * devtools is open) and make a production stack trace readable. */
    sourcemap: true,
  },
  server: {
    /*
     * /api is proxied to the local backend so the browser treats it as
     * same-origin in development. That keeps the dev setup free of CORS
     * preflights and matches the recommended production layout, where the API
     * sits behind the same domain as the site.
     *
     * Point it elsewhere with VITE_API_TARGET to develop against staging.
     */
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
})
