import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api_davis.php': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => `/CALIDAD/BACKEND${path}`,
      },
    },
  },
})
