// src/stores/task.js
// ========== 1. 引入依赖 ==========
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '../constants'

// ========== 2. 常量配置 ==========
const STORAGE_KEY = STORAGE_KEYS.TASKS
const API_PROXY_URL = '/api/sync'

// ========== 3. 工具函数 ==========

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

// 防抖函数
function debounce(fn, delay = 500) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// ========== 4. 本地存储操作函数 ==========

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

// ========== 5. Pinia Store 定义 ==========
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref([])
  const isSyncing = ref(false)
  const lastSyncTime = ref(null)

  function persist() {
    saveToLocalStorage(STORAGE_KEY, tasks.value)
  }

  // ========== 云端同步方法 ==========

  async function fetchFromCloud() {
    if (isSyncing.value) return

    try {
      isSyncing.value = true
      const startTime = Date.now()
      const res = await fetch(API_PROXY_URL, {
        method: 'GET',
        cache: 'no-cache',
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const cloudTasks = data.tasks || (Array.isArray(data) ? data : [])

      if (Array.isArray(cloudTasks) && cloudTasks.length > 0) {
        const updatedTasks = cloudTasks.map(task => ({
          notes: '',
          order: 0,
          ...task,
          completed: !!task.completed,
        }))

        // 只在云端数据更新时才同步
        const hasChanges = JSON.stringify(updatedTasks) !== JSON.stringify(tasks.value)
        if (hasChanges) {
          tasks.value = updatedTasks
          persist()
          console.log('✅ 云端数据已同步到本地')
        }
      }

      lastSyncTime.value = Date.now()
      console.log(`⏱️ 云端同步耗时: ${Date.now() - startTime}ms`)
    } catch (error) {
      console.error('❌ 从云端拉取数据失败:', error)
    } finally {
      isSyncing.value = false
    }
  }

  // 带防抖的云端保存函数
  const debouncedSaveToCloud = debounce(async function () {
    if (isSyncing.value) return

    try {
      isSyncing.value = true
      const startTime = Date.now()
      const res = await fetch(API_PROXY_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: tasks.value }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      lastSyncTime.value = Date.now()
      console.log(`✅ 数据已同步到云端 (耗时: ${Date.now() - startTime}ms)`)
    } catch (error) {
      console.error('❌ 同步到云端失败:', error)
    } finally {
      isSyncing.value = false
    }
  }, 1000)

  function saveToCloud() {
    debouncedSaveToCloud()
  }

  async function initTasks() {
    // 先快速加载本地数据，让界面立即显示
    const localTasks = loadFromLocalStorage(STORAGE_KEY)
    if (localTasks.length > 0) {
      tasks.value = localTasks
      console.log('ℹ️ 已加载本地存储数据')
    }

    // 然后后台异步同步云端数据
    setTimeout(() => {
      fetchFromCloud()
    }, 300)
  }

  // ========== 5.1 计算属性 ==========

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

  // ========== 5.2 操作方法 ==========

  function addTask(task) {
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
    tasks.value = tasks.value.filter(t => t.id !== id)
    persist()
    saveToCloud()
  }

  function deleteTasks(ids) {
    tasks.value = tasks.value.filter(t => !ids.includes(t.id))
    persist()
    saveToCloud()
  }

  function clearCompleted() {
    tasks.value = tasks.value.filter(t => !t.completed)
    persist()
    saveToCloud()
  }

  function clearAll() {
    tasks.value = []
    persist()
    saveToCloud()
  }

  function reorderTasks(newOrder) {
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
    if (!Array.isArray(imported)) return
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

  // ========== 5.3 对外暴露 ==========
  return {
    tasks,
    isSyncing,
    lastSyncTime,
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
    saveToCloud,
    initTasks,
  }
})