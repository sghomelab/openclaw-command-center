import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5713,
    host: '0.0.0.0',
    allowedHosts: ['athena-mc.masrudyn.com', '192.168.1.15'],
    strictPort: true,
    cors: true,
    proxy: {
      '/v3': {
        target: 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
  // For production-like access from external hosts
  base: '/',
})
