// ========== 1. 引入依赖 ==========
import { defineStore } from 'pinia'  // 从 pinia 库引入 defineStore，用于创建设置状态管理仓库
import { ref } from 'vue'  // 从 vue 引入 ref，用于创建响应式数据
import { STORAGE_KEYS } from '../constants'  // 引入常量管理文件

// ========== 2. 常量配置 ==========
const SETTINGS_KEY = STORAGE_KEYS.SETTINGS  // 定义 localStorage 中存储设置数据的键名

// ========== 3. 加载设置函数 ==========
// 从本地存储加载设置
// 返回：如果有保存的设置则返回设置对象，否则返回默认设置
function loadSettings() {
  try {
    // localStorage.getItem(key)：根据键名读取数据，返回字符串或 null
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {  // 如果读取到了数据
      // JSON.parse：把 JSON 字符串解析成 JavaScript 对象
      return JSON.parse(raw)
    }
  } catch {
    // 如果读取失败，忽略错误，使用默认设置
  }
  // 默认设置：darkMode 默认为 false（浅色模式），sortOrder 默认为 'dueDate'（按截止日期排序）
  return { darkMode: false, sortOrder: 'dueDate' }
}

// ========== 4. Pinia Store 定义 ==========
export const useSettingsStore = defineStore('settings', () => {
  // 从本地存储加载设置
  const saved = loadSettings()

  // 创建响应式数据
  // darkMode：深色模式开关，true 为深色模式，false 为浅色模式
  const darkMode = ref(saved.darkMode)
  // sortOrder：任务排序方式，'dueDate' 按截止日期，'priority' 按优先级，'custom' 自定义排序
  const sortOrder = ref(saved.sortOrder)

  // ========== 4.1 持久化函数 ==========
  // 保存设置到本地存储
  // 每次修改设置后都需要调用此函数来保存数据
  function persist() {
    // localStorage.setItem(key, value)：存储数据，key 是键名，value 是值（必须是字符串）
    // JSON.stringify：把 JavaScript 对象转换成 JSON 字符串
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      darkMode: darkMode.value,  // darkMode 的值
      sortOrder: sortOrder.value,  // sortOrder 的值
    }))
  }

  // ========== 4.2 主题相关方法 ==========

  // 应用主题（根据 darkMode 的值切换深色/浅色模式）
  // 通过给 HTML 根元素添加或移除 'dark' 类来实现主题切换
  function applyTheme() {
    if (darkMode.value) {  // 如果是深色模式
      // document.documentElement：获取 HTML 根元素（<html>）
      // classList.add('dark')：给根元素添加 'dark' 类
      document.documentElement.classList.add('dark')
    } else {  // 如果是浅色模式
      // classList.remove('dark')：移除根元素的 'dark' 类
      document.documentElement.classList.remove('dark')
    }
  }

  // 切换深色/浅色模式
  // 直接取反：true 变 false，false 变 true
  function toggleDarkMode() {
    darkMode.value = !darkMode.value  // 取反操作
    applyTheme()  // 应用新的主题
    persist()  // 保存设置到本地存储
  }

  // ========== 4.3 排序相关方法 ==========

  // 设置任务排序方式
  // 参数 order：排序方式字符串，'dueDate' | 'priority' | 'custom'
  function setSortOrder(order) {
    sortOrder.value = order  // 更新排序方式
    persist()  // 保存设置到本地存储
  }

  // ========== 4.4 对外暴露 ==========
  // return 语句导出 store 的所有数据和方法，供其他组件使用
  return {
    darkMode,      // 深色模式开关
    sortOrder,     // 任务排序方式
    applyTheme,    // 应用主题
    toggleDarkMode,  // 切换深色/浅色模式
    setSortOrder,  // 设置排序方式
  }
})
