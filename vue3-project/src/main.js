import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router/index'
import './style.css'
import App from './App.vue'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')

// ========== PWA 离线缓存提示功能 ==========

/**
 * 监听 PWA 更新
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    ElMessageBox.confirm(
      '检测到应用有更新，是否立即刷新以获取最新版本？',
      '应用更新',
      {
        confirmButtonText: '刷新',
        cancelButtonText: '稍后',
        type: 'info',
      }
    ).then(() => {
      window.location.reload()
    }).catch(() => {
      ElMessage.info('将在下次访问时自动更新')
    })
  })
}

/**
 * 监听在线/离线状态
 */
function updateOnlineStatus() {
  if (navigator.onLine) {
    ElMessage.success('网络已恢复，数据将自动同步')
  } else {
    ElMessage.warning('当前处于离线模式，数据将保存到本地，联网后自动同步')
  }
}

// 监听网络状态变化
window.addEventListener('online', updateOnlineStatus)
window.addEventListener('offline', updateOnlineStatus)

// 页面加载时检测网络状态
if (!navigator.onLine) {
  setTimeout(() => {
    ElMessage.info('当前处于离线模式，任务数据已自动保存到本地')
  }, 1000)
}

// 监听 PWA 安装提示
let deferredPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
})
