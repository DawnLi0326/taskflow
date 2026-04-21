<template>
  <div class="dashboard-container">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1>欢迎回来，用户！</h1>
        <p class="current-date">{{ currentDate }}</p>
        <p class="deadline-tip" :class="{ 'no-deadline': todayTasksCount === 0 }">
          {{ todayTasksCount > 0 ? `今天有 ${todayTasksCount} 个任务即将到期，加油！` : '今天没有到期任务，真棒！' }}
        </p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-section">
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon total">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stats-info">
              <p class="stats-label">总任务数</p>
              <p class="stats-number">{{ totalTasksCount }}</p>
              <p class="stats-tip">包含已完成和未完成</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon completed">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stats-info">
              <p class="stats-label">已完成</p>
              <p class="stats-number">{{ completedTasksCount }}</p>
              <p class="stats-tip">完成率 {{ completionRate }}%</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stats-info">
              <p class="stats-label">未完成</p>
              <p class="stats-number">{{ pendingTasksCount }}</p>
              <p class="stats-tip">剩余任务</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6" :lg="6" :xl="6">
        <el-card class="stats-card" shadow="hover">
          <div class="stats-content">
            <div class="stats-icon today">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stats-info">
              <p class="stats-label">今日到期</p>
              <p class="stats-number">{{ todayTasksCount }}</p>
              <p class="stats-tip">需优先处理</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 优先级分布和今日进度 -->
    <el-row :gutter="20" class="progress-section">
      <el-col :xs="24" :md="12">
        <el-card class="progress-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h2>任务优先级分布</h2>
            </div>
          </template>
          <div class="priority-distribution">
            <div v-for="(item, index) in priorityDistribution" :key="index" class="priority-item">
              <div class="priority-info">
                <span class="priority-label">{{ item.label }}</span>
                <span class="priority-count">{{ item.count }} ({{ item.percentage }}%)</span>
              </div>
              <el-progress 
                :percentage="item.percentage" 
                :color="getPriorityColor(item.type)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card class="progress-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h2>今日任务进度</h2>
            </div>
          </template>
          <div class="today-progress">
            <div v-if="todayTotalTasks > 0" class="progress-circle">
              <el-progress 
                type="circle" 
                :percentage="todayProgressPercentage" 
                :width="80"
                :stroke-width="8"
              />
            </div>
            <div v-else class="progress-circle">
              <el-progress 
                type="circle" 
                :percentage="0" 
                :width="80"
                :stroke-width="8"
                :color="'#909399'"
              />
            </div>
            <div class="progress-info">
              <p v-if="todayTotalTasks > 0" class="progress-text">已完成 {{ todayCompletedTasks }} / {{ todayTotalTasks }} 个今日任务</p>
              <p v-else class="progress-text no-tasks">今日无到期任务，轻松一天！</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 逾期任务 -->
    <el-row :gutter="20" v-if="overdueTasks.length > 0" class="overdue-section">
      <el-col :span="24">
        <el-card class="overdue-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h2>逾期任务</h2>
            </div>
          </template>
          <div class="tasks-list">
            <div v-for="task in overdueTasks" :key="task.id" class="task-item overdue-task">
              <div class="task-content">
                <h3 class="task-title high-priority">{{ task.title }}</h3>
                <div class="task-meta">
                  <el-tag type="danger" size="small" class="priority-tag">
                    已逾期 {{ getOverdueDays(task.dueDate) }} 天
                  </el-tag>
                  <el-tag
                    :type="getPriorityType(task.priority)"
                    size="small"
                    class="priority-tag"
                  >
                    {{ getPriorityText(task.priority) }}
                  </el-tag>
                  <span class="task-due-date">{{ task.dueDate }}</span>
                </div>
              </div>
              <el-button 
                type="success" 
                size="small" 
                circle 
                @click="quickCompleteTask(task)"
                class="quick-complete-btn"
              >
                <el-icon><Check /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近未完成任务和即将到来任务 -->
    <el-row :gutter="20" class="tasks-section">
      <el-col :xs="24" :md="16">
        <el-card class="recent-tasks-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h2>最近未完成任务</h2>
            </div>
          </template>
          <div v-if="recentTasks.length > 0" class="tasks-list">
            <div v-for="task in recentTasks" :key="task.id" class="task-item no-checkbox">
              <div class="task-content">
                <h3 :class="{ 'high-priority': task.priority === 'high' }" class="task-title">{{ task.title }}</h3>
                <div class="task-meta">
                  <el-tag v-if="isTaskOverdue(task)" type="danger" size="small" class="priority-tag">
                    已逾期
                  </el-tag>
                  <el-tag
                    :type="getPriorityType(task.priority)"
                    size="small"
                    class="priority-tag"
                  >
                    {{ getPriorityText(task.priority) }}
                  </el-tag>
                  <span class="task-due-date">{{ task.dueDate }}</span>
                </div>
              </div>
              <el-button 
                type="success" 
                size="small" 
                circle 
                @click="quickCompleteTask(task)"
                class="quick-complete-btn"
              >
                <el-icon><Check /></el-icon>
              </el-button>
            </div>
          </div>
          <div v-else class="empty-state">
            <el-empty description="暂无未完成任务" />
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card class="upcoming-tasks-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <h2>即将到来（未来3天）</h2>
            </div>
          </template>
          <div v-if="upcomingTasks.length > 0" class="tasks-list">
            <div v-for="task in upcomingTasks" :key="task.id" class="task-item">
              <div class="task-content">
                <h3 class="task-title">{{ task.title }}</h3>
                <div class="task-meta">
                  <el-tag
                    :type="getPriorityType(task.priority)"
                    size="small"
                    class="priority-tag"
                  >
                    {{ getPriorityText(task.priority) }}
                  </el-tag>
                  <span class="task-due-date">{{ getDaysUntil(task.dueDate) }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <el-empty description="暂无即将到来的任务" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作 -->
    <el-card class="quick-actions-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>快捷操作</h2>
        </div>
      </template>
      <div class="quick-actions">
        <el-button type="primary" size="large" @click="goToTasks" class="action-button add-task">
          <el-icon><Plus /></el-icon>
          添加新任务
        </el-button>
        <el-button type="success" size="large" @click="goToStats" class="action-button view-stats">
          <el-icon><DataAnalysis /></el-icon>
          查看数据统计
        </el-button>

      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '../stores/task'
import { ElMessage } from 'element-plus'
import { Document, Check, Clock, Timer, Plus, DataAnalysis } from '@element-plus/icons-vue'

const router = useRouter()
const taskStore = useTaskStore()

// 计算属性
const totalTasksCount = computed(() => taskStore.tasks.length)
const completedTasksCount = computed(() => taskStore.tasks.filter(task => task.completed).length)
const pendingTasksCount = computed(() => taskStore.tasks.filter(task => !task.completed).length)

// 完成率
const completionRate = computed(() => {
  if (totalTasksCount.value === 0) return 0
  return Math.round((completedTasksCount.value / totalTasksCount.value) * 100)
})

// 计算今日到期任务数
const todayTasksCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return taskStore.tasks.filter(task => {
    return task.dueDate === today && !task.completed
  }).length
})

// 最近未完成任务（按截止日期升序，取前5个）
const recentTasks = computed(() => {
  return taskStore.tasks
    .filter(task => !task.completed)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3)
})

// 逾期任务
const overdueTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return taskStore.tasks
    .filter(task => {
      return !task.completed && task.dueDate < today
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
})

// 优先级分布
const priorityDistribution = computed(() => {
  const pendingTasks = taskStore.tasks.filter(task => !task.completed)
  const totalPending = pendingTasks.length
  
  const highCount = pendingTasks.filter(task => task.priority === 'high').length
  const mediumCount = pendingTasks.filter(task => task.priority === 'medium').length
  const lowCount = pendingTasks.filter(task => task.priority === 'low').length
  
  return [
    {
      label: '高',
      type: 'high',
      count: highCount,
      percentage: totalPending > 0 ? Math.round((highCount / totalPending) * 100) : 0
    },
    {
      label: '中',
      type: 'medium',
      count: mediumCount,
      percentage: totalPending > 0 ? Math.round((mediumCount / totalPending) * 100) : 0
    },
    {
      label: '低',
      type: 'low',
      count: lowCount,
      percentage: totalPending > 0 ? Math.round((lowCount / totalPending) * 100) : 0
    }
  ]
})

// 今日任务进度
const todayTotalTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return taskStore.tasks.filter(task => task.dueDate === today).length
})

const todayCompletedTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return taskStore.tasks.filter(task => task.dueDate === today && task.completed).length
})

const todayProgressPercentage = computed(() => {
  if (todayTotalTasks.value === 0) return 0
  return Math.round((todayCompletedTasks.value / todayTotalTasks.value) * 100)
})

// 即将到来的任务（未来3天）
const upcomingTasks = computed(() => {
  const today = new Date()
  const threeDaysLater = new Date(today)
  threeDaysLater.setDate(today.getDate() + 3)
  
  const todayStr = today.toISOString().split('T')[0]
  const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0]
  
  return taskStore.tasks
    .filter(task => {
      return !task.completed && task.dueDate > todayStr && task.dueDate <= threeDaysLaterStr
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5)
})

// 当前日期
const currentDate = ref('')

// 优先级类型
const getPriorityType = (priority) => {
  switch (priority) {
    case 'high': return 'danger'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'info'
  }
}

// 优先级颜色
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return '#f56c6c'
    case 'medium': return '#e6a23c'
    case 'low': return '#67c23a'
    default: return '#909399'
  }
}

// 优先级文本
const getPriorityText = (priority) => {
  switch (priority) {
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return '未知'
  }
}

// 格式化日期为 MM-DD
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${month}-${day}`
}

// 计算距离今天的天数
const getDaysUntil = (dateStr) => {
  if (!dateStr) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(dateStr)
  targetDate.setHours(0, 0, 0, 0)
  const diffTime = targetDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return `还剩 ${diffDays} 天`
}

// 计算逾期天数
const getOverdueDays = (dateStr) => {
  if (!dateStr) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDate = new Date(dateStr)
  targetDate.setHours(0, 0, 0, 0)
  const diffTime = today - targetDate
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
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

// 快速完成任务
const quickCompleteTask = (task) => {
  task.completed = true
  taskStore.updateTask(task)
  ElMessage.success('任务已标记为完成')
}



// 跳转到任务列表
const goToTasks = () => {
  router.push('/tasks?showAddForm=true')
}

// 跳转到统计页面
const goToStats = () => {
  router.push('/statistics?showAnimation=true')
}

// 初始化
onMounted(() => {
  // 设置当前日期
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  currentDate.value = `${year}年${month}月${day}日`
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  min-height: 100vh;
  gap: 20px;
  display: flex;
  flex-direction: column;
}

.welcome-section {
  margin-bottom: 20px;
  padding: 30px;
  background: var(--el-card-bg-color, #ffffff);
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.welcome-content h1 {
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.current-date {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: var(--el-text-color-secondary, #606266);
}

.deadline-tip {
  margin: 0;
  font-size: 14px;
  color: var(--el-color-warning, #e6a23c);
  font-weight: 500;
}

.deadline-tip.no-deadline {
  color: var(--el-color-success, #67c23a);
}

.stats-section {
  margin-bottom: 20px;
}

.progress-section {
  margin-bottom: 20px;
}

.overdue-section {
  margin-bottom: 20px;
}

.tasks-section {
  margin-bottom: 20px;
}

.stats-card {
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}

.stats-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.progress-card {
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}

.progress-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.overdue-card {
  border-radius: 12px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
  border-left: 4px solid var(--el-color-danger, #f56c6c);
}

.overdue-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.stats-content {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 24px;
  color: white;
}

.stats-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-icon.completed {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stats-icon.pending {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stats-icon.today {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stats-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stats-label {
  margin: 0 0 5px 0;
  font-size: 14px;
  color: var(--el-text-color-secondary, #606266);
}

.stats-number {
  margin: 0 0 5px 0;
  font-size: 32px;
  font-weight: 700;
  color: var(--el-text-color-primary, #303133);
  line-height: 1.2;
}

.stats-tip {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary, #606266);
  font-weight: 400;
}
.recent-tasks-card,
.upcoming-tasks-card,
.quick-actions-card {
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 任务区域行布局 */
.tasks-section {
  margin-bottom: 20px;
}

/* 左侧最近未完成任务卡片 */
.recent-tasks-card .el-card__body {
  padding: 20px;
  max-height: 420px;
  overflow-y: auto;
}

/* 右侧即将到来卡片样式 */
.upcoming-tasks-card .el-card__body {
  padding: 20px;
}

/* 美化滚动条 */
.recent-tasks-card .el-card__body::-webkit-scrollbar {
  width: 6px;
}
.recent-tasks-card .el-card__body::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}
.recent-tasks-card .el-card__body::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}
.recent-tasks-card .el-card__body::-webkit-scrollbar-thumb:hover {
  background: #909399;
}
/* 深色模式适配 */
.dark .recent-tasks-card .el-card__body::-webkit-scrollbar-track {
  background: #2d2d2d;
}
.dark .recent-tasks-card .el-card__body::-webkit-scrollbar-thumb {
  background: #5a5e66;
}
.dark .recent-tasks-card .el-card__body::-webkit-scrollbar-thumb:hover {
  background: #7a7e8a;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
}

.tasks-list {
  padding: 10px 0;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid var(--el-border-color, #ebeef5);
  transition: background-color 0.2s ease;
}

.task-item:hover {
  background-color: var(--el-fill-color-light, #f5f7fa);
}

.task-item.no-checkbox {
  padding-left: 0;
}

.task-item.overdue-task {
  background-color: rgba(245, 108, 108, 0.05);
}

.task-item.overdue-task:hover {
  background-color: rgba(245, 108, 108, 0.1);
}

.task-item:last-child {
  border-bottom: none;
}

.task-checkbox {
  margin-right: 15px;
}

.task-content {
  flex: 1;
  margin-right: 10px;
}

.task-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary, #303133);
  transition: all 0.2s ease;
}

.task-title.high-priority {
  color: var(--el-color-danger, #f56c6c);
  font-weight: 600;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.priority-tag {
  margin-right: 10px;
}

.task-due-date {
  font-size: 14px;
  color: var(--el-text-color-secondary, #606266);
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.quick-actions {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  padding: 20px 0;
}

.action-button {
  flex: 1;
  min-width: 200px;
  height: 50px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

.add-task {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.view-stats {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  border: none;
}



.quick-complete-btn {
  flex-shrink: 0;
  margin-left: 10px;
  transition: all 0.2s ease;
}

.quick-complete-btn:hover {
  transform: scale(1.1);
}

/* 优先级分布样式 */
.priority-distribution {
  padding: 10px 0;
}

.priority-item {
  margin-bottom: 15px;
}

.priority-item:last-child {
  margin-bottom: 0;
}

.priority-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
}

.priority-label {
  font-weight: 500;
}

.priority-count {
  color: var(--el-text-color-secondary, #606266);
}

/* 今日进度样式 */
.today-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.progress-circle {
  margin-bottom: 20px;
}

.progress-info {
  text-align: center;
}

.progress-text {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-primary, #303133);
}

.progress-text.no-tasks {
  color: var(--el-color-success, #67c23a);
  font-weight: 500;
}
/* 强制左侧卡片滚动 */
.recent-tasks-card .el-card__body {
  overflow: visible !important;
  height: auto !important;
  padding: 0 !important;
}

.recent-tasks-card .tasks-list {
  max-height: 420px !important;
  overflow-y: auto !important;
  display: block !important;
  height: auto !important;
  padding: 10px 20px !important;
}

/* 确保右侧卡片不受影响 */
.upcoming-tasks-card .el-card__body {
  overflow: visible !important;
  height: auto !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 10px;
    gap: 10px;
  }
  
  .welcome-section {
    padding: 20px;
    margin-bottom: 10px;
  }
  
  .welcome-content h1 {
    font-size: 20px;
  }
  
  .stats-content {
    padding: 15px;
  }
  
  .stats-icon {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .stats-number {
    font-size: 28px;
  }
  
  .action-button {
    width: 100%;
    min-width: unset;
  }
  
  .priority-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .task-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .quick-complete-btn {
    margin-left: 0;
    margin-top: 10px;
  }
}
</style>