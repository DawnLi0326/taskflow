import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://taskflow-eight-gilt.vercel.app',
        changeOrigin: true,
        family: 4,        // 强制 IPv4
        // 可选：增加超时时间
        proxyTimeout: 60000,
        timeout: 60000
      }
    }
  }
})