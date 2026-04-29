// src/stores/task.js
// ========== 1. 引入依赖 ==========
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '../constants'

// ========== 2. 常量配置 ==========
const STORAGE_KEY = STORAGE_KEYS.TASKS

// ========== 3. 云端同步配置 ==========
// 使用 Vercel Serverless Function 代理，避免 API Key 暴露在前端
// 前端和 API 在同一域名下，始终使用相对路径
const API_PROXY_URL = '/api/sync'

// 防抖计时器（避免短时间内多次同步）
let syncDebounceTimer = null

// ========== 4. 工具函数 ==========

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function normalizeTask(task) {
  return {
    notes: '',
    order: 0,
    ...task,
    completed: !!task.completed,
  }
}

function isIncomplete(task) {
  return !task.completed
}

function isOverdue(task, today) {
  return !task.completed && task.dueDate && task.dueDate < today
}

// ========== 5. 本地存储操作函数 ==========

function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error('保存到 localStorage 失败:', err)
  }
}

function loadFromLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map(task => normalizeTask(task))
      }
    }
  } catch (err) {
    console.error('从 localStorage 读取失败:', err)
  }
  return []
}

// ========== 6. Pinia Store 定义 ==========
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref(loadFromLocalStorage(STORAGE_KEY))

  function persist() {
    saveToLocalStorage(STORAGE_KEY, tasks.value)
  }

  // ========== 6.2 云端同步功能 ==========

  /**
   * 从云端拉取数据（通过代理）
   * 使用 GET /api/sync 请求
   */
  async function fetchFromCloud() {
    if (import.meta.env.DEV) return;
    try {
      console.info('🔄 正在从云端拉取数据...')

      const response = await fetch(API_PROXY_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      console.debug('📡 响应状态:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: 未知错误`)
      }

      const cloudTasks = await response.json()

      if (Array.isArray(cloudTasks) && cloudTasks.length > 0) {
        tasks.value = cloudTasks.map(normalizeTask)
        persist()
        console.info('✅ 成功从云端同步数据，共', cloudTasks.length, '条任务')
      } else {
        console.info('ℹ️ 云端数据为空，保持本地数据不变')
      }
    } catch (err) {
      console.error('❌ 从云端拉取数据失败:', err.message)
      console.warn('⚠️ 将继续使用本地数据')
    }
  }

  /**
   * 将数据同步到云端（通过代理，防抖处理）
   * 使用 PUT /api/sync 请求
   */
  function syncToCloud() {
    console.info('📤 syncToCloud 被调用')

    if (import.meta.env.DEV) {
      console.info('ℹ️ 开发环境跳过云端同步');
      return;
    }

    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer)
    }

    syncDebounceTimer = setTimeout(async () => {
      try {
        console.info('🔄 正在同步数据到云端...')
        console.debug('📋 同步数据数量:', tasks.value.length)
        console.debug('📋 同步数据:', JSON.stringify(tasks.value).substring(0, 300))

        const response = await fetch(API_PROXY_URL, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ tasks: tasks.value })
        })

        console.debug('📡 同步响应状态:', response.status)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: 未知错误`)
        }

        const result = await response.json()
        console.debug('📦 同步结果:', result)
        console.info('✅ 成功同步数据到云端')
      } catch (err) {
        console.error('❌ 同步数据到云端失败:', err.message)
        console.error('❌ 错误详情:', err)
      } finally {
        syncDebounceTimer = null
      }
    }, 1000)
  }

  // 为了兼容性，提供 saveToCloud 作为 syncToCloud 的别名
  function saveToCloud() {
    console.info('📤 saveToCloud 被调用，将委托给 syncToCloud')
    syncToCloud()
  }

  // ========== 6.3 初始化云端拉取 ==========
  // 异步拉取云端数据，不阻塞页面渲染
  setTimeout(() => {
    fetchFromCloud()
  }, 500)

  // ========== 6.4 计算属性 ==========

  const today = computed(() => getTodayStr())

  const totalCount = computed(() => tasks.value.length)
  const completedCount = computed(() => tasks.value.filter(t => t.completed).length)
  const incompleteCount = computed(() => tasks.value.filter(isIncomplete).length)

  const todayDueTasks = computed(() =>
    tasks.value.filter(t => isIncomplete(t) && t.dueDate === today.value)
  )
  const todayDueCount = computed(() => todayDueTasks.value.length)

  const overdueTasks = computed(() =>
    tasks.value
      .filter(t => isOverdue(t, today.value))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  )

  const recentIncompleteTasks = computed(() =>
    tasks.value
      .filter(isIncomplete)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 5)
  )

  const upcomingTasks = computed(() => {
    const futureCutoff = new Date()
    futureCutoff.setDate(futureCutoff.getDate() + 3)
    const cutoffStr = futureCutoff.toISOString().split('T')[0]
    return tasks.value
      .filter(t => isIncomplete(t) && t.dueDate > today.value && t.dueDate <= cutoffStr)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
  })

  const incompletePriorityDistribution = computed(() => {
    const incomplete = tasks.value.filter(isIncomplete)
    const total = incomplete.length
    if (total === 0) return { high: 0, medium: 0, low: 0 }
    return {
      high: incomplete.filter(t => t.priority === 'high').length,
      medium: incomplete.filter(t => t.priority === 'medium').length,
      low: incomplete.filter(t => t.priority === 'low').length,
    }
  })

  const todayProgress = computed(() => {
    const todays = todayDueTasks.value
    if (todays.length === 0) return 0
    const done = todays.filter(t => t.completed).length
    return Math.round((done / todays.length) * 100)
  })

  // ========== 6.5 操作方法 ==========

  function addTask(task) {
    console.info('📝 addTask 被调用')
    const newTask = {
      ...normalizeTask(task),
      id: Date.now().toString(),
      order: tasks.value.length,
    }
    tasks.value.push(newTask)
    persist()
    saveToCloud()
  }

  function updateTask(id, updates) {
    console.info('📝 updateTask 被调用')
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx === -1) return

    const oldTask = tasks.value[idx]
    const wasCompleted = oldTask.completed
    const newTask = { ...oldTask, ...updates }

    if (!wasCompleted && newTask.completed) {
      newTask.completedAt = new Date().toISOString()
    } else if (wasCompleted && !newTask.completed) {
      delete newTask.completedAt
    }

    tasks.value[idx] = newTask
    persist()
    saveToCloud()
  }

  function deleteTask(id) {
    console.info('📝 deleteTask 被调用')
    tasks.value = tasks.value.filter(t => t.id !== id)
    persist()
    saveToCloud()
  }

  function deleteTasks(ids) {
    console.info('📝 deleteTasks 被调用')
    tasks.value = tasks.value.filter(t => !ids.includes(t.id))
    persist()
    saveToCloud()
  }

  function clearCompleted() {
    console.info('📝 clearCompleted 被调用')
    tasks.value = tasks.value.filter(t => !t.completed)
    persist()
    saveToCloud()
  }

  function clearAll() {
    console.info('📝 clearAll 被调用')
    tasks.value = []
    persist()
    saveToCloud()
  }

  function reorderTasks(newOrder) {
    console.info('📝 reorderTasks 被调用')
    const orderMap = new Map()
    newOrder.forEach((task, idx) => {
      orderMap.set(task.id, idx)
    })

    for (const task of tasks.value) {
      if (orderMap.has(task.id)) {
        task.order = orderMap.get(task.id)
      }
    }

    const uncompletedOrdered = newOrder
    const completedTasks = tasks.value.filter(t => t.completed)
    tasks.value = [...uncompletedOrdered, ...completedTasks]
    persist()
    saveToCloud()
  }

  function importTasks(imported, mode = 'replace') {
    console.info('📝 importTasks 被调用，模式:', mode)
    if (!Array.isArray(imported)) {
      console.warn('⚠️ importTasks 收到的不是数组:', typeof imported)
      return
    }
    const normalized = imported.map(normalizeTask)
    if (mode === 'replace') {
      tasks.value = normalized
    } else {
      const existingIds = new Set(tasks.value.map(t => t.id))
      const newTasks = normalized.filter(t => !existingIds.has(t.id))
      tasks.value.push(...newTasks)
    }
    persist()
    saveToCloud()
  }

  function getTasksForStats() {
    return tasks.value
  }

  // ========== 6.6 对外暴露 ==========
  return {
    tasks,
    today,
    totalCount,
    completedCount,
    incompleteCount,
    todayDueTasks,
    todayDueCount,
    overdueTasks,
    recentIncompleteTasks,
    upcomingTasks,
    incompletePriorityDistribution,
    todayProgress,
    addTask,
    updateTask,
    deleteTask,
    deleteTasks,
    clearCompleted,
    clearAll,
    reorderTasks,
    importTasks,
    getTasksForStats,
    fetchFromCloud,
    syncToCloud,
    saveToCloud
  }
})