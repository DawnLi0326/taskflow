<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled, Plus, Sort, Rank, Calendar, Edit, Delete, DeleteFilled, More } from '@element-plus/icons-vue'
import { useTaskStore } from '../stores/task'
import { useSettingsStore } from '../stores/settings'
import { FILTER_STATUS, SORT_ORDER, PRIORITY_LABELS } from '../constants'
import { formatDate, getTodayStr } from '../utils/date'

// Store and route
const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()

// State
const hoveredTaskId = ref(null)
const dialogVisible = ref(false)
const editingTask = ref(null)
const form = ref({ title: '', dueDate: '', priority: 'medium', tags: [], completed: false })
const formRef = ref()
const filterStatus = ref(FILTER_STATUS.ALL)
const searchQuery = ref('')
const selectedTags = ref([])
const selectedIds = ref([])
const isMobile = ref(window.innerWidth < 768)
const activeMenuId = ref(null)
const activeMenuPosition = ref({ top: 0, right: 16 })

// Computed
const today = computed(() => getTodayStr())

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

const allTags = computed(() => {
  const tagSet = new Set()
  taskStore.tasks.forEach(task => {
    if (task.tags && Array.isArray(task.tags)) {
      task.tags.forEach(tag => tagSet.add(tag.trim()))
    }
  })
  return Array.from(tagSet).sort()
})

const filteredTasks = computed(() => {
  let list = sortedTasks.value
  const q = searchQuery.value.trim().toLowerCase()
  
  // 搜索筛选
  if (q) {
    list = list.filter(t => t.title.toLowerCase().includes(q))
  }

  // 标签筛选（同时包含所有选中标签）
  if (selectedTags.value.length > 0) {
    list = list.filter(task => {
      const taskTags = task.tags || []
      return selectedTags.value.every(tag => taskTags.includes(tag))
    })
  }

  // 状态筛选
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
  form.value = { title: '', dueDate: today.value, priority: 'medium', tags: [], completed: false }
  dialogVisible.value = true
}

function openEditDialog(task) {
  editingTask.value = task
  form.value = { 
    title: task.title, 
    dueDate: task.dueDate, 
    priority: task.priority, 
    tags: task.tags || [],
    completed: task.completed 
  }
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

function getTagType(index) {
  const types = ['primary', 'success', 'warning', 'info', 'danger']
  return types[index % types.length]
}

function getSubtaskProgress(task) {
  if (!task.subtasks || task.subtasks.length === 0) return 0
  const completed = task.subtasks.filter(st => st.completed).length
  return Math.round((completed / task.subtasks.length) * 100)
}

function getSubtaskCompleted(task) {
  if (!task.subtasks || task.subtasks.length === 0) return 0
  return task.subtasks.filter(st => st.completed).length
}

watch(form, (newForm) => {
  if (newForm.tags && newForm.tags.length > 5) {
    newForm.tags = newForm.tags.slice(0, 5)
    ElMessage.warning('最多只能添加5个标签')
  }
}, { deep: true })

function isOverdue(task) {
  return !task.completed && task.dueDate < today.value
}

function goToDetail(id) {
  router.push(`/task/${id}`)
}

function toggleMobileMenu(taskId, event) {
  if (activeMenuId.value === taskId) {
    activeMenuId.value = null
  } else {
    activeMenuId.value = taskId
    const btn = event.currentTarget
    const rect = btn.getBoundingClientRect()
    activeMenuPosition.value = {
      top: rect.bottom,
      right: window.innerWidth - rect.right
    }
  }
}

function closeMobileMenu() {
  activeMenuId.value = null
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
      <div class="page-header">
        <div class="header-left">
          <h2>任务列表</h2>
        </div>
        <el-button type="primary" @click="openAddDialog" round>
          <el-icon><Plus /></el-icon> 添加新任务
        </el-button>
      </div>

      <!-- Filters -->
      <div class="filters-row">
        <div class="filter-controls">
          <el-input
            v-model="searchQuery"
            placeholder="搜索任务..."
            clearable
            class="search-input"
            prefix-icon="Search"
          />
          <el-radio-group v-model="filterStatus">
            <el-radio-button value="all">全部 ({{ taskStore.totalCount }})</el-radio-button>
            <el-radio-button value="incomplete">未完成 ({{ taskStore.incompleteCount }})</el-radio-button>
            <el-radio-button value="completed">已完成 ({{ taskStore.completedCount }})</el-radio-button>
            <el-radio-button value="overdue">逾期 ({{ taskStore.overdueTasks.length }})</el-radio-button>
          </el-radio-group>
          <el-select 
            v-model="selectedTags" 
            placeholder="筛选标签" 
            size="small" 
            class="tag-select"
            multiple
            collapse-tags
          >
            <el-option 
              v-for="tag in allTags" 
              :key="tag" 
              :value="tag" 
              :label="tag" 
            />
          </el-select>
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
            <div class="task-card" :class="{ overdue: isOverdue(element) }">
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
                <!-- Tags -->
                <div class="task-card-tags" v-if="element.tags && element.tags.length > 0">
                  <el-tag 
                    v-for="(tag, idx) in element.tags.slice(0, 3)" 
                    :key="tag" 
                    size="small" 
                    effect="plain"
                    :type="getTagType(idx)"
                  >
                    {{ tag }}
                  </el-tag>
                  <span v-if="element.tags.length > 3" class="more-tags">
                    ...+{{ element.tags.length - 3 }}
                  </span>
                </div>
                <!-- Subtask Progress -->
                <div class="task-card-subtasks" v-if="element.subtasks && element.subtasks.length > 0">
                  <div class="subtask-progress-wrapper">
                    <el-progress
                      type="line"
                      :percentage="getSubtaskProgress(element)"
                      :stroke-width="6"
                      :show-text="false"
                      class="subtask-progress"
                    />
                    <span class="subtask-count">
                      {{ getSubtaskCompleted(element) }}/{{ element.subtasks.length }}
                    </span>
                  </div>
                </div>
                <div class="task-card-meta">
                  <el-icon size="12"><Calendar /></el-icon>
                  <span :class="isOverdue(element) ? 'overdue-date' : ''">
                    {{ formatDate(element.dueDate) }}
                  </span>
                  <el-tag type="danger" size="small" v-if="isOverdue(element)">逾期</el-tag>
                </div>
              </div>
              <span :class="['priority-tag', `priority-${element.priority}`]">
                {{ PRIORITY_LABELS[element.priority] }}
              </span>
              
              <!-- PC端：始终显示操作按钮 -->
              <div class="task-actions desktop-actions">
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
              
              <!-- 移动端：更多按钮 -->
              <div class="mobile-menu-container">
                <el-button
                  link
                  size="small"
                  class="mobile-more-btn"
                  @click.stop="toggleMobileMenu(element.id, $event)"
                  title="更多"
                >
                  <el-icon size="16"><More /></el-icon>
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
            全选
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
          >
            <el-icon><DeleteFilled /></el-icon>
            清除全部已完成
          </el-button>
        </div>
      </div>

      <div v-if="completedTasks.length > 0" class="completed-list">
        <div
          v-for="task in completedTasks"
          :key="task.id"
          class="task-card completed-card"
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
            <!-- Tags -->
            <div class="task-card-tags" v-if="task.tags && task.tags.length > 0">
              <el-tag 
                v-for="(tag, idx) in task.tags.slice(0, 3)" 
                :key="tag" 
                size="small" 
                effect="plain"
                :type="getTagType(idx)"
              >
                {{ tag }}
              </el-tag>
              <span v-if="task.tags.length > 3" class="more-tags">
                ...+{{ task.tags.length - 3 }}
              </span>
            </div>
            <!-- Subtask Progress -->
            <div class="task-card-subtasks" v-if="task.subtasks && task.subtasks.length > 0">
              <div class="subtask-progress-wrapper">
                <el-progress
                  type="line"
                  :percentage="getSubtaskProgress(task)"
                  :stroke-width="6"
                  :show-text="false"
                  class="subtask-progress"
                />
                <span class="subtask-count">
                  {{ getSubtaskCompleted(task) }}/{{ task.subtasks.length }}
                </span>
              </div>
            </div>
            <div class="task-card-meta">
              <el-icon size="12"><Calendar /></el-icon>
              <span>{{ formatDate(task.dueDate) }}</span>
            </div>
          </div>
          <span :class="['priority-tag', `priority-${task.priority}`]">
            {{ PRIORITY_LABELS[task.priority] }}
          </span>
          
          <!-- PC端：始终显示操作按钮 -->
          <div class="task-actions completed-actions desktop-actions">
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
          
          <!-- 移动端：更多按钮 -->
          <div class="mobile-menu-container">
            <el-button
              link
              size="small"
              class="mobile-more-btn"
              @click.stop="toggleMobileMenu(task.id, $event)"
              title="更多"
            >
              <el-icon size="16"><More /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      <div v-else class="empty-section">
        <el-empty description="暂无已完成任务" :image-size="60" />
      </div>
    </div>

    <!-- 移动端全局菜单 -->
    <Teleport to="body">
      <div
        v-if="activeMenuId"
        class="mobile-menu-overlay"
        @click="closeMobileMenu"
      >
        <div
          class="mobile-menu"
          :style="{
            top: activeMenuPosition.top + 'px',
            right: activeMenuPosition.right + 'px'
          }"
          @click.stop
        >
          <div
            v-for="task in taskStore.tasks"
            :key="task.id"
            v-show="task.id === activeMenuId"
          >
            <div class="mobile-menu-item" @click="goToDetail(task.id); closeMobileMenu()">
              <el-icon size="14"><InfoFilled /></el-icon>
              <span>详情</span>
            </div>
            <div class="mobile-menu-item" @click="openEditDialog(task); closeMobileMenu()">
              <el-icon size="14"><Edit /></el-icon>
              <span>编辑</span>
            </div>
            <div class="mobile-menu-item mobile-menu-item-danger" @click="deleteTask(task.id, task.title); closeMobileMenu()">
              <el-icon size="14"><Delete /></el-icon>
              <span>删除</span>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

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
        <el-form-item label="标签">
          <div class="tag-input-wrapper">
            <el-select
              v-model="form.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="输入标签后按回车或逗号创建"
              style="width: 100%"
            >
              <el-option
                v-for="tag in allTags"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
            <span class="tag-hint">输入标签后按回车或逗号创建，最多5个标签</span>
          </div>
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

.filters-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: space-between;
}

.filters-row > div {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sort-select {
  min-width: 120px;
}

.search-input {
  width: 240px;
}

.section-block {
  margin-bottom: 24px;
  border-radius: 10px;
  overflow: hidden;
}

.incomplete-section {
  background: #ffffff;
  border: 1px solid var(--color-border);
  padding: 16px;
}

.completed-section {
  background: #f8f9fa;
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

.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin-bottom: 8px;
  transition: all var(--transition-fast);
  position: relative;
}

.task-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-light);
  background: #f8f9fa;
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
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: color var(--transition-fast);
}

.drag-handle:hover { color: var(--color-text-secondary); }
.drag-handle:active { cursor: grabbing; }

.task-checkbox {
  flex-shrink: 0;
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
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-card-title.is-completed {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.task-card-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.overdue-date {
  color: var(--color-error);
  font-weight: 500;
}

.task-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mobile-menu-container {
  position: relative;
  display: none;
  z-index: 10;
}

.mobile-more-btn {
  padding: 4px;
  color: var(--color-text-muted);
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background: transparent;
}

.mobile-menu {
  position: fixed;
  top: 0;
  right: 16px;
  margin-top: 4px;
  background: var(--color-surface);
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-border);
  min-width: 110px;
  z-index: 9999;
  overflow: hidden;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-menu-item:hover {
  background: var(--color-surface-2);
}

.mobile-menu-item-danger {
  color: var(--color-error);
}

.mobile-menu-item-danger:hover {
  background: rgba(239, 68, 68, 0.15);
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



.priority-tag {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
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

@media (max-width: 768px) {
  .task-list-page {
    padding: 16px;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filters-row > div {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .incomplete-section,
  .completed-section {
    padding: 12px;
  }

  .desktop-actions {
    display: none !important;
  }

  .mobile-menu-container {
    display: block;
  }
}
</style>