<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, InfoFilled } from '@element-plus/icons-vue'
import { useTaskStore } from '../stores/task'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()

const taskId = computed(() => route.params.id)
const task = computed(() => taskStore.tasks.find(t => t.id === taskId.value))

const notes = ref('')
const isLoading = ref(true)

onMounted(() => {
  if (task.value) {
    notes.value = task.value.notes
  }
  isLoading.value = false
})

function goBack() {
  router.back()
}

function saveNotes() {
  if (task.value) {
    taskStore.updateTask(task.value.id, { notes: notes.value })
    ElMessage.success('备注已保存')
  }
}

function toggleComplete() {
  if (task.value) {
    taskStore.updateTask(task.value.id, { completed: !task.value.completed })
  }
}

const priorityLabelMap = { high: '高', medium: '中', low: '低' }

function formatDate(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="task-detail-page">
    <div class="detail-container">
      <!-- Header -->
      <div class="detail-header">
        <el-button type="primary" @click="goBack" plain>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h1>任务详情</h1>
      </div>

      <!-- Task Info Card -->
      <el-card v-if="!isLoading && task" class="task-info-card">
        <el-form label-width="100px" label-position="left">
          <el-form-item label="任务标题">
            <el-input :value="task.title" disabled style="width: 100%" />
          </el-form-item>

          <el-form-item label="截止日期">
            <el-input :value="formatDate(task.dueDate)" disabled style="width: 100%" />
          </el-form-item>

          <el-form-item label="优先级">
            <span :class="['priority-tag', `priority-${task.priority}`]">
              {{ priorityLabelMap[task.priority] }}
            </span>
          </el-form-item>

          <el-form-item label="完成状态">
            <el-switch
              v-model="task.completed"
              @change="toggleComplete"
              active-text="已完成"
              inactive-text="未完成"
            />
          </el-form-item>

          <el-form-item label="任务备注">
            <el-input
              v-model="notes"
              type="textarea"
              rows="6"
              placeholder="请输入任务的详细步骤或备注..."
              style="width: 100%"
            />
            <el-button type="primary" @click="saveNotes" style="margin-top: 12px">
              保存备注
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Loading -->
      <div v-if="isLoading" class="loading-container">
        <el-loading :fullscreen="true" text="加载中..." />
      </div>

      <!-- Task Not Found -->
      <div v-else-if="!task" class="not-found-container">
        <el-empty description="任务不存在" :image-size="120" />
        <el-button type="primary" @click="goBack" style="margin-top: 20px">
          返回任务列表
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-detail-page {
  min-height: 100vh;
  background: var(--color-background);
  padding: 24px;
}

.detail-container {
  max-width: 800px;
  margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.detail-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
}

.task-info-card {
  border-radius: 12px;
  overflow: hidden;
}

.priority-tag {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 14px;
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

.loading-container,
.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

@media (max-width: 768px) {
  .task-detail-page {
    padding: 16px;
  }

  .detail-container {
    max-width: 100%;
  }

  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>