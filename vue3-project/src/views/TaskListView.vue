<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled, Plus, Sort, Rank, Calendar, Edit, Delete, DeleteFilled } from '@element-plus/icons-vue'
import { useTaskStore } from '../stores/task'
import { useSettingsStore } from '../stores/settings'

// Constants
const FILTER_STATUS = {
  ALL: 'all',
  COMPLETED: 'completed',
  INCOMPLETE: 'incomplete',
  OVERDUE: 'overdue'
}

const SORT_ORDER = {
  DUE_DATE: 'dueDate',
  PRIORITY: 'priority',
  CUSTOM: 'custom'
}

const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' }

// Store and route
const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()

// State
const hoveredTaskId = ref(null)
const dialogVisible = ref(false)
const editingTask = ref(null)
const form = ref({ title: '', dueDate: '', priority: 'medium', completed: false })
const formRef = ref()
const filterStatus = ref(FILTER_STATUS.ALL)
const searchQuery = ref('')
const selectedIds = ref([])
const isMobile = ref(window.innerWidth < 768)

// Computed
const today = computed(() => new Date().toISOString().split('T')[0])

const sortedTasks = computed(() => {
  const all = [...taskStore.tasks]
  const order = settingsStore.sortOrder

  if (order === SORT_ORDER.DUE_DATE) {
    return all.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  } else if (order === SORT_ORDER.PRIORITY) {
    const pOrder = { high: 0, medium: 1, low: 2 }
    return all.sort((a, b) => pOrder[a.priority] - pOrder[b.priority])
  } else {
    return all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
})

const filteredTasks = computed(() => {
  let list = sortedTasks.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(t => t.title.toLowerCase().includes(q))
  }

  switch (filterStatus.value) {
    case FILTER_STATUS.COMPLETED:
      return list.filter(t => t.completed)
    case FILTER_STATUS.INCOMPLETE:
      return list.filter(t => !t.completed)
    case FILTER_STATUS.OVERDUE:
      return list.filter(t => !t.completed && t.dueDate < today.value)
    default:
      return list
  }
})

const incompleteTasks = computed(() =>
  filteredTasks.value.filter(t => !t.completed)
)

const completedTasks = computed(() =>
  filteredTasks.value.filter(t => t.completed)
)

const draggableList = computed({
  get() {
    return incompleteTasks.value
  },
  set(newVal) {
    taskStore.reorderTasks(newVal)
  }
})

const allSelectedForPage = computed({
  get() {
    if (completedTasks.value.length === 0) return false
    return completedTasks.value.every(t => selectedIds.value.includes(t.id))
  },
  set(val) {
    if (val) {
      selectedIds.value = completedTasks.value.map(t => t.id)
    } else {
      selectedIds.value = []
    }
  }
})

// Lifecycle
onMounted(() => {
  const f = route.query.filter
  if (f === 'new') openAddDialog()
  else if (f === 'overdue') filterStatus.value = FILTER_STATUS.OVERDUE
  
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  isMobile.value = window.innerWidth < 768
}

watch(() => route.query.filter, (f) => {
  if (f === 'new') openAddDialog()
  else if (f === 'overdue') filterStatus.value = FILTER_STATUS.OVERDUE
})

function openAddDialog() {
  editingTask.value = null
  form.value = { title: '', dueDate: today.value, priority: 'medium', completed: false }
  dialogVisible.value = true
}

function openEditDialog(task) {
  editingTask.value = task
  form.value = { title: task.title, dueDate: task.dueDate, priority: task.priority, completed: task.completed }
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  editingTask.value = null
}

async function submitForm() {
  try {
    await formRef.value.validate()
    if (editingTask.value) {
      taskStore.updateTask(editingTask.value.id, { ...form.value })
      ElMessage.success('任务已更新')
    } else {
      taskStore.addTask({ ...form.value })
      ElMessage.success('任务已添加')
    }
    closeDialog()
  } catch {
    // validation failed
  }
}

async function deleteTask(id, title) {
  try {
    await ElMessageBox.confirm(`确定要删除任务"${title}"吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })
    taskStore.deleteTask(id)
    ElMessage.success('任务已删除')
  } catch {
    // cancelled
  }
}

async function batchDelete() {
  if (selectedIds.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个任务吗？`,
      '批量删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )
    taskStore.deleteTasks(selectedIds.value)
    selectedIds.value = []
    ElMessage.success('批量删除成功')
  } catch {
    // cancelled
  }
}

function toggleSelectTask(taskId, checked) {
  if (checked) {
    if (!selectedIds.value.includes(taskId)) {
      selectedIds.value.push(taskId)
    }
  } else {
    selectedIds.value = selectedIds.value.filter(id => id !== taskId)
  }
}

async function clearCompleted() {
  if (completedTasks.value.length === 0) return
  try {
    await ElMessageBox.confirm('确定要清除所有已完成任务吗？', '清除确认', {
      confirmButtonText: '清除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger',
    })
    taskStore.clearCompleted()
    selectedIds.value = []
    ElMessage.success('已清除所有完成任务')
  } catch {
    // cancelled
  }
}

async function toggleComplete(task) {
  if (!task.completed) {
    try {
      await ElMessageBox.confirm(
        '是否标记为已完成？',
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      taskStore.updateTask(task.id, { completed: true })
    } catch {
      // cancelled
    }
  }
}

async function toggleCompleteFromCompleted(task) {
  try {
    await ElMessageBox.confirm(
      '该任务已完成，是否要重新打开（变为未完成）？',
      '确认操作',
      {
        confirmButtonText: '重新打开',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    taskStore.updateTask(task.id, { completed: false })
    ElMessage.success('任务已重新打开')
  } catch {
    // cancelled
  }
}

function isOverdue(task) {
  return !task.completed && task.dueDate < today.value
}

function formatDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function goToDetail(id) {
  router.push(`/task/${id}`)
}

const formRules = {
  title: [{ required: true, message: '请输入任务标题', trigger: 'blur' }],
  dueDate: [{ required: true, message: '请选择截止日期', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
}
</script>

<template>
  <div class="task-list-page">
    <!-- Header and Filters -->
    <div class="header-container">
      <!-- Mobile Header -->
      <div class="mobile-header" v-if="isMobile">
        <div class="mobile-header-row-1">
          <h2 class="mobile-title">任务列表</h2>
          <el-button type="primary" @click="openAddDialog" icon="Plus" circle class="add-btn">
          </el-button>
        </div>
        <div class="mobile-header-row-2">
          <span class="mobile-task-count">共 {{ taskStore.totalCount }} 个任务</span>
        </div>
      </div>

      <!-- Desktop Header -->
      <div class="page-header" v-else>
        <div class="header-left">
          <h2>任务列表</h2>
          <span class="task-count">共 {{ taskStore.totalCount }} 个任务</span>
        </div>
        <el-button type="primary" @click="openAddDialog" round>
          <el-icon><Plus /></el-icon> 添加新任务
        </el-button>
      </div>

      <!-- Filters -->
      <div class="filters-container">
        <div class="search-row">
          <el-input
            v-model="searchQuery"
            placeholder="搜索任务..."
            clearable
            class="search-input"
            prefix-icon="Search"
          />
          <el-dropdown trigger="click" class="sort-dropdown" v-if="isMobile">
            <el-button icon="Sort" class="sort-btn" circle>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :disabled="settingsStore.sortOrder === SORT_ORDER.DUE_DATE" @click="settingsStore.sortOrder = SORT_ORDER.DUE_DATE">
                  截止日期
                </el-dropdown-item>
                <el-dropdown-item :disabled="settingsStore.sortOrder === SORT_ORDER.PRIORITY" @click="settingsStore.sortOrder = SORT_ORDER.PRIORITY">
                  优先级
                </el-dropdown-item>
                <el-dropdown-item :disabled="settingsStore.sortOrder === SORT_ORDER.CUSTOM" @click="settingsStore.sortOrder = SORT_ORDER.CUSTOM">
                  自定义顺序
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- Filter buttons -->
        <div class="filter-scroll-container" v-if="isMobile">
          <div class="filter-buttons">
            <el-button
              v-for="(label, key) in { all: '全部', incomplete: '未完成', completed: '已完成', overdue: '逾期' }"
              :key="key"
              :type="filterStatus === key ? 'primary' : 'default'"
              :class="['filter-btn', { active: filterStatus === key }]"
              @click="filterStatus = key"
            >
              {{ label }}
              <span v-if="key === 'all'">({{ taskStore.totalCount }})</span>
              <span v-else-if="key === 'incomplete'">({{ taskStore.incompleteCount }})</span>
              <span v-else-if="key === 'completed'">({{ taskStore.completedCount }})</span>
              <span v-else-if="key === 'overdue'">({{ taskStore.overdueTasks.length }})</span>
            </el-button>
          </div>
        </div>

        <!-- Desktop Filters -->
        <div class="desktop-filters" v-else>
          <el-radio-group v-model="filterStatus">
            <el-radio-button value="all">全部 ({{ taskStore.totalCount }})</el-radio-button>
            <el-radio-button value="incomplete">未完成 ({{ taskStore.incompleteCount }})</el-radio-button>
            <el-radio-button value="completed">已完成 ({{ taskStore.completedCount }})</el-radio-button>
            <el-radio-button value="overdue">逾期 ({{ taskStore.overdueTasks.length }})</el-radio-button>
          </el-radio-group>
          <el-select v-model="settingsStore.sortOrder" placeholder="排序方式" size="small" class="sort-select">
            <el-option value="dueDate" label="按截止日期" />
            <el-option value="priority" label="按优先级" />
            <el-option value="custom" label="自定义排序" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- Incomplete Tasks (Draggable) -->
    <div class="section-block incomplete-section" v-if="filterStatus !== FILTER_STATUS.COMPLETED">
      <div class="section-label">
        <span>未完成任务 ({{ incompleteTasks.length }})</span>
        <small class="drag-hint" v-if="settingsStore.sortOrder === SORT_ORDER.CUSTOM">
          <el-icon><Sort /></el-icon> 可拖拽排序
        </small>
      </div>
      <div v-if="incompleteTasks.length > 0">
        <draggable
          v-model="draggableList"
          item-key="id"
          handle=".drag-handle"
          :disabled="settingsStore.sortOrder !== SORT_ORDER.CUSTOM"
          animation="200"
          ghost-class="dragging-ghost"
        >
          <template #item="{ element }">
            <div class="task-card mobile-task-card" :class="{ overdue: isOverdue(element) }" @mouseenter="hoveredTaskId = element.id" @mouseleave="hoveredTaskId = null">
              <div
                v-if="settingsStore.sortOrder === SORT_ORDER.CUSTOM"
                class="drag-handle"
                title="拖拽排序"
              >
                <el-icon><Rank /></el-icon>
              </div>
              <el-checkbox
                :model-value="element.completed"
                @change="toggleComplete(element)"
                class="task-checkbox"
              />
              <div class="task-card-info">
                <span class="task-card-title" :class="{ 'is-completed': element.completed }">
                  {{ element.title }}
                </span>
              </div>
              <div class="task-card-right">
                <span class="due-date" :class="{ overdue: isOverdue(element) }">
                  {{ formatDate(element.dueDate) }}
                </span>
                <span :class="['priority-tag', `priority-${element.priority}`]">
                  {{ PRIORITY_LABELS[element.priority] }}
                </span>
              </div>
              <div class="task-actions" v-show="hoveredTaskId === element.id || !isMobile">
                <el-button link size="small" @click="goToDetail(element.id)" title="详情">
                  <el-icon size="16"><InfoFilled /></el-icon>
                </el-button>
                <el-button link size="small" @click="openEditDialog(element)" title="编辑">
                  <el-icon size="16"><Edit /></el-icon>
                </el-button>
                <el-button link size="small" type="danger" @click="deleteTask(element.id, element.title)" title="删除">
                  <el-icon size="16"><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
        </draggable>
      </div>
      <div v-else class="empty-section">
        <el-empty description="暂无未完成任务" :image-size="60">
          <template #description>
            <span v-if="taskStore.totalCount === 0">还没有任务，添加第一个任务吧！</span>
            <span v-else>暂无未完成任务，去添加一个吧～</span>
          </template>
          <template #default>
            <el-button type="primary" @click="openAddDialog">添加第一个任务</el-button>
          </template>
        </el-empty>
      </div>
    </div>

    <!-- Completed Tasks -->
    <div class="section-block completed-section" v-if="filterStatus !== FILTER_STATUS.INCOMPLETE && filterStatus !== FILTER_STATUS.OVERDUE">
      <div class="section-label completed-label">
        <div class="completed-label-left">
          <el-checkbox
            v-if="completedTasks.length > 0"
            v-model="allSelectedForPage"
            class="select-all-check"
          >
          </el-checkbox>
          <span>已完成任务 ({{ completedTasks.length }})</span>
        </div>
        <div class="completed-label-right">
          <el-button
            v-if="selectedIds.length > 0"
            type="danger"
            size="small"
            @click="batchDelete"
            plain
            class="batch-delete-btn"
          >
            <el-icon><Delete /></el-icon>
            删除选中 ({{ selectedIds.length }})
          </el-button>
          <el-button
            v-if="completedTasks.length > 0"
            type="danger"
            size="small"
            @click="clearCompleted"
            plain
            class="clear-btn"
          >
            清除全部
          </el-button>
        </div>
      </div>

      <div v-if="completedTasks.length > 0" class="completed-list">
        <div
          v-for="task in completedTasks"
          :key="task.id"
          class="task-card mobile-task-card completed-card"
          @mouseenter="hoveredTaskId = task.id"
          @mouseleave="hoveredTaskId = null"
        >
          <el-checkbox
            :model-value="selectedIds.includes(task.id)"
            @change="(val) => toggleSelectTask(task.id, val)"
            class="task-checkbox select-checkbox"
          />
          <el-checkbox
            :model-value="task.completed"
            @change="toggleCompleteFromCompleted(task)"
            class="task-checkbox"
          />
          <div class="task-card-info">
            <span class="task-card-title is-completed">{{ task.title }}</span>
          </div>
          <div class="task-card-right">
            <span class="due-date">{{ formatDate(task.dueDate) }}</span>
            <span :class="['priority-tag', `priority-${task.priority}`]">
              {{ PRIORITY_LABELS[task.priority] }}
            </span>
          </div>
          <div class="task-actions completed-actions" v-show="hoveredTaskId === task.id || !isMobile">
            <el-button link size="small" @click="goToDetail(task.id)" title="详情">
              <el-icon size="16"><InfoFilled /></el-icon>
            </el-button>
            <el-button link size="small" @click="openEditDialog(task)" title="编辑">
              <el-icon size="16"><Edit /></el-icon>
            </el-button>
            <el-button link size="small" type="danger" @click="deleteTask(task.id, task.title)" title="删除" class="delete-btn">
              <el-icon size="16"><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      <div v-else class="empty-section">
        <el-empty description="暂无已完成任务" :image-size="60" />
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingTask ? '编辑任务' : '添加新任务'"
      :width="isMobile ? '90%' : '480px'"
      :close-on-click-modal="false"
      @close="closeDialog"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="80px"
        label-position="left"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入任务标题"
            maxlength="100"
            show-word-limit
            clearable
          />
        </el-form-item>
        <el-form-item label="截止日期" prop="dueDate">
          <el-date-picker
            v-model="form.dueDate"
            type="date"
            placeholder="选择截止日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option label="高优先级" value="high">
              <span class="priority-option">
                <span class="dot dot-high"></span> 高优先级
              </span>
            </el-option>
            <el-option label="中优先级" value="medium">
              <span class="priority-option">
                <span class="dot dot-medium"></span> 中优先级
              </span>
            </el-option>
            <el-option label="低优先级" value="low">
              <span class="priority-option">
                <span class="dot dot-low"></span> 低优先级
              </span>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态" v-if="editingTask">
          <el-switch
            v-model="form.completed"
            active-text="已完成"
            inactive-text="未完成"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="submitForm">
            {{ editingTask ? '保存修改' : '添加任务' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.task-list-page {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.header-container {
  margin-bottom: 24px;
}

/* Mobile Header */
.mobile-header {
  margin-bottom: 16px;
}

.mobile-header-row-1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mobile-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.add-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-header-row-2 {
  margin-top: 4px;
}

.mobile-task-count {
  font-size: 14px;
  color: gray;
}

/* Desktop Header */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.header-left h2 {
  font-size: 22px;
  font-weight: 700;
}

.task-count {
  font-size: 13px;
  color: var(--color-text-muted);
}

/* Filters Container */
.filters-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
  min-width: 0;
}

.sort-dropdown {
  flex-shrink: 0;
}

.sort-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Mobile Filter Buttons */
.filter-scroll-container {
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
}

.filter-buttons {
  display: inline-flex;
  gap: 8px;
  padding: 4px 0;
}

.filter-btn {
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
  white-space: nowrap;
}

.filter-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

/* Desktop Filters */
.desktop-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sort-select {
  min-width: 120px;
}

/* Section Blocks */
.section-block {
  margin-bottom: 24px;
  border-radius: 10px;
  overflow: hidden;
}

.incomplete-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 16px;
}

.completed-section {
  background: var(--color-surface-secondary);
  border: 1px solid var(--color-border);
  padding: 16px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 4px 8px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drag-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.completed-label {
  flex-wrap: wrap;
  gap: 8px;
}

.completed-label-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.completed-label-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Task Cards */
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin-bottom: 8px;
  transition: all var(--transition-fast);
  position: relative;
}

/* Mobile Task Card */
.mobile-task-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 12px;
}

.task-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--color-primary-light);
}

.task-card.overdue {
  border-left: 3px solid var(--color-error);
  background: var(--color-error-light);
}

.task-card.completed-card {
  opacity: 0.75;
}

.task-card.completed-card:hover {
  opacity: 1;
}

.drag-handle {
  cursor: grab;
  color: var(--color-text-muted);
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  transition: color var(--transition-fast);
}

.drag-handle:hover { color: var(--color-text-secondary); }
.drag-handle:active { cursor: grabbing; }

.task-checkbox {
  flex-shrink: 0;
  min-width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-checkbox {
  width: 20px;
  margin-right: 4px;
}

.task-card-info {
  flex: 1;
  min-width: 0;
}

.task-card-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card-title.is-completed {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.task-card-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.due-date {
  font-size: 12px;
  color: var(--color-text-muted);
}

.due-date.overdue {
  color: var(--color-error);
  font-weight: 500;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.completed-actions {
  margin-left: auto;
}

.empty-section {
  padding: 32px 0;
  text-align: center;
}

.dragging-ghost {
  opacity: 0.4;
  background: var(--color-primary-light) !important;
  border: 2px dashed var(--color-primary) !important;
}

/* Priority Tags */
.priority-tag {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  flex-shrink: 0;
}

.priority-high {
  background: #f56c6c;
}

.priority-medium {
  background: #e6a23c;
}

.priority-low {
  background: #67c23a;
}

.priority-option {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.dot-high { background: #ef4444; }
.dot-medium { background: #f59e0b; }
.dot-low { background: #10b981; }

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .task-list-page {
    padding: 16px;
  }

  .incomplete-section,
  .completed-section {
    padding: 12px;
  }

  .section-label {
    flex-wrap: wrap;
    gap: 8px;
  }

  .completed-label-left {
    flex-wrap: wrap;
  }

  .completed-label-right {
    margin-left: auto;
  }

  .clear-btn {
    padding: 6px 12px;
  }

  .batch-delete-btn {
    padding: 6px 12px;
  }
}

@media (min-width: 769px) {
  .mobile-header {
    display: none;
  }

  .filter-scroll-container {
    display: none;
  }
}
</style>