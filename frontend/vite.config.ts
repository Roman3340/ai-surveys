import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ai-surveys/', // Название вашего GitHub репозитория
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: true, // Используем встроенный минификатор
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          telegram: ['@twa-dev/sdk'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
  define: {
    // Для Telegram Mini App
    global: 'globalThis',
  },
})
