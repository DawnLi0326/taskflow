import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://taskflow-eight-gilt.vercel.app',
        changeOrigin: true,
        secure: false,
        ws: false,
        family: 4,  // 强制使用 IPv4，避免 IPv6 连接问题
        proxyTimeout: 10000,
        timeout: 10000,
        onProxyReq: (proxyReq, req, res) => {
          console.log('[Proxy] 请求:', req.method, req.url)
        },
        onError: (err, req, res) => {
          console.error('[Proxy] 连接错误:', err.code)
          // 返回一个友好的错误响应，让前端知道云端不可用
          res.writeHead(503, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: '云端同步暂时不可用，将使用本地数据' }))
        }
      }
    }
  }
})