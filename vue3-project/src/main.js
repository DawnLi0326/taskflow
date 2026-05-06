import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router/index'
import './style.css'
import App from './App.vue'
import { useTaskStore } from './stores/task'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')

// ========== PWA 离线缓存功能 ==========

/**
 * 监听在线/离线状态
 */
function updateOnlineStatus() {
  if (navigator.onLine) {
    ElMessage.success('网络已恢复，正在同步数据...')
    // 网络恢复时自动从云端同步数据
    setTimeout(() => {
      try {
        const taskStore = useTaskStore()
        taskStore.syncFromCloud()
      } catch (error) {
        console.error('自动同步失败:', error)
      }
    }, 500)
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

// 监听 PWA 安装提示（用于后续添加安装按钮）
let deferredPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e
})
