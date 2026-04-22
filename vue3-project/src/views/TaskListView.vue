<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Edit, Delete, Filter, Sort, Search, Check } from '@element-plus/icons-vue'
import { useTaskStore } from '../stores/task'
import { useRoute } from 'vue-router'
import draggable from 'vuedraggable'
import { ElMessage, ElMessageBox } from 'element-plus'

const DEFAULT_NEW_TASK = {
  title: '',
  completed: false,
  dueDate: '',
  priority: 'medium'
}

const taskStore = useTaskStore()
const route = useRoute()

const addTaskFormRef = ref(null)

const tasks = computed(() => taskStore.tasks)

// 直接使用 taskStore.tasks 作为唯一数据源

const newTask = ref({ ...DEFAULT_NEW_TASK })
const editingTask = ref(null)
const editForm = ref({})

const filterStatus = ref('all')
const sortMode = ref('dueDate') // 排序模式：dueDate, priority, custom
const searchKeyword = ref('')
const priorityOrder = { high: 0, medium: 1, low: 2 }

// 存储选中的已完成任务的 id
const selectedCompletedTasks = ref([])

// 切换单个任务的选中状态
const toggleSelectTask = (taskId) => {
  const index = selectedCompletedTasks.value.indexOf(taskId)
  if (index === -1) {
    selectedCompletedTasks.value.push(taskId)
  } else {
    selectedCompletedTasks.value.splice(index, 1)
  }
}

// 批量删除选中的已完成任务
const deleteSelectedTasks = async () => {
  if (selectedCompletedTasks.value.length === 0) {
    ElMessage.info('请先选择要删除的任务')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedCompletedTasks.value.length} 个已完成任务吗？此操作不可撤销。`,
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    // 从 store 中过滤掉选中的任务
    const remainingTasks = taskStore.tasks.filter(task => !selectedCompletedTasks.value.includes(task.id))
    taskStore.setTasks(remainingTasks)
    selectedCompletedTasks.value = [] // 清空选中
    ElMessage.success('已删除选中的任务')
  } catch {
    // 用户取消
  }
}

// 全选/取消全选已完成任务
const selectAllCompletedTasks = (value) => {
  if (value) {
    // 全选所有已完成任务
    selectedCompletedTasks.value = completedTasks.value.map(task => task.id)
  } else {
    // 取消全选
    selectedCompletedTasks.value = []
  }
}

// 检查是否全选
const isAllSelected = computed(() => {
  return completedTasks.value.length > 0 && selectedCompletedTasks.value.length === completedTasks.value.length
})

const sortByDate = (a, b) => {
  const timestampA = new Date(a.dueDate).getTime()
  const timestampB = new Date(b.dueDate).getTime()
  if (isNaN(timestampA)) return 1
  if (isNaN(timestampB)) return -1
  return timestampA - timestampB
}

const sortByPriority = (a, b) => {
  const priorityA = priorityOrder[a.priority] ?? 999
  const priorityB = priorityOrder[b.priority] ?? 999
  return priorityA - priorityB
}

// 过滤后的任务（不包含排序，用于筛选显示）
const filteredTasks = computed(() => {
  let result = [...taskStore.tasks]

  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim()
    result = result.filter(task => task.title.toLowerCase().includes(keyword))
  }

  if (filterStatus.value !== 'all') {
    if (filterStatus.value === 'completed') {
      result = result.filter(task => task.completed)
    } else if (filterStatus.value === 'pending') {
      result = result.filter(task => !task.completed)
    } else if (filterStatus.value === 'overdue') {
      // 逾期筛选：截止日期早于今天且未完成
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]
      result = result.filter(task => {
        if (task.completed) return false
        if (!task.dueDate) return false
        return task.dueDate < todayStr
      })
    }
  }

  return result
})



// 未完成任务（可拖拽排序）
const uncompletedTasks = computed({
  get: () => {
    // 获取所有未完成任务
    let allUncompleted = taskStore.tasks.filter(task => !task.completed)
    
    // 如果是逾期筛选模式，则只显示逾期的未完成任务
    if (filterStatus.value === 'overdue') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]
      allUncompleted = allUncompleted.filter(task => {
        if (!task.dueDate) return false
        return task.dueDate < todayStr
      })
    }
    
    // 应用搜索和状态过滤
    let filtered = [...allUncompleted]
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.toLowerCase().trim()
      filtered = filtered.filter(task => task.title.toLowerCase().includes(keyword))
    }
    
    if (filterStatus.value === 'completed') {
      // 不显示未完成任务
      return []
    }
    
    // 应用排序
    if (sortMode.value === 'custom') {
      // 自定义顺序，不排序
      return filtered
    } else if (sortMode.value === 'dueDate') {
      filtered.sort(sortByDate)
    } else if (sortMode.value === 'priority') {
      filtered.sort(sortByPriority)
    }
    
    return filtered
  },
  set: (newOrder) => {
    // 获取当前已完成的任务（从 taskStore 中获取，确保包含所有任务）
    const completedTasksList = taskStore.tasks.filter(task => task.completed)
    
    // 按照新顺序排列未完成任务，并添加已完成任务在末尾
    const finalTasks = [...newOrder, ...completedTasksList]
    
    // 直接更新 store
    taskStore.setTasks(finalTasks)
    
    // 设置为自定义排序模式
    sortMode.value = 'custom'
    
    // 保存排序模式和未完成任务顺序到 localStorage
    localStorage.setItem('taskSortMode', 'custom')
    const uncompletedIds = newOrder.map(task => task.id)
    localStorage.setItem('uncompletedTaskOrder', JSON.stringify(uncompletedIds))
  }
})

// 已完成任务（不可拖拽）
const completedTasks = computed(() => {
  // 获取所有已完成任务
  const allCompleted = taskStore.tasks.filter(task => task.completed)
  
  // 应用搜索和状态过滤
  let filtered = [...allCompleted]
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim()
    filtered = filtered.filter(task => task.title.toLowerCase().includes(keyword))
  }
  
  if (filterStatus.value === 'completed') {
    // 只显示已完成任务
  } else if (filterStatus.value === 'pending') {
    // 不显示已完成任务
    return []
  }
  
  // 已完成任务按完成时间倒序排列
  return filtered.sort((a, b) => {
    // 这里可以根据需要调整排序逻辑
    return b.id - a.id // 按创建时间倒序
  })
})

const taskStats = computed(() => {
  const total = tasks.value.length
  const completed = tasks.value.filter(task => task.completed).length
  const pending = total - completed
  const today = formatDate(new Date())
  const todayDue = tasks.value.filter(task => !task.completed && task.dueDate === today).length
  const highPriority = tasks.value.filter(task => !task.completed && task.priority === 'high').length
  return { total, completed, pending, todayDue, highPriority }
})

const resetNewTask = () => {
  newTask.value = { ...DEFAULT_NEW_TASK }
}

onMounted(() => {
  // 处理从统计页面跳转过来的逾期筛选
  if (route.query.filter === 'overdue') {
    console.log('检测到逾期任务筛选参数，正在设置筛选状态...')
    filterStatus.value = 'overdue'
  }

  // 处理从首页跳转过来的添加任务表单显示
  if (route.query.showAddForm === 'true') {
    console.log('检测到显示添加任务表单参数，正在滚动到表单...')
    setTimeout(() => {
      if (addTaskFormRef.value) {
        addTaskFormRef.value.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        })
        // 添加动画效果
        addTaskFormRef.value.classList.add('form-animation')
      }
    }, 100)
  }

  // 从 localStorage 恢复排序模式
  const savedSortMode = localStorage.getItem('taskSortMode')
  if (savedSortMode) {
    sortMode.value = savedSortMode
  }
  
  // 如果是自定义排序模式，恢复未完成任务的顺序
  if (sortMode.value === 'custom') {
    const savedOrder = localStorage.getItem('uncompletedTaskOrder')
    if (savedOrder) {
      try {
        const uncompletedIds = JSON.parse(savedOrder)
        const currentTasks = [...taskStore.tasks]
        
        // 只有当保存的排序包含当前任务时才应用排序
        if (uncompletedIds.length > 0) {
          // 将未完成任务按照保存的顺序排列
          const uncompletedTasksFromStore = currentTasks.filter(task => !task.completed)
          const completedTasksFromStore = currentTasks.filter(task => task.completed)
          
          // 按照保存的顺序重新排列未完成任务
          const sortedUncompleted = uncompletedIds
            .map(id => uncompletedTasksFromStore.find(task => task.id === id))
            .filter(Boolean)
          
          // 合并：排序后的未完成任务 + 已完成任务
          const reorderedTasks = [...sortedUncompleted, ...completedTasksFromStore]
          
          // 只有当重新排序后的任务数量与当前任务数量相同时才更新
          if (reorderedTasks.length === currentTasks.length) {
            taskStore.setTasks(reorderedTasks)
          }
        }
        return
      } catch (e) {
        // 如果解析失败，使用默认顺序
        console.error('恢复排序失败:', e)
      }
    }
  }
})

// 处理排序模式变化
const handleSortModeChange = (newMode) => {
  if (newMode !== 'custom') {
    // 清除自定义顺序
    localStorage.removeItem('uncompletedTaskOrder')
    localStorage.setItem('taskSortMode', newMode)
  }
}

// 拖拽结束处理函数 - 这是核心！
const handleDragEnd = (evt) => {
  // 由于 draggable 使用 v-model 绑定 uncompletedTasks，
  // 拖拽结束后 uncompletedTasks 的 setter 会被自动调用
  // 这里确保设置为自定义排序模式
  sortMode.value = 'custom'
  localStorage.setItem('taskSortMode', 'custom')
  
  // 保存未完成任务顺序到 localStorage
  const uncompletedIds = uncompletedTasks.value.map(task => task.id)
  localStorage.setItem('uncompletedTaskOrder', JSON.stringify(uncompletedIds))
}

const addTask = () => {
  const title = newTask.value.title.trim()
  if (!title) return

  const task = {
    ...newTask.value
  }

  if (task.dueDate) {
    task.dueDate = formatDate(task.dueDate)
  }

  taskStore.addTask(task)
  resetNewTask()
  
  // 显示添加成功提示
  ElMessage({
    message: '添加任务成功',
    type: 'success',
    duration: 2000
  })
}

const findTaskIndexById = (taskId) => {
  return tasks.value.findIndex(task => task.id === taskId)
}

const findTaskById = (taskId) => {
  return tasks.value.find(task => task.id === taskId)
}

const startEdit = (task) => {
  if (!task) return
  editingTask.value = task.id
  editForm.value = { ...task }
}

const saveEdit = () => {
  const updatedTask = { ...editForm.value }
  if (updatedTask.dueDate) {
    updatedTask.dueDate = formatDate(updatedTask.dueDate)
  }
  taskStore.updateTask(updatedTask)
  editingTask.value = null
}

const cancelEdit = () => {
  editingTask.value = null
}

const deleteTask = (taskId) => {
  taskStore.deleteTask(taskId)
}

// 删除单个任务（带二次确认）
const deleteTaskWithConfirm = async (taskId) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个已完成任务吗？此操作不可撤销。',
      '警告',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    taskStore.deleteTask(taskId)
    // 从选中列表中移除
    const index = selectedCompletedTasks.value.indexOf(taskId)
    if (index !== -1) {
      selectedCompletedTasks.value.splice(index, 1)
    }
    ElMessage.success('已删除任务')
  } catch {
    // 用户取消
  }
}

const updateStatus = (taskId, completed) => {
  taskStore.updateStatus(taskId, completed)
}



const formatDate = (date) => {
  if (!date) return ''
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date
  }
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getPriorityInfo = (priority) => {
  const priorityMap = {
    high: { label: '高', icon: '🔥' },
    medium: { label: '中', icon: '⚠️' },
    low: { label: '低', icon: '✅' }
  }
  return priorityMap[priority] || { label: '未知', icon: '❓' }
}

// 判断任务是否逾期
// 判断任务是否逾期
const isTaskOverdue = (task) => {
  if (task.completed) return false
  if (!task.dueDate) return false
  
  // 确保日期格式一致
  const today = new Date().toISOString().split('T')[0]
  const taskDate = new Date(task.dueDate).toISOString().split('T')[0]
  
  return taskDate < today
}
</script>

<template>
  <div class="task-list">
    <div class="task-list-header">
      <h1>任务列表</h1>
      <p>管理和跟踪您的任务</p>
    </div>

    <div class="add-task-form" ref="addTaskFormRef">
      <h2>添加新任务</h2>
      <el-form :model="newTask" @submit.prevent="addTask" size="default">
        <div class="form-row">
          <div class="form-item">
            <el-form-item label="任务标题">
              <el-input v-model="newTask.title" placeholder="输入任务标题" required />
            </el-form-item>
          </div>
          <div class="form-item">
            <el-form-item label="截止日期">
              <el-date-picker v-model="newTask.dueDate" type="date" placeholder="选择日期" style="width: 100%;" />
            </el-form-item>
          </div>
          <div class="form-item">
            <el-form-item label="优先级">
              <el-select v-model="newTask.priority" placeholder="选择优先级" style="width: 100%;">
                <el-option value="high" label="高" />
                <el-option value="medium" label="中" />
                <el-option value="low" label="低" />
              </el-select>
            </el-form-item>
          </div>
          <div class="form-item completed-item">
            <el-form-item label="状态">
              <el-checkbox v-model="newTask.completed" label="已完成" />
            </el-form-item>
          </div>
        </div>

        <div class="form-actions">
          <el-button type="primary" @click="addTask">添加任务</el-button>
        </div>

        <div class="mobile-form-actions">
          <div class="completed-checkbox">
            <el-checkbox v-model="newTask.completed" label="已完成" />
          </div>
          <div class="add-button">
            <el-button type="primary" @click="addTask">添加任务</el-button>
          </div>
        </div>
      </el-form>
    </div>

    <el-card class="dashboard-card" shadow="hover">
      <el-row :gutter="20">
        <el-col :xs="12" :sm="12" :md="8" :lg="5" :xl="5">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">📋</div>
              <div class="stat-info">
                <div class="stat-label">总任务数</div>
                <div class="stat-value">{{ taskStats.total }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="8" :lg="5" :xl="5">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">✅</div>
              <div class="stat-info">
                <div class="stat-label">已完成</div>
                <div class="stat-value">{{ taskStats.completed }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="8" :lg="5" :xl="5">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">⏳</div>
              <div class="stat-info">
                <div class="stat-label">未完成</div>
                <div class="stat-value">{{ taskStats.pending }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="8" :lg="5" :xl="5">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">📅</div>
              <div class="stat-info">
                <div class="stat-label">今日到期</div>
                <div class="stat-value">{{ taskStats.todayDue }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :xs="12" :sm="12" :md="8" :lg="4" :xl="4">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon">🔥</div>
              <div class="stat-info">
                <div class="stat-label">高优先级</div>
                <div class="stat-value">{{ taskStats.highPriority }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <div class="filter-card">
      <el-row :gutter="20" style="margin-bottom: 16px; margin-top: 16px;" align="middle">
        <el-col :xs="24" :sm="24" :md="24" :lg="10" :xl="10">
          <el-input v-model="searchKeyword" placeholder="搜索任务标题..." :prefix-icon="Search" class="search-input" style="width: 100%;" />
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="7" :xl="7">
          <div class="filter-item" style="width: 100%;">
            <el-icon><Filter /></el-icon>
            <span>状态过滤：</span>
            <el-select v-model="filterStatus" size="small" style="width: calc(100% - 80px);">
              <el-option value="all" label="全部" />
              <el-option value="completed" label="已完成" />
              <el-option value="pending" label="未完成" />
              <el-option value="overdue" label="逾期" />
            </el-select>
          </div>
        </el-col>
        <el-col :xs="12" :sm="12" :md="6" :lg="7" :xl="7">
          <div class="filter-item" style="width: 100%;">
            <el-icon><Sort /></el-icon>
            <span>排序方式：</span>
            <el-select v-model="sortMode" size="small" style="width: calc(100% - 80px);" @change="handleSortModeChange">
              <el-option value="dueDate" label="截止日期" />
              <el-option value="priority" label="优先级" />
              <el-option value="custom" label="自定义顺序" />
            </el-select>
          </div>
        </el-col>
      </el-row>
    </div>

    <div v-if="tasks.length === 0" class="empty-state">
      <div class="empty-content">
        <el-empty description="暂无任务，点击添加">
          <template #description>
            <span>暂无任务，点击添加</span>
          </template>
          <el-button type="primary" @click="$refs.addTaskForm.scrollIntoView({ behavior: 'smooth' })" style="margin-top: 20px;">添加任务</el-button>
        </el-empty>
      </div>
    </div>
    
    <!-- 未完成任务区域（可拖拽） -->
    <div v-if="uncompletedTasks.length > 0" class="tasks-section">
      <h3 class="section-title">未完成任务 ({{ uncompletedTasks.length }})</h3>
      <draggable
        v-model="uncompletedTasks"
        item-key="id"
        @end="handleDragEnd"
        handle=".drag-handle"
        tag="div"
        class="tasks-container"
      >
        <template #item="{ element: task }">
          <div :key="task.id" class="task-card">
            <div class="drag-handle" style="cursor: move; padding: 0 10px; display: inline-block; margin-right: 10px;">
              ☰
            </div>
            <div v-if="editingTask === task.id" class="task-edit-form">
              <h3>编辑任务</h3>
              <el-form label-width="80px" size="default">
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-form-item label="任务标题">
                      <el-input v-model="editForm.title" required />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-form-item label="优先级">
                      <el-select v-model="editForm.priority">
                        <el-option value="high" label="高" />
                        <el-option value="medium" label="中" />
                        <el-option value="low" label="低" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-form-item label="截止日期">
                      <el-date-picker v-model="editForm.dueDate" type="date" placeholder="选择日期" style="width: 100%;" />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12" :md="6">
                    <el-form-item label="完成状态" style="margin-bottom: 0;">
                      <el-checkbox v-model="editForm.completed" label="已完成" style="margin-top: 24px;" />
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row style="margin-top: 20px;">
                  <el-col :span="24" style="text-align: right;">
                    <el-button type="primary" @click="saveEdit" :icon="Edit">保存</el-button>
                    <el-button @click="cancelEdit" style="margin-left: 10px;">取消</el-button>
                  </el-col>
                </el-row>
              </el-form>
            </div>

            <div v-else class="task-content" :class="{ completed: task.completed }">
              <div class="task-header">
                <h3>{{ task.title }}</h3>
                <div class="task-actions">
                  <el-tag v-if="isTaskOverdue(task)" type="danger" size="small" effect="dark" style="margin-right: 10px;">已逾期</el-tag>
                  <el-button type="primary" size="small" @click="startEdit(task)" :icon="Edit">编辑</el-button>
                  <el-button type="danger" size="small" @click="deleteTask(task.id)" :icon="Delete">删除</el-button>
                </div>
              </div>

              <div class="task-body">
                <div class="task-meta">
                  <span class="task-due-date">
                    <span class="date-icon">📅</span>
                    {{ formatDate(task.dueDate) }}
                  </span>
                  <span class="task-priority" :class="task.priority">
                    <span class="priority-icon">{{ getPriorityInfo(task.priority).icon }}</span>
                    {{ getPriorityInfo(task.priority).label }}
                  </span>
                  <div class="task-completed">
                    <el-checkbox v-model="task.completed" @change="updateStatus(task.id, task.completed)" label="已完成" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </draggable>
    </div>
    
    <!-- 已完成任务区域（不可拖拽） -->
    <div v-if="completedTasks.length > 0" class="tasks-section completed-section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 class="section-title">已完成任务 ({{ completedTasks.length }})</h3>
        <div style="display: flex; gap: 10px;">
          <el-button type="primary" plain size="small" @click="selectAllCompletedTasks(!isAllSelected)">
            {{ isAllSelected ? '取消全选' : '全选' }}
          </el-button>
          <el-button type="danger" plain size="small" @click="deleteSelectedTasks" :disabled="selectedCompletedTasks.length === 0">
            删除选中 ({{ selectedCompletedTasks.length }})
          </el-button>
        </div>
      </div>
      <div class="tasks-container">
        <div 
          v-for="task in completedTasks" 
          :key="task.id" 
          :class="['task-card', { 'task-card-selected': selectedCompletedTasks.includes(task.id) }]" 
          @click="toggleSelectTask(task.id)"
        >
          <el-checkbox 
            :model-value="selectedCompletedTasks.includes(task.id)" 
            @click.stop 
            @change="toggleSelectTask(task.id)" 
            style="margin-right: 10px;"
          />
          <div class="task-content completed">
            <div class="task-header">
              <h3>{{ task.title }}</h3>
              <div class="task-actions">
                <el-tooltip content="删除任务" placement="top">
                  <el-button 
                    type="danger" 
                    size="small" 
                    circle 
                    @click.stop="deleteTaskWithConfirm(task.id)" 
                    class="hover-delete-btn"
                    :icon="Delete"
                  />
                </el-tooltip>
              </div>
            </div>

            <div class="task-body">
              <div class="task-meta">
                <span class="task-due-date">
                  <span class="date-icon">📅</span>
                  {{ formatDate(task.dueDate) }}
                </span>
                <span class="task-priority" :class="task.priority">
                  <span class="priority-icon">{{ getPriorityInfo(task.priority).icon }}</span>
                  {{ getPriorityInfo(task.priority).label }}
                </span>
                <div class="task-completed">
                  <el-tooltip content="已完成任务不可修改" placement="top">
                    <el-checkbox v-model="task.completed" @change="updateStatus(task.id, task.completed)" label="已完成" :disabled="true" />
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="uncompletedTasks.length === 0 && completedTasks.length === 0 && tasks.length > 0" class="empty-state">
      <p>没有符合条件的任务</p>
    </div>
  </div>
</template>

<style scoped>
.task-list {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.task-list-header {
  text-align: center;
  margin-bottom: 60px;
}

.task-list-header h1 {
  font-size: 36px;
  margin-bottom: 20px;
  color: var(--text-primary);
  transition: color 0.3s;
}

.task-list-header p {
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 800px;
  margin: 0 auto;
  transition: color 0.3s;
}

.add-task-form {
  background-color: var(--bg-card);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  padding: 20px;
  margin-bottom: 30px;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.add-task-form:hover {
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
  transform: translateY(-5px);
}

/* 表单动画效果 */
.form-animation {
  animation: formAppear 0.6s ease-out forwards;
}

@keyframes formAppear {
  0% {
    opacity: 0;
    transform: translateY(20px);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.15);
  }
}

.dashboard-card {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
}

.stat-card {
  transition: all 0.3s ease;
  border-radius: 8px;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.stat-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  transition: color 0.3s;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--button-primary);
  transition: color 0.3s;
}

.filter-card {
  background-color: #f9fafc;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 24px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-item span {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
  transition: color 0.3s;
  white-space: nowrap;
}

.filter-item .el-select {
  flex: 1;
  min-width: 0;
}

.dark .filter-card {
  background-color: var(--bg-secondary);
}

.dark .filter-item span {
  color: var(--text-secondary);
}

.dark .el-select .el-input__wrapper {
  background-color: var(--bg-primary);
  border-color: var(--border-color);
}

.dark .el-select .el-input__inner {
  color: var(--text-primary);
}

.search-input {
  width: 100%;
  border-radius: 30px;
  padding: 12px 16px;
  font-size: 16px;
  background-color: #fff;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.search-input:hover {
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
}

.search-input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  outline: none;
}

.search-input :deep(.el-input__prefix) {
  color: #909399;
}

.search-input :deep(.el-input__placeholder) {
  color: #c0c4cc;
}

.tasks-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  background-color: var(--bg-card);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 20px;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  width: 100%;
  color: var(--text-primary);
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border-color: var(--button-primary);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  margin-right: 5px;
}

.task-header h3 {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
  color: var(--text-primary);
  flex: 1;
  transition: color 0.3s;
}

.task-actions {
  display: flex;
  gap: 10px;
}

.task-body {
  margin-top: 15px;
}

.task-description {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 15px;
  transition: color 0.3s;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.task-completed {
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.task-priority {
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
  border: 1px solid;
}

.task-priority.high {
  background-color: #fef0f0;
  color: #f56c6c;
  border-color: #fbc4c4;
}

.task-priority.medium {
  background-color: #fdf6ec;
  color: #e6a23c;
  border-color: #fde68a;
}

.task-priority.low {
  background-color: #f0f9eb;
  color: #67c23a;
  border-color: #d9f7be;
}

.task-priority:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
}

.priority-icon {
  font-size: 14px;
}

.task-content.completed {
  opacity: 0.7;
}

.task-content.completed h3 {
  text-decoration: line-through;
  color: #909399;
}

.task-due-date {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--bg-secondary);
  padding: 6px 14px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.task-due-date:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.1);
  border-color: #1976d2;
}

.date-icon {
  font-size: 14px;
}

.task-edit-form {
  background-color: var(--bg-secondary);
  border-radius: 6px;
  padding: 20px;
  transition: background-color 0.3s;
}

.task-edit-form h3 {
  font-size: 16px;
  margin-bottom: 15px;
  color: var(--text-primary);
  transition: color 0.3s;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  color: #909399;
  font-size: 18px;
}

.tasks-section {
  margin-bottom: 30px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-left: 10px;
  border-left: 4px solid var(--button-primary);
  transition: color 0.3s, border-color 0.3s;
}

.completed-section .section-title {
  color: #909399;
  border-left-color: #67c23a;
}

.disabled-drag {
  cursor: not-allowed;
  opacity: 0.6;
}

.disabled-drag:hover {
  opacity: 1;
}

/* 悬停显示删除按钮 */
.task-card .task-actions .hover-delete-btn {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.task-card:hover .task-actions .hover-delete-btn {
  opacity: 1;
}

/* 选中卡片样式 */
.task-card-selected {
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  border-left: 3px solid var(--el-color-primary, #409eff);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

/* 确保卡片布局稳定，避免边框变化导致抖动 */
.task-card {
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

/* 鼠标悬停效果 */
.task-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.add-task-form h2 {
  font-size: 20px;
  margin-bottom: 20px;
  color: var(--text-primary);
  position: relative;
  padding-bottom: 10px;
  transition: color 0.3s;
}

.add-task-form h2::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 60px;
  height: 3px;
  background-color: #1976d2;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  align-items: flex-end;
}

.form-item {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 16px;
}

.mobile-form-actions {
  display: none;
}

.form-item .el-form-item {
  margin-bottom: 0;
  display: flex;
  align-items: center;
}

.form-item .el-form-item__label {
  min-width: 80px;
  text-align: left;
}

.form-item .el-form-item__content {
  flex: 1;
}

.form-item .el-input,
.form-item .el-select,
.form-item .el-date-picker {
  width: 100%;
}

@media (max-width: 768px) {
  .task-list {
    padding: 20px 10px;
  }

  .task-list-header h1 {
    font-size: 28px;
  }

  .dashboard-card {
    margin-bottom: 20px;
  }

  .stat-content {
    padding: 12px;
    gap: 12px;
  }

  .stat-icon {
    font-size: 24px;
  }

  .stat-value {
    font-size: 20px;
  }

  .add-task-form {
    background: white;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .form-row {
    flex-direction: column;
    gap: 16px;
  }

  .form-item {
    width: 100%;
  }

  .form-item .el-form-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .form-item .el-form-item__label {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 6px;
  }

  .form-item .el-form-item__content {
    width: 100% !important;
    min-width: 0 !important;
  }

  .form-item .el-input,
  .form-item .el-select,
  .form-item .el-date-picker {
    width: 100% !important;
  }

  .form-item .el-input__wrapper,
  .form-item .el-select .el-input__wrapper,
  .form-item .el-date-picker__wrapper {
    height: 44px !important;
    width: 100% !important;
  }

  .form-item .el-select .el-input {
    width: 100% !important;
  }

  .form-item .el-select .el-input__wrapper {
    min-width: 100% !important;
  }

  .form-item .el-select {
    min-width: 100% !important;
  }

  .form-row .form-item.completed-item,
  .form-actions {
    display: none;
  }

  .mobile-form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }

  .completed-checkbox {
    display: flex;
    align-items: center;
  }

  .add-button {
    flex: 0 0 auto;
  }

  @media (max-width: 320px) {
    .mobile-form-actions {
      flex-direction: column;
      align-items: flex-start;
    }

    .add-button {
      width: 100%;
    }

    .add-button .el-button {
      width: 100%;
    }
  }

  .filter-card {
    padding: 12px 16px;
  }

  .filter-item {
    width: 100%;
    justify-content: space-between;
  }

  .filter-item span {
    font-size: 12px;
  }

  .filter-item .el-select {
    flex: 1;
  }

  .tasks-container {
    grid-template-columns: 1fr;
  }

  .search-input {
    width: 100%;
  }
}
</style>
