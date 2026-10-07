import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    /*
     * The API is proxied in development so the browser treats it as same-origin.
     * That keeps the refresh cookie working without loosening SameSite, and it
     * means the dev setup exercises the same cookie behaviour as production
     * behind one domain.
     */
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
});
