<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/task'
import { ElMessage } from 'element-plus'
import {
  Plus, TrendCharts, DataAnalysis, Odometer,
  Warning, Clock, Calendar, CircleCheck, List, Check
} from '@element-plus/icons-vue'

const router = useRouter()
const taskStore = useTaskStore()

const today = computed(() => {
  const d = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})

const stats = computed(() => [
  {
    label: '总任务',
    value: taskStore.totalCount,
    icon: List,
    gradient: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
    iconBg: 'rgba(255,255,255,0.2)',
  },
  {
    label: '已完成',
    value: taskStore.completedCount,
    icon: CircleCheck,
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    iconBg: 'rgba(255,255,255,0.2)',
  },
  {
    label: '未完成',
    value: taskStore.incompleteCount,
    icon: Clock,
    gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
    iconBg: 'rgba(255,255,255,0.2)',
  },
  {
    label: '今日到期',
    value: taskStore.todayDueCount,
    icon: Calendar,
    gradient: 'linear-gradient(135deg, #ef4444, #f87171)',
    iconBg: 'rgba(255,255,255,0.2)',
  },
])

const priorityDist = computed(() => taskStore.incompletePriorityDistribution)
const incompleteTotal = computed(() => taskStore.incompleteCount)

function priorityPct(count) {
  if (incompleteTotal.value === 0) return 0
  return Math.round((count / incompleteTotal.value) * 100)
}

const todayProgress = computed(() => taskStore.todayProgress)
const overdueTasks = computed(() => taskStore.overdueTasks)
const recentTasks = computed(() => taskStore.recentIncompleteTasks)
const upcomingTasks = computed(() => taskStore.upcomingTasks)

function overduedays(dueDate) {
  const due = new Date(dueDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.floor((now.getTime() - due.getTime()) / 86400000)
  return diff
}

function completeTask(id) {
  taskStore.updateTask(id, { completed: true })
  ElMessage.success('任务已完成!')
}

function goToTasks(filter) {
  router.push(filter ? `/tasks?filter=${filter}` : '/tasks')
}

function goToStatistics() {
  router.push('/statistics')
}

function formatDate(date) {
  const d = new Date(date)
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${m}月${day}日`
}

const priorityLabelMap = { high: '高', medium: '中', low: '低' }
</script>

<template>
  <div class="dashboard" v-if="true">
    <!-- Welcome Header -->
    <div class="welcome-header">

      <div class="welcome-text">
        <h1>欢迎回来 👋</h1>
        <p class="date-text">{{ today }}</p>
        <p v-if="taskStore.todayDueCount > 0" class="due-hint">
          今天有 <strong>{{ taskStore.todayDueCount }}</strong> 个任务到期
        </p>
        <p v-else class="due-hint no-due">今天没有到期任务，保持节奏！</p>
      </div>
      <div class="quick-actions">
        <el-button type="primary" @click="goToTasks('new')" round>
          <el-icon><Plus /></el-icon> 添加任务
        </el-button>
        <el-button @click="goToStatistics" round>
          <el-icon><TrendCharts /></el-icon> 查看统计
        </el-button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="stat-card"
        :style="{ background: stat.gradient }"
      >
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
        <div class="stat-icon-wrap" :style="{ background: stat.iconBg }">
          <el-icon size="24" color="rgba(255,255,255,0.9)">
            <component :is="stat.icon" />
          </el-icon>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- Priority Distribution -->
      <div class="card">
        <h3 class="card-title">
          <el-icon><DataAnalysis /></el-icon> 优先级分布
          <span class="card-subtitle">（未完成任务）</span>
        </h3>
        <div v-if="incompleteTotal > 0" class="priority-bars">
          <div class="priority-row">
            <span class="priority-label-text">
              <span class="dot dot-high"></span>高优先级
            </span>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar-fill high"
                :style="{ width: priorityPct(priorityDist.high) + '%' }"
              />
            </div>
            <span class="priority-count">{{ priorityDist.high }}
              <small>({{ priorityPct(priorityDist.high) }}%)</small>
            </span>
          </div>
          <div class="priority-row">
            <span class="priority-label-text">
              <span class="dot dot-medium"></span>中优先级
            </span>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar-fill medium"
                :style="{ width: priorityPct(priorityDist.medium) + '%' }"
              />
            </div>
            <span class="priority-count">{{ priorityDist.medium }}
              <small>({{ priorityPct(priorityDist.medium) }}%)</small>
            </span>
          </div>
          <div class="priority-row">
            <span class="priority-label-text">
              <span class="dot dot-low"></span>低优先级
            </span>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar-fill low"
                :style="{ width: priorityPct(priorityDist.low) + '%' }"
              />
            </div>
            <span class="priority-count">{{ priorityDist.low }}
              <small>({{ priorityPct(priorityDist.low) }}%)</small>
            </span>
          </div>
        </div>
        <div v-else class="empty-state">
          <el-icon size="32" color="var(--color-text-muted)"><CircleCheck /></el-icon>
          <p>所有任务已完成！</p>
        </div>
      </div>

      <!-- Today's Progress -->
      <div class="card today-progress-card">
        <h3 class="card-title">
          <el-icon><Odometer /></el-icon> 今日任务进度
        </h3>
        <div class="progress-content">
          <div class="progress-ring-container">
            <svg viewBox="0 0 120 120" class="ring-svg">
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke="var(--color-border)"
                stroke-width="10"
              />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                :stroke="todayProgress >= 100 ? '#10b981' : '#2563eb'"
                stroke-width="10"
                stroke-linecap="round"
                stroke-dasharray="314.16"
                :stroke-dashoffset="314.16 * (1 - todayProgress / 100)"
                transform="rotate(-90 60 60)"
                style="transition: stroke-dashoffset 0.8s ease"
              />
            </svg>
          </div>
          <div class="today-stats">
            <div class="today-stat">
              <span class="ts-num">{{ todayProgress }}%</span>
              <span class="ts-label">完成率</span>
            </div>
            <div class="today-stat">
              <span class="ts-num">{{ taskStore.todayDueTasks.filter(t => t.completed).length }}</span>
              <span class="ts-label">已完成</span>
            </div>
            <div class="today-stat">
              <span class="ts-num">{{ taskStore.todayDueTasks.filter(t => !t.completed).length }}</span>
              <span class="ts-label">未完成</span>
            </div>
          </div>
        </div>
        <p v-if="taskStore.todayDueCount === 0" class="empty-hint">今天没有到期任务</p>
      </div>
    </div>

    <!-- Overdue Tasks -->
    <div v-if="overdueTasks.length > 0" class="overdue-section">
      <div class="section-header">
        <h3 class="section-title overdue-title">
          <el-icon><Warning /></el-icon>
          逾期任务
          <el-tag type="danger" size="small" round>{{ overdueTasks.length }}</el-tag>
        </h3>
      </div>
      <div class="overdue-list">
        <div
          v-for="task in overdueTasks"
          :key="task.id"
          class="overdue-card"
        >
          <div class="overdue-info">
            <span class="overdue-title-text">{{ task.title }}</span>
            <div class="overdue-meta">
              <el-tag type="danger" size="small" round>逾期 {{ overduedays(task.dueDate) }} 天</el-tag>
              <span :class="['priority-tag', `priority-${task.priority}`]">
                {{ priorityLabelMap[task.priority] }}优先级
              </span>
            </div>
          </div>
          <el-button
            type="success"
            size="small"
            round
            @click="completeTask(task.id)"
          >
            <el-icon><Check /></el-icon> 完成
          </el-button>
        </div>
      </div>
    </div>

    <div class="bottom-grid">
      <!-- Recent Incomplete Tasks -->
      <div class="card">
        <div class="section-header-row">
          <h3 class="card-title">
            <el-icon><Clock /></el-icon> 最近未完成任务
          </h3>
          <el-button link @click="goToTasks()" size="small">查看全部</el-button>
        </div>
        <div v-if="recentTasks.length > 0" class="task-list">
          <div
            v-for="task in recentTasks"
            :key="task.id"
            class="task-item"
          >
            <div class="task-item-info">
              <span class="task-item-title">{{ task.title }}</span>
              <span class="task-item-date">{{ formatDate(task.dueDate) }}</span>
            </div>
            <span :class="['priority-tag', `priority-${task.priority}`]">
              {{ priorityLabelMap[task.priority] }}
            </span>
          </div>
        </div>
        <div v-else class="empty-state">
          <el-icon size="28" color="var(--color-text-muted)"><CircleCheck /></el-icon>
          <p>没有未完成任务</p>
        </div>
      </div>

      <!-- Upcoming Tasks -->
      <div class="card">
        <div class="section-header-row">
          <h3 class="card-title">
            <el-icon><Calendar /></el-icon> 即将到来任务
            <span class="card-subtitle">（未来3天）</span>
          </h3>
          <el-button link @click="goToTasks()" size="small">查看全部</el-button>
        </div>
        <div v-if="upcomingTasks.length > 0" class="task-list">
          <div
            v-for="task in upcomingTasks"
            :key="task.id"
            class="task-item"
          >
            <div class="task-item-info">
              <span class="task-item-title">{{ task.title }}</span>
              <span class="task-item-date">{{ formatDate(task.dueDate) }}</span>
            </div>
            <span :class="['priority-tag', `priority-${task.priority}`]">
              {{ priorityLabelMap[task.priority] }}
            </span>
          </div>
        </div>
        <div v-else class="empty-state">
          <el-icon size="28" color="var(--color-text-muted)"><Calendar /></el-icon>
          <p>未来3天没有到期任务</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Welcome */
.welcome-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 16px;
}

.welcome-text h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.date-text {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: 4px;
}

.due-hint {
  font-size: 14px;
  color: var(--color-warning);
}
.due-hint strong { font-weight: 600; }
.due-hint.no-due { color: var(--color-success); }

.quick-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.2);
}

.stat-content {
  color: #fff;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}

.card-subtitle {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-muted);
}

/* Priority bars */
.priority-bars {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.priority-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.priority-label-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
  width: 72px;
  flex-shrink: 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-high { background: #ef4444; }
.dot-medium { background: #f59e0b; }
.dot-low { background: #10b981; }

.progress-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.6s ease;
}
.progress-bar-fill.high { background: linear-gradient(90deg, #ef4444, #f87171); }
.progress-bar-fill.medium { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.progress-bar-fill.low { background: linear-gradient(90deg, #10b981, #34d399); }

.priority-count {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  width: 60px;
  text-align: right;
}
.priority-count small {
  font-size: 11px;
  font-weight: 400;
  color: var(--color-text-muted);
}

/* Today Progress */
.today-progress-card {}

.progress-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.progress-ring-container {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.ring-svg {
  width: 100%;
  height: 100%;
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ring-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.ring-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

.today-stats {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.today-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.ts-num {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
}

.ts-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.empty-hint {
  font-size: 13px;
  color: var(--color-text-muted);
  text-align: center;
  margin-top: 12px;
}

/* Overdue */
.overdue-section {
  margin-bottom: 24px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.overdue-title {
  color: var(--color-error);
}

.overdue-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overdue-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-error-light);
  border: 1px solid var(--color-error-border);
  border-radius: 10px;
  padding: 12px 16px;
  gap: 12px;
  transition: transform var(--transition-fast);
}

.overdue-card:hover {
  transform: translateX(2px);
}

.overdue-info {
  flex: 1;
  min-width: 0;
}

.overdue-title-text {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overdue-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Bottom Grid */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header-row .card-title {
  margin-bottom: 0;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--color-surface-2);
  border-radius: 8px;
  border: 1px solid var(--color-border-light);
  gap: 10px;
  transition: background var(--transition-fast);
}

.task-item:hover {
  background: var(--color-border);
}

.task-item-info {
  flex: 1;
  min-width: 0;
}

.task-item-title {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.task-item-date {
  font-size: 12px;
  color: var(--color-text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;
  color: var(--color-text-muted);
  font-size: 13px;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard {
    padding: 16px;
  }

  .welcome-header {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .dashboard-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>