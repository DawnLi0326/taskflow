import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://taskflow-eight-gilt.vercel.app',
        changeOrigin: true,
        secure: true
      }
    }
  }
})