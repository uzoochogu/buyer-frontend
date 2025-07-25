import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  name: 'buyer-app',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,      // vite app port
  },
  preview: {
    host: '0.0.0.0', // allows external connections
    port: 4173,      // preview vite app port
    cors: true,      // Enable CORS for all origins
    allowedHosts: [
      '.ngrok-free.app',
    ],
    proxy: {
      // Proxy API requests to the backend
      '/api/v1/': {
        target: "http://localhost:5555",
        changeOrigin: true,
        secure: false,
      },
      // Media files requests to media server
      '/media/': {
        target: "http://localhost:9000",
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket requests to the backend
      // ws://localhost:5555/ws/notifications
      '/ws/notifications': {
        target: 'ws://localhost:5555',
        ws: true,
        rewriteWsOrigin: true,
      },
    }
  },
})
