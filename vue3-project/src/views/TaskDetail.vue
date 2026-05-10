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
      <div v-if="!isLoading && task" class="subtasks-section">
        <!-- Header -->
        <div class="subtasks-header">
          <div class="header-left">
            <span class="header-icon">📋</span>
            <span class="header-title">子任务清单</span>
          </div>
          <div class="header-right">
            <span v-if="subtaskProgress.total > 0" class="progress-text">
              已完成 {{ subtaskProgress.completed }} / 共 {{ subtaskProgress.total }}
            </span>
          </div>
        </div>

        <!-- Subtasks List -->
        <div v-if="task.subtasks && task.subtasks.length > 0" class="subtasks-list">
          <div
            v-for="subtask in task.subtasks"
            :key="subtask.id"
            :class="['subtask-item', { completed: subtask.completed }]"
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
              <span
                :class="['subtask-title', { completed: subtask.completed }]"
                @dblclick="startEditSubtask(subtask)"
              >
                {{ subtask.title }}
              </span>
              <div class="subtask-actions">
                <el-button
                  link
                  size="small"
                  @click="startEditSubtask(subtask)"
                  title="编辑"
                  class="subtask-action-btn edit-btn"
                >
                  <el-icon size="16"><Edit /></el-icon>
                </el-button>
                <el-button
                  link
                  size="small"
                  type="danger"
                  @click="deleteSubtask(subtask.id, subtask.title)"
                  title="删除"
                  class="subtask-action-btn delete-btn"
                >
                  <el-icon size="16"><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Subtasks -->
        <div v-else class="empty-subtasks">
          <div class="empty-container">
            <span class="empty-icon">📝</span>
            <p class="empty-title">暂无子任务</p>
            <p class="empty-hint">点击下方输入框创建您的第一个子任务</p>
          </div>
        </div>

        <!-- Add Subtask -->
        <div class="add-subtask-row">
          <el-input
            v-model="newSubtaskTitle"
            placeholder="+ 添加子任务"
            @keyup.enter="addSubtask"
            class="subtask-input"
          />
          <el-button type="primary" @click="addSubtask" class="add-subtask-btn">
            添加
          </el-button>
        </div>
      </div>

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
  max-height: 100vh;
  overflow-y: auto;
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

/* Subtasks Section */
.subtasks-section {
  background: var(--el-bg-color);
  border-radius: 20px;
  padding: 24px;
  box-shadow: var(--el-box-shadow-light);
  margin-bottom: 20px;
}

/* Header */
.subtasks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 20px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-right {
  display: flex;
  align-items: center;
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

/* Add Subtask */
.add-subtask-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.subtask-input {
  flex: 1;
}

.subtask-input :deep(.el-input__wrapper) {
  border-radius: 30px;
  background: var(--el-fill-color-light);
  border: 2px solid transparent;
  padding: 12px 18px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.subtask-input :deep(.el-input__wrapper:hover) {
  border-color: rgba(64, 158, 255, 0.3);
}

.subtask-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.subtask-input :deep(.el-input__inner) {
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.subtask-input :deep(.el-input__placeholder) {
  color: var(--el-text-color-placeholder);
}

.add-subtask-btn {
  border-radius: 30px;
  padding: 8px 24px;
  background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
  border: none;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.add-subtask-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.add-subtask-btn:active {
  transform: translateY(0);
}

/* Subtasks List */
.subtasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
  margin-bottom: 16px;
}

.subtasks-list::-webkit-scrollbar {
  width: 6px;
}

.subtasks-list::-webkit-scrollbar-track {
  background: var(--el-fill-color-light);
  border-radius: 3px;
}

.subtasks-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.subtasks-list::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-placeholder);
}

/* Subtask Item */
.subtask-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: transparent;
  border-radius: 0;
  border-bottom: 1px solid var(--el-border-color-light);
  transition: all 0.2s ease;
}

.subtask-item:last-child {
  border-bottom: none;
}

.subtask-item:hover {
  background: var(--el-fill-color-light);
}

.subtask-item.completed {
  background: transparent;
}

/* Checkbox */
.subtask-checkbox {
  flex-shrink: 0;
  transform: scale(1.2);
}

.subtask-checkbox :deep(.el-checkbox__inner) {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border-color: var(--el-border-color);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.subtask-checkbox :deep(.el-checkbox__inner:hover) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.subtask-checkbox :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background: var(--el-color-success);
  border-color: var(--el-color-success);
  animation: checkPulse 0.3s ease-out;
}

@keyframes checkPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

/* Content */
.subtask-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.subtask-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  line-height: 1.5;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.subtask-title:hover {
  color: var(--el-color-primary);
}

.subtask-title.completed {
  color: var(--el-text-color-placeholder);
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  text-decoration-color: var(--el-color-success);
}

/* Actions */
.subtask-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  transition: all 0.2s ease;
}

.subtask-item:hover .subtask-actions {
  opacity: 1;
}

.subtask-action-btn {
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.subtask-action-btn:hover {
  background: var(--el-fill-color-light);
}

.subtask-action-btn.delete-btn:hover {
  background: rgba(245, 108, 108, 0.1);
}

/* Edit Mode */
.subtask-edit-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.subtask-edit-input {
  flex: 1;
}

.subtask-edit-input :deep(.el-input__wrapper) {
  border-radius: 12px;
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.1);
}

.subtask-edit-save,
.subtask-edit-cancel {
  padding: 8px 14px;
  border-radius: 10px;
}

/* Empty State */
.empty-subtasks {
  padding: 40px 20px;
}

.empty-container {
  text-align: center;
  padding: 32px;
  border: 2px dashed var(--el-border-color-light);
  border-radius: 16px;
  background: var(--el-fill-color-light);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: var(--el-text-color-placeholder);
}



/* 添加子任务动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.subtask-item {
  animation: slideIn 0.3s ease-out;
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

  .subtasks-section {
    padding: 16px;
    border-radius: 16px;
  }

  .subtasks-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-left {
    flex-wrap: wrap;
  }

  .header-title {
    font-size: 16px;
  }

  .circle-progress {
    display: none;
  }

  .add-subtask-row {
    flex-direction: column;
    gap: 10px;
  }

  .subtask-input :deep(.el-input__wrapper) {
    padding: 14px 16px;
  }

  .add-subtask-btn {
    padding: 12px 24px;
    font-size: 15px;
  }

  .subtasks-list {
    max-height: 300px;
    gap: 10px;
  }

  .subtask-item {
    padding: 14px 16px;
    gap: 12px;
  }

  .subtask-checkbox {
    transform: scale(1.3);
  }

  .subtask-title {
    font-size: 15px;
  }

  .subtask-actions {
    opacity: 1;
    transform: none;
  }

  .subtask-action-btn {
    padding: 10px;
  }

  .empty-container {
    padding: 24px 16px;
  }

  .empty-icon {
    font-size: 40px;
  }
}
</style>
