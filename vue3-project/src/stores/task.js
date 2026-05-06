/**
 * 任务状态管理 Store
 * 负责任务的增删改查、排序、导入导出等操作
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '../constants'

// ========== 常量配置 ==========
const STORAGE_KEY = STORAGE_KEYS.TASKS
const API_PROXY_URL = '/api/sync'

// ========== 工具函数 ==========

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay = 500) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

/**
 * 标准化任务数据
 * @param {Object} task - 任务对象
 * @returns {Object} 标准化后的任务对象
 */
function normalizeTask(task) {
  return {
    notes: '',
    order: 0,
    ...task,
    completed: !!task.completed,
  }
}

/**
 * 保存数据到 localStorage
 * @param {string} key - 存储键名
 * @param {any} data - 要存储的数据
 */
function saveToLocalStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error('保存到 localStorage 失败:', err)
  }
}

/**
 * 从 localStorage 读取数据
 * @param {string} key - 存储键名
 * @returns {Array} 任务数组
 */
function loadFromLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeTask)
      }
    }
  } catch (err) {
    console.error('从 localStorage 读取失败:', err)
  }
  return []
}

// ========== Pinia Store 定义 ==========
export const useTaskStore = defineStore('tasks', () => {
  /**
   * 任务列表
   * @type {import('vue').Ref<Array<Object>>}
   */
  const tasks = ref([])

  /**
   * 是否正在同步中
   * @type {import('vue').Ref<boolean>}
   */
  const isSyncing = ref(false)

  /**
   * 最后同步时间
   * @type {import('vue').Ref<number | null>}
   */
  const lastSyncTime = ref(null)

  /**
   * 持久化数据到本地存储
   */
  function persist() {
    saveToLocalStorage(STORAGE_KEY, tasks.value)
  }

  // ========== 云端同步方法 ==========

  /**
   * 从云端拉取数据（返回标准化后的任务数组）
   * @returns {Array<Object>} 云端任务数组（标准化后）
   */
  async function fetchFromCloud() {
    if (isSyncing.value) return []

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

      // 标准化云端任务数据
      const normalizedTasks = cloudTasks.map(task => ({
        notes: '',
        order: 0,
        ...task,
        completed: !!task.completed,
      }))

      lastSyncTime.value = Date.now()
      console.log(`⏱️ 云端同步耗时: ${Date.now() - startTime}ms`)
      return normalizedTasks
    } catch (error) {
      console.warn('⚠️ 从云端拉取数据失败，将继续使用本地数据:', error.message)
      return []
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

  /**
   * 保存到云端
   */
  function saveToCloud() {
    debouncedSaveToCloud()
  }

  /**
   * 初始化任务数据
   * 策略：优先加载本地数据，然后与云端数据合并（以本地为主，补充云端缺失）
   */
  async function initTasks() {
    // 1. 优先加载本地存储数据，保证离线添加的任务立即显示
    const localTasks = loadFromLocalStorage(STORAGE_KEY)
    if (localTasks.length > 0) {
      tasks.value = localTasks
      console.log('ℹ️ 已加载本地存储数据')
    }

    // 2. 后台异步拉取云端数据并合并
    setTimeout(async () => {
      try {
        // 3. 获取云端任务数据
        const cloudTasks = await fetchFromCloud()

        if (cloudTasks.length === 0) {
          // 如果云端没有数据或获取失败，直接返回，保持本地数据不变
          return
        }

        // 4. 合并数据（以本地为主，补充云端缺失）
        // 建立本地任务的 Map（以 id 为键）
        const localTaskMap = new Map()
        tasks.value.forEach(task => {
          localTaskMap.set(task.id, task)
        })

        // 遍历云端任务，只添加本地不存在的任务
        let addedFromCloud = 0
        for (const cloudTask of cloudTasks) {
          if (!localTaskMap.has(cloudTask.id)) {
            tasks.value.push(cloudTask)
            addedFromCloud++
          }
          // 如果 id 已存在，保留本地任务（不覆盖）
        }

        if (addedFromCloud > 0) {
          // 5. 保存合并后的数据到本地
          persist()
          console.log(`✅ 已从云端补充 ${addedFromCloud} 个新任务`)

          // 6. 将合并后的完整数据推送到云端（保持云端与本地一致）
          saveToCloud()
        } else {
          console.log('ℹ️ 本地数据已是最新，无需合并')
        }
      } catch (error) {
        // 云端同步失败不影响页面正常展示
        console.warn('⚠️ 云端同步失败，将继续使用本地数据:', error.message)
      }
    }, 300)
  }

  // ========== 计算属性 ==========

  /**
   * 今天的日期字符串
   * @type {import('vue').ComputedRef<string>}
   */
  const today = computed(() => getTodayStr())

  /**
   * 总任务数
   * @type {import('vue').ComputedRef<number>}
   */
  const totalCount = computed(() => tasks.value.length)

  /**
   * 已完成任务数
   * @type {import('vue').ComputedRef<number>}
   */
  const completedCount = computed(() => tasks.value.filter(t => t.completed).length)

  /**
   * 未完成任务数
   * @type {import('vue').ComputedRef<number>}
   */
  const incompleteCount = computed(() => tasks.value.filter(t => !t.completed).length)

  /**
   * 今日到期的任务列表
   * @type {import('vue').ComputedRef<Array<Object>>}
   */
  const todayDueTasks = computed(() =>
    tasks.value.filter(t => t.dueDate === today.value)
  )

  /**
   * 今日到期任务数
   * @type {import('vue').ComputedRef<number>}
   */
  const todayDueCount = computed(() => todayDueTasks.value.length)

  /**
   * 逾期任务列表（按到期日期排序）
   * @type {import('vue').ComputedRef<Array<Object>>}
   */
  const overdueTasks = computed(() =>
    tasks.value
      .filter(t => !t.completed && t.dueDate && t.dueDate < today.value)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  )

  /**
   * 最近未完成的任务（最多5个）
   * @type {import('vue').ComputedRef<Array<Object>>}
   */
  const recentIncompleteTasks = computed(() =>
    tasks.value
      .filter(t => !t.completed)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 5)
  )

  /**
   * 即将到来的任务（未来3天，最多5个）
   * @type {import('vue').ComputedRef<Array<Object>>}
   */
  const upcomingTasks = computed(() => {
    const futureCutoff = new Date()
    futureCutoff.setDate(futureCutoff.getDate() + 3)
    const cutoffStr = futureCutoff.toISOString().split('T')[0]
    return tasks.value
      .filter(t => !t.completed && t.dueDate > today.value && t.dueDate <= cutoffStr)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5)
  })

  /**
   * 未完成任务的优先级分布
   * @type {import('vue').ComputedRef<Object>}
   */
  const incompletePriorityDistribution = computed(() => {
    const incomplete = tasks.value.filter(t => !t.completed)
    const total = incomplete.length
    if (total === 0) return { high: 0, medium: 0, low: 0 }
    return {
      high: incomplete.filter(t => t.priority === 'high').length,
      medium: incomplete.filter(t => t.priority === 'medium').length,
      low: incomplete.filter(t => t.priority === 'low').length,
    }
  })

  /**
   * 今日任务完成率（百分比）
   * @type {import('vue').ComputedRef<number>}
   */
  const todayProgress = computed(() => {
    const todays = todayDueTasks.value
    if (todays.length === 0) return 0
    const done = todays.filter(t => t.completed).length
    return Math.round((done / todays.length) * 100)
  })

  // ========== 操作方法 ==========

  /**
   * 添加新任务
   * @param {Object} task - 任务对象
   */
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

  /**
   * 更新任务
   * @param {string} id - 任务ID
   * @param {Object} updates - 更新的字段
   */
  function updateTask(id, updates) {
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx === -1) return

    const oldTask = tasks.value[idx]
    const wasCompleted = oldTask.completed
    const newTask = { ...oldTask, ...updates }

    // 处理完成状态变更
    if (!wasCompleted && newTask.completed) {
      newTask.completedAt = new Date().toISOString()
    } else if (wasCompleted && !newTask.completed) {
      delete newTask.completedAt
    }

    tasks.value[idx] = newTask
    persist()
    saveToCloud()
  }

  /**
   * 删除单个任务
   * @param {string} id - 任务ID
   */
  function deleteTask(id) {
    tasks.value = tasks.value.filter(t => t.id !== id)
    persist()
    saveToCloud()
  }

  /**
   * 批量删除任务
   * @param {Array<string>} ids - 任务ID数组
   */
  function deleteTasks(ids) {
    tasks.value = tasks.value.filter(t => !ids.includes(t.id))
    persist()
    saveToCloud()
  }

  /**
   * 清除所有已完成的任务
   */
  function clearCompleted() {
    tasks.value = tasks.value.filter(t => !t.completed)
    persist()
    saveToCloud()
  }

  /**
   * 清除所有任务
   */
  function clearAll() {
    tasks.value = []
    persist()
    saveToCloud()
  }

  /**
   * 重新排序任务
   * @param {Array<Object>} newOrder - 新的任务顺序
   */
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

  /**
   * 导入任务
   * @param {Array<Object>} imported - 要导入的任务数组
   * @param {string} mode - 导入模式：'replace'（替换）或 'merge'（合并）
   */
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

  /**
   * 获取所有任务（用于统计）
   * @returns {Array<Object>} 任务数组
   */
  function getTasksForStats() {
    return tasks.value
  }

  // ========== 对外暴露 ==========
  return {
    // State
    tasks,
    isSyncing,
    lastSyncTime,

    // Computed
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

    // Actions
    addTask,
    updateTask,
    deleteTask,
    deleteTasks,
    clearCompleted,
    clearAll,
    reorderTasks,
    importTasks,
    getTasksForStats,
    initTasks,
    fetchFromCloud,
    saveToCloud,
  }
})
