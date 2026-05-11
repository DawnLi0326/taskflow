import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // 使用 autoUpdate 策略，自动更新 Service Worker
      registerType: 'autoUpdate',

      // 开发模式下启用 PWA
      devOptions: {
        enabled: true,
      },

      // Workbox 配置：缓存策略
      workbox: {
        // 缓存所有构建产物
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2,png,jpg,jpeg,json}'],

        // 运行时缓存策略
        runtimeCaching: [
          {
            // 缓存 API 请求（云端同步接口）
            urlPattern: /^https?:\/\/.*\/api\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24小时
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // 缓存外部资源（如图标字体）
            urlPattern: /^https?:\/\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'external-resources',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7天
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],

        // 跳过等待，立即激活新的 Service Worker
        skipWaiting: true,
        clientsClaim: true,
      },

      // Manifest 配置
      manifest: {
        // 应用名称
        name: '任务中心 - TaskFlow',
        // 短名称（用于桌面图标）
        short_name: '任务中心',
        // 应用描述
        description: '高效的任务管理应用，支持离线使用',
        // 主题色
        theme_color: '#2563eb',
        // 背景色
        background_color: '#ffffff',
        // 显示模式
        display: 'standalone',
        // 起始路径
        start_url: '/',
        // 图标配置（使用现有的 svg 图标）
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],

  // 构建配置
  build: {
    // 输出目录
    outDir: 'dist',
    // 生成 source map
    sourcemap: true,
  },

  // 开发服务器配置
  server: {
    port: 5173,
    open: true,
  },
})
