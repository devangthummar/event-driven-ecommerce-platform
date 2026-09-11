import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    proxy: {
      // Proxy /api/products to the Product Service
      '/api/products': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // Proxy /api/users to the User Service
      '/api/users': {
        target: 'http://localhost:8006',
        changeOrigin: true,
      },
      // Proxy /api/auth to the User Service
      '/api/auth': {
        target: 'http://localhost:8006',
        changeOrigin: true,
      },
      // Proxy /api/v1/orders to the Order Service
      '/api/v1/orders': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
})