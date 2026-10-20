import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /api to Express so the refresh cookie stays same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 127.0.0.1 and ::1 (and LAN), not just one of them
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: false },
    },
  },
});
