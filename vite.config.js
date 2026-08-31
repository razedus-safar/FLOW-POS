import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-confetti': ['canvas-confetti'],
          'vendor-qrcode': ['html5-qrcode'],
          'vendor-barcode': ['jsbarcode']
        }
      }
    }
  }
});
