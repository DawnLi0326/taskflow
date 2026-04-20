import { defineStore } from 'pinia'

// 定义主题 store
export const useThemeStore = defineStore('theme', {
  state: () => ({
    // 默认使用浅色主题
    isDark: false
  }),
  
  actions: {
    // 切换主题
    toggleTheme() {
      this.isDark = !this.isDark
      this.applyTheme()
    },
    
    // 应用主题
    applyTheme() {
      if (this.isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      // 保存主题偏好到本地存储
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
    },
    
    // 初始化主题
    initTheme() {
      // 从本地存储读取主题偏好
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.isDark = savedTheme === 'dark'
      } else {
        // 检测系统偏好
        this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      this.applyTheme()
    }
  }
})
