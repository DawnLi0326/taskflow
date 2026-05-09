<script setup>import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, InfoFilled, Plus, Edit, Delete, Check } from '@element-plus/icons-vue';
import { useTaskStore } from '../stores/task';
const route = useRoute();
const router = useRouter();
const taskStore = useTaskStore();
const taskId = computed(() => route.params.id);
const task = computed(() => taskStore.tasks.find(t => t.id === taskId.value));
const notes = ref('');
const isLoading = ref(true);
const newSubtaskTitle = ref('');
const editingSubtaskId = ref(null);
const editingSubtaskTitle = ref('');
onMounted(() => {
 if (task.value) {
 notes.value = task.value.notes;
 }
 isLoading.value = false;
});
function goBack() {
 router.back();
}
function saveNotes() {
 if (task.value) {
 taskStore.updateTask(task.value.id, { notes: notes.value });
 ElMessage.success('备注已保存');
 }
}
function toggleComplete() {
 if (task.value) {
 taskStore.updateTask(task.value.id, { completed: !task.value.completed });
 }
}
function addSubtask() {
 if (!newSubtaskTitle.value.trim()) {
 ElMessage.warning('请输入子任务标题');
 return;
 }
 if (task.value) {
 taskStore.addSubtask(task.value.id, newSubtaskTitle.value);
 newSubtaskTitle.value = '';
 ElMessage.success('子任务已添加');
 }
}
function updateSubtaskCompletion(subtaskId, completed) {
 if (task.value) {
 taskStore.updateSubtask(task.value.id, subtaskId, { completed });
 }
}
function startEditSubtask(subtask) {
 editingSubtaskId.value = subtask.id;
 editingSubtaskTitle.value = subtask.title;
}
function saveSubtaskEdit(subtaskId) {
 if (!editingSubtaskTitle.value.trim()) {
 ElMessage.warning('子任务标题不能为空');
 return;
 }
 if (task.value) {
 taskStore.updateSubtask(task.value.id, subtaskId, { title: editingSubtaskTitle.value });
 editingSubtaskId.value = null;
 editingSubtaskTitle.value = '';
 }
}
function cancelEditSubtask() {
 editingSubtaskId.value = null;
 editingSubtaskTitle.value = '';
}
async function deleteSubtask(subtaskId, subtaskTitle) {
 try {
 await ElMessageBox.confirm(`确定要删除子任务"${subtaskTitle}"吗？`, '删除确认', {
 confirmButtonText: '删除',
 cancelButtonText: '取消',
 type: 'warning',
 });
 if (task.value) {
 taskStore.deleteSubtask(task.value.id, subtaskId);
 ElMessage.success('子任务已删除');
 }
 }
 catch {
 // cancelled
 }
}
const priorityLabelMap = { high: '高', medium: '中', low: '低' };
const subtaskProgress = computed(() => {
 if (!task.value || !task.value.subtasks || task.value.subtasks.length === 0) {
 return { completed: 0, total: 0, percentage: 0 };
 }
 const completed = task.value.subtasks.filter(st => st.completed).length;
 const total = task.value.subtasks.length;
 return {
 completed,
 total,
 percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
 };
});
function formatDate(date) {
 const d = new Date(date);
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
              rows="4"
              placeholder="请输入任务的详细步骤或备注..."
              style="width: 100%"
            />
            <el-button type="primary" @click="saveNotes" style="margin-top: 12px">
              保存备注
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- Subtasks Section -->
      <el-card v-if="!isLoading && task" class="subtasks-card">
        <div class="subtasks-header">
          <h3>
            <el-icon><InfoFilled /></el-icon>
            子任务清单
          </h3>
          <span v-if="subtaskProgress.total > 0" class="subtasks-progress-text">
            {{ subtaskProgress.completed }} / {{ subtaskProgress.total }} 已完成
          </span>
        </div>

        <!-- Add Subtask -->
        <div class="add-subtask-row">
          <el-input
            v-model="newSubtaskTitle"
            placeholder="输入子任务标题..."
            @keyup.enter="addSubtask"
            class="subtask-input"
          />
          <el-button type="primary" @click="addSubtask" class="add-subtask-btn">
            <el-icon><Plus /></el-icon>
            添加
          </el-button>
        </div>

        <!-- Subtasks List -->
        <div v-if="task.subtasks && task.subtasks.length > 0" class="subtasks-list">
          <div
            v-for="subtask in task.subtasks"
            :key="subtask.id"
            class="subtask-item"
          >
            <el-checkbox
              :model-value="subtask.completed"
              @change="(val) => updateSubtaskCompletion(subtask.id, val)"
              class="subtask-checkbox"
            />
            
            <!-- Edit Mode -->
            <div v-if="editingSubtaskId === subtask.id" class="subtask-edit-wrapper">
              <el-input
                v-model="editingSubtaskTitle"
                @keyup.enter="saveSubtaskEdit(subtask.id)"
                @keyup.esc="cancelEditSubtask"
                class="subtask-edit-input"
                autofocus
              />
              <el-button
                icon="Check"
                size="small"
                @click="saveSubtaskEdit(subtask.id)"
                class="subtask-edit-save"
              />
              <el-button
                icon="X"
                size="small"
                @click="cancelEditSubtask"
                class="subtask-edit-cancel"
              />
            </div>
            
            <!-- View Mode -->
            <div v-else class="subtask-content">
              <span :class="['subtask-title', { completed: subtask.completed }]">
                {{ subtask.title }}
              </span>
              <div class="subtask-actions">
                <el-button
                  link
                  size="small"
                  @click="startEditSubtask(subtask)"
                  title="编辑"
                  class="subtask-action-btn"
                >
                  <el-icon size="14"><Edit /></el-icon>
                </el-button>
                <el-button
                  link
                  size="small"
                  type="danger"
                  @click="deleteSubtask(subtask.id, subtask.title)"
                  title="删除"
                  class="subtask-action-btn"
                >
                  <el-icon size="14"><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Subtasks -->
        <div v-else class="empty-subtasks">
          <el-empty description="暂无子任务" :image-size="60" />
          <p class="empty-hint">添加子任务来分解您的任务</p>
        </div>
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

.task-info-card,
.subtasks-card {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
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

/* Subtasks Styles */
.subtasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.subtasks-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtasks-progress-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.add-subtask-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.subtask-input {
  flex: 1;
}

.add-subtask-btn {
  white-space: nowrap;
}

.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.subtask-item:hover {
  background: var(--color-bg-hover);
}

.subtask-checkbox {
  flex-shrink: 0;
}

.subtask-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subtask-title {
  flex: 1;
  font-size: 14px;
  color: var(--color-text);
  transition: all var(--transition-fast);
}

.subtask-title.completed {
  color: var(--color-text-secondary);
  text-decoration: line-through;
}

.subtask-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.subtask-item:hover .subtask-actions {
  opacity: 1;
}

.subtask-action-btn {
  padding: 4px;
}

.subtask-edit-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtask-edit-input {
  flex: 1;
}

.subtask-edit-save,
.subtask-edit-cancel {
  padding: 4px 8px;
}

.empty-subtasks {
  text-align: center;
  padding: 40px 20px;
}

.empty-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: 8px;
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

  .add-subtask-row {
    flex-direction: column;
  }

  .subtask-item {
    padding: 10px 12px;
  }

  .subtask-actions {
    opacity: 1;
  }

  .subtask-action-btn {
    padding: 6px;
  }
}
</style>
