import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/* ==========================================================================
   Dev server proxies
   --------------------------------------------------------------------------
   The app always calls same-origin `/api/*` paths. In production the Nginx
   reverse proxy inside the frontend image routes them to the right service;
   during `npm run dev` these entries do the same job so the client code needs
   no knowledge of which host a service lives on.

   Each target mirrors docker-compose's published port for that service.
   ========================================================================== */

const proxyTargets = {
  '/api/products': 'http://localhost:8081',
  '/api/users': 'http://localhost:8006',
  '/api/auth': 'http://localhost:8006',
  '/api/v1/orders': 'http://localhost:8082',
  '/api/inventory': 'http://localhost:8084',
  '/api/wallets': 'http://localhost:8085',
  '/api/payments': 'http://localhost:8085',
  // Service-scoped aliases for the shared /api/admin/outbox path (see nginx.conf).
  '/api/admin/order': 'http://localhost:8082',
  '/api/admin/payment': 'http://localhost:8085',
  '/api/admin/inventory': 'http://localhost:8084',
  // Health Actuator endpoints
  '/api/health/user': { target: 'http://localhost:8006', rewrite: (path) => path.replace('/api/health/user', '/actuator/health') },
  '/api/health/product': { target: 'http://localhost:8081', rewrite: (path) => path.replace('/api/health/product', '/actuator/health') },
  '/api/health/order': { target: 'http://localhost:8082', rewrite: (path) => path.replace('/api/health/order', '/actuator/health') },
  '/api/health/inventory': { target: 'http://localhost:8084', rewrite: (path) => path.replace('/api/health/inventory', '/actuator/health') },
  '/api/health/payment': { target: 'http://localhost:8085', rewrite: (path) => path.replace('/api/health/payment', '/actuator/health') },
  '/api/health/notification': { target: 'http://localhost:8086', rewrite: (path) => path.replace('/api/health/notification', '/actuator/health') },
}

const devProxy = Object.fromEntries(
  Object.entries(proxyTargets).map(([path, target]) => {
    const config = typeof target === 'string' ? { target } : target
    return [
      path,
      { ...config, changeOrigin: true, ws: false },
    ]
  }),
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    proxy: devProxy,
  },
})
