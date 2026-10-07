import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
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
