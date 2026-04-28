// src/stores/task.js
// ========== 1. 引入依赖 ==========
import { defineStore } from 'pinia'  // 从 pinia 库引入 defineStore，用于创建状态管理仓库
import { ref, computed } from 'vue'  // 从 vue 引入响应式 API：ref 创建响应式数据，computed 创建计算属性
import { STORAGE_KEYS } from '../constants'  // 引入常量管理文件

// ========== 2. 常量配置 ==========
const STORAGE_KEY = STORAGE_KEYS.TASKS  // 定义 localStorage 中存储任务数据的键名，方便后续使用和修改

// ========== 3. 工具函数（纯函数，便于测试和维护） ==========

// 获取当前日期 YYYY-MM-DD 格式
// 例如：2026-04-25
function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

// 为任务补充默认字段，确保每个任务都有必要的属性
// normalizeTask 函数用于规范化任务对象，给任务添加默认值
function normalizeTask(task) {
  return {
    notes: '',  // 默认 notes 为空字符串
    order: 0,   // 默认排序为 0
    ...task,    // 展开操作符，保留任务原有的所有属性
    // !! 是双重取反操作符，把任意值转换成布尔值
    // 作用：保证 completed 字段一定是布尔值（true 或 false）
    // 避免 undefined、null、数字 0 等"假值"导致逻辑错误
    completed: !!task.completed,
  }
}

// 判断任务是否未完成
// 返回 true = 任务未完成
// 返回 false = 任务已完成
function isIncomplete(task) {
  return !task.completed  // 取反操作：completed 为 false 时返回 true
}

// 判断任务是否逾期（未完成且截止日期 < 今天）
// 三个条件都必须满足：1. 未完成 2. 有截止日期 3. 截止日期已过
// JavaScript 的 && 运算符有短路特性：如果前面是 false，后面就不会执行
// 这样可以避免错误，比如 task.dueDate < today 在 task.dueDate 为 undefined 时可能会出错
function isOverdue(task, today) {
  return !task.completed && task.dueDate && task.dueDate < today
}

// ========== 4. 本地存储操作函数 ==========

// 保存到本地存储（带错误处理）
// key: 存储的键名
// data: 要存储的数据（会自动转成 JSON 字符串）
function saveToLocalStorage(key, data) {
  try {
    // localStorage.setItem(key, value)：存储数据，key 是键名，value 是值（必须是字符串）
    // JSON.stringify(data)：把 JavaScript 对象转换成 JSON 字符串
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error('保存到 localStorage 失败:', err)  // 如果保存失败，打印错误信息
  }
}

// 从本地存储加载（带错误处理和降级）
// key: 要读取的键名
// 返回：如果有数据则返回解析后的数组，否则返回空数组
function loadFromLocalStorage(key) {
  try {
    // localStorage.getItem(key)：根据键名读取数据，返回字符串或 null
    const raw = localStorage.getItem(key)
    if (raw) {  // 如果读取到了数据（非空字符串）
      const parsed = JSON.parse(raw)  // JSON.parse：把 JSON 字符串解析成 JavaScript 对象
      if (Array.isArray(parsed)) {  // Array.isArray：检查是否是数组
        // map：遍历数组，对每个元素执行 normalizeTask 处理
        return parsed.map(task => normalizeTask(task))
      }
    }
  } catch (err) {
    console.error('从 localStorage 读取失败:', err)  // 如果读取失败，打印错误信息
  }
  return []  // 如果读取失败或没有数据，返回空数组
}

// ========== 5. Pinia Store 定义 ==========
export const useTaskStore = defineStore('tasks', () => {
  // 状态：初始化任务列表，从本地存储中加载数据
  // ref：创建响应式数据，tasks 是一个响应式的任务数组
  const tasks = ref(loadFromLocalStorage(STORAGE_KEY))

  // ========== 5.1 持久化函数 ==========
  // 内部持久化函数，把任务列表保存到本地存储中
  // 每次修改 tasks 后都需要调用此函数来保存数据
  function persist() {
    // 调用 saveToLocalStorage 函数，把任务数据存到 localStorage
    // 第一个参数 STORAGE_KEY：存储的键名，告诉"放到哪个格子"
    // 第二个参数 tasks.value：任务数据，告诉"要放什么东西"
    saveToLocalStorage(STORAGE_KEY, tasks.value)
  }

  // ========== 5.2 计算属性 ==========

  // 缓存今日日期（计算属性，基于响应式数据实时更新）
  const today = computed(() => getTodayStr())

  // ----- 统计数据 -----
  // 总任务数量
  const totalCount = computed(() => tasks.value.length)
  // 已完成任务数量
  const completedCount = computed(() => tasks.value.filter(t => t.completed).length)
  // 未完成任务数量
  const incompleteCount = computed(() => tasks.value.filter(isIncomplete).length)

  // 今日到期任务（未完成且截止日期为今天）
  // filter：过滤数组，只保留满足条件的元素
  const todayDueTasks = computed(() =>
    tasks.value.filter(t => isIncomplete(t) && t.dueDate === today.value)
  )
  // 今日到期任务数量
  const todayDueCount = computed(() => todayDueTasks.value.length)

  // 逾期任务（未完成且截止日期 < 今天）
  // sort：排序函数，按截止日期升序排列（最早的在前）
  const overdueTasks = computed(() =>
    tasks.value
      .filter(t => isOverdue(t, today.value))  // 过滤出逾期任务
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))  // localeCompare：字符串比较
  )

  // 最近未完成任务（取前5条，按截止日期升序）—— 保留原名称
  // slice(0, 5)：取数组的前 5 个元素
  const recentIncompleteTasks = computed(() =>
    tasks.value
      .filter(isIncomplete)  // 过滤出未完成任务
      // sort：按截止日期排序，处理可能没有截止日期的情况
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 5)  // 只取前 5 个
  )

  // 即将到来的任务（未来3天内，不包括今天）
  const upcomingTasks = computed(() => {
    // 计算 3 天后的日期
    const futureCutoff = new Date()  // 创建当前日期对象
    futureCutoff.setDate(futureCutoff.getDate() + 3)  // setDate：设置日期，加 3 天
    const cutoffStr = futureCutoff.toISOString().split('T')[0]  // 转成 YYYY-MM-DD 格式
    return tasks.value
      .filter(t => isIncomplete(t) && t.dueDate > today.value && t.dueDate <= cutoffStr)  // 过滤出未来 3 天内到期的任务
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))  // 按日期排序
      .slice(0, 5)  // 只取前 5 个
  })

  // 未完成任务的优先级分布 —— 保留原名称
  // 返回一个对象，包含高、中、低优先级任务的数量
  const incompletePriorityDistribution = computed(() => {
    const incomplete = tasks.value.filter(isIncomplete)  // 获取所有未完成任务
    const total = incomplete.length  // 计算总数
    if (total === 0) return { high: 0, medium: 0, low: 0 }  // 如果没有未完成任务，返回全 0 的对象
    return {
      // filter：过滤出特定优先级的任务，length 获取数量
      high: incomplete.filter(t => t.priority === 'high').length,
      medium: incomplete.filter(t => t.priority === 'medium').length,
      low: incomplete.filter(t => t.priority === 'low').length,
    }
  })

  // 今日进度百分比
  const todayProgress = computed(() => {
    const todays = todayDueTasks.value  // 获取今日到期任务
    if (todays.length === 0) return 0  // 如果没有任务，返回 0
    const done = todays.filter(t => t.completed).length  // 计算已完成的任务数量
    // Math.round：四舍五入，返回完成百分比
    return Math.round((done / todays.length) * 100)
  })

  // ========== 5.3 操作方法 ==========

  // 添加新任务
  // 参数 task：包含任务信息的对象（title, dueDate, priority 等）
  function addTask(task) {
    const newTask = {
      ...normalizeTask(task),  // 规范化任务对象，补充默认字段
      id: Date.now().toString(),  // Date.now()：获取当前时间戳，转成字符串作为唯一 ID
      order: tasks.value.length,  // order：任务顺序，取当前任务列表的长度（排在最后）
    }
    tasks.value.push(newTask)  // push：把新任务添加到数组末尾
    persist()  // 保存到本地存储
  }

  // 更新任务
  // 参数 id：要更新的任务 ID
  // 参数 updates：要更新的属性对象
  function updateTask(id, updates) {
    // findIndex：查找任务索引，如果找不到返回 -1
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx === -1) return  // 如果没找到，直接返回

    const oldTask = tasks.value[idx]  // 获取旧任务对象
    const wasCompleted = oldTask.completed  // 记录原来的完成状态
    const newTask = { ...oldTask, ...updates }  // 合并旧任务和新更新

    // 处理完成状态变化的时间记录
    // !wasCompleted：原来未完成
    // newTask.completed：新的完成状态
    // &&：并且，两个条件都要满足
    if (!wasCompleted && newTask.completed) {
      // 任务从"未完成"变成"已完成"，记录完成时间
      newTask.completedAt = new Date().toISOString()
    } else if (wasCompleted && !newTask.completed) {
      // 任务从"已完成"变成"未完成"，删除完成时间
      delete newTask.completedAt
    }

    tasks.value[idx] = newTask  // 更新任务
    persist()  // 保存到本地存储
  }

  // 删除单个任务
  // 参数 id：要删除的任务 ID
  function deleteTask(id) {
    // filter：过滤数组，返回不包含指定 ID 的新数组（即删除该任务）
    tasks.value = tasks.value.filter(t => t.id !== id)
    persist()  // 保存到本地存储
  }

  // 批量删除任务
  // 参数 ids：包含多个任务 ID 的数组
  function deleteTasks(ids) {
    // includes：检查数组中是否包含指定元素
    tasks.value = tasks.value.filter(t => !ids.includes(t.id))
    persist()  // 保存到本地存储
  }

  // 清除所有已完成任务
  function clearCompleted() {
    // filter：过滤出未完成的任务（即删除所有已完成的）
    tasks.value = tasks.value.filter(t => !t.completed)
    persist()  // 保存到本地存储
  }

  // 清除所有任务
  function clearAll() {
    tasks.value = []  // 直接把任务数组设为空数组
    persist()  // 保存到本地存储
  }

  // 重新排序任务列表
  // 参数 newOrder：按新顺序排列的任务数组（只包含未完成任务）
  function reorderTasks(newOrder) {
    // 创建一个 Map 来存储新顺序中的任务 ID 到索引的映射关系
    // Map 是一种键值对数据结构，查找速度快
    const orderMap = new Map()
    // forEach：遍历数组
    // task：当前任务对象
    // idx：当前任务在新顺序中的索引（位置）
    newOrder.forEach((task, idx) => {
      // set：添加键值对，键为任务 ID，值为索引
      // 例如：{ id: "1", title: "任务A" }, idx = 0
      // orderMap.set("1", 0)
      orderMap.set(task.id, idx)
    })

    // 遍历所有任务，更新它们的 order 属性
    for (const task of tasks.value) {
      // has：检查 Map 中是否存在指定的键
      if (orderMap.has(task.id)) {
        // get：根据键获取值
        task.order = orderMap.get(task.id)
      }
    }

    // 分离未完成和已完成的任务
    const uncompletedOrdered = newOrder  // 未完成的任务按新顺序排列
    const completedTasks = tasks.value.filter(t => t.completed)  // 过滤出已完成的任务

    // 合并任务列表：未完成任务在前，已完成任务在后
    // ... 是扩展运算符，把数组展开成单独的元素
    tasks.value = [...uncompletedOrdered, ...completedTasks]
    persist()  // 保存到本地存储
  }

  // 导入任务
  // 参数 imported：要导入的任务数组
  // 参数 mode：导入模式，'replace'（替换）或 'add'（追加），默认为 'replace'
  function importTasks(imported, mode = 'replace') {
    if (!Array.isArray(imported)) return  //如果不是数组，直接返回
    const normalized = imported.map(normalizeTask)  // 规范化所有导入的任务
    if (mode === 'replace') {
      // 替换模式：用导入的任务完全替换现有任务
      tasks.value = normalized
    } else {
      // 追加模式：只添加不重复的新任务
      // Set：集合数据结构，自动去重，查找速度快
      const existingIds = new Set(tasks.value.map(t => t.id))  // 提取现有任务的 ID 集合
      // filter：过滤出 ID 不在现有任务中的任务（新任务）
      const newTasks = normalized.filter(t => !existingIds.has(t.id))
      // push：添加多个元素到数组末尾
      tasks.value.push(...newTasks)
    }
    persist()  // 保存到本地存储
  }

  // 获取所有任务数据，供统计功能使用
  function getTasksForStats() {
    return tasks.value
  }

  // ========== 5.4 对外暴露 ==========
  // return 语句导出 store 的所有数据和方法，供其他组件使用
  return {
    tasks,                      // 任务列表
    today,                      // 今天的日期
    totalCount,                // 总任务数
    completedCount,             // 已完成任务数
    incompleteCount,            // 未完成任务数
    todayDueTasks,              // 今日到期任务列表
    todayDueCount,              // 今日到期任务数
    overdueTasks,               // 逾期任务列表
    recentIncompleteTasks,       // 最近未完成任务列表
    upcomingTasks,               // 即将到期任务列表
    incompletePriorityDistribution,  // 优先级分布
    todayProgress,              // 今日完成进度百分比
    addTask,                    // 添加任务
    updateTask,                 // 更新任务
    deleteTask,                 // 删除任务
    deleteTasks,                // 批量删除任务
    clearCompleted,             // 清除已完成任务
    clearAll,                   // 清除所有任务
    reorderTasks,                // 重新排序任务
    importTasks,                // 导入任务
    getTasksForStats,           // 获取任务列表（用于统计）
  }
})
