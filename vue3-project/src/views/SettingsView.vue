<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSettingsStore } from '../stores/settings'
import { useTaskStore } from '../stores/task'

const settingsStore = useSettingsStore()
const taskStore = useTaskStore()

const importMode = ref('merge')
const fileInputRef = ref()

function exportTasks() {
  const data = {
    tasks: taskStore.getTasksForStats(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tasks-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('任务数据已导出')
}

function triggerImport() {
  fileInputRef.value?.click()
}

function handleFileImport(event) {
  const input = event.target
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const content = e.target?.result
      const parsed = JSON.parse(content)
      const tasks = parsed.tasks || parsed

      if (!Array.isArray(tasks)) {
        ElMessage.error('文件格式不正确')
        return
      }

      const valid = tasks.every((t) =>
        t.id && t.title && t.dueDate && t.priority !== undefined
      )

      if (!valid) {
        ElMessage.error('任务数据格式不正确')
        return
      }

      taskStore.importTasks(tasks, importMode.value)
      ElMessage.success(`已成功导入 ${tasks.length} 个任务（${importMode.value === 'merge' ? '合并' : '替换'}模式）`)
    } catch {
      ElMessage.error('文件解析失败，请检查JSON格式')
    }
    // Reset input
    input.value = ''
  }
  reader.readAsText(file)
}

async function clearAllTasks() {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除所有任务数据，无法恢复！确定要继续吗？',
      '清除所有数据',
      {
        confirmButtonText: '确定清除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )
    taskStore.clearAll()
    ElMessage.success('所有任务数据已清除')
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="settings-page">
    <div class="page-header">
      <h2>设置</h2>
      <p class="page-subtitle">个性化您的任务仪表盘</p>
    </div>

    <!-- Appearance -->
    <div class="settings-section">
      <h3 class="section-title">
        <el-icon><Monitor /></el-icon> 外观
      </h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">深色主题</span>
          <span class="setting-desc">切换深色/浅色显示模式</span>
        </div>
        <el-switch
          :model-value="settingsStore.darkMode"
          @change="settingsStore.toggleDarkMode()"
          active-text="深色"
          inactive-text="浅色"
          inline-prompt
        />
      </div>
    </div>

    <el-divider />

    <!-- Sort & Display -->
    <div class="settings-section">
      <h3 class="section-title">
        <el-icon><Sort /></el-icon> 排序方式
      </h3>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-label">默认排序</span>
          <span class="setting-desc">影响任务列表的默认显示顺序</span>
        </div>
        <el-select
          :model-value="settingsStore.sortOrder"
          @change="settingsStore.setSortOrder($event)"
          style="width: 160px"
        >
          <el-option label="按截止日期" value="dueDate">
            <span style="display:flex;align-items:center;gap:6px">
              <el-icon><Calendar /></el-icon> 按截止日期
            </span>
          </el-option>
          <el-option label="按优先级" value="priority">
            <span style="display:flex;align-items:center;gap:6px">
              <el-icon><Flag /></el-icon> 按优先级
            </span>
          </el-option>
          <el-option label="自定义顺序" value="custom">
            <span style="display:flex;align-items:center;gap:6px">
              <el-icon><Rank /></el-icon> 自定义顺序
            </span>
          </el-option>
        </el-select>
      </div>

      <div class="setting-hint" v-if="settingsStore.sortOrder === 'custom'">
        <el-icon><InfoFilled /></el-icon>
        自定义顺序模式下，可在任务列表页面拖拽排序任务
      </div>
    </div>

    <el-divider />

    <!-- Data Management -->
    <div class="settings-section">
      <h3 class="section-title">
        <el-icon><DataAnalysis /></el-icon> 数据管理
      </h3>

      <!-- Export -->
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <p class="data-card-title">导出任务数据</p>
            <p class="data-card-desc">将所有任务保存为 JSON 文件，可用于备份或迁移</p>
          </div>
          <el-button type="primary" @click="exportTasks" plain>
            <el-icon><Download /></el-icon>
            导出 JSON
          </el-button>
        </div>
        <div class="data-stats">
          <span class="data-stat">
            <strong>{{ taskStore.totalCount }}</strong> 个任务
          </span>
          <span class="data-stat">
            <strong>{{ taskStore.completedCount }}</strong> 已完成
          </span>
          <span class="data-stat">
            <strong>{{ taskStore.incompleteCount }}</strong> 未完成
          </span>
        </div>
      </div>

      <!-- Import -->
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <p class="data-card-title">导入任务数据</p>
            <p class="data-card-desc">从 JSON 文件还原任务数据</p>
          </div>
          <el-button @click="triggerImport">
            <el-icon><Upload /></el-icon>
            选择文件
          </el-button>
        </div>
        <div class="import-mode-row">
          <span class="import-mode-label">导入模式：</span>
          <el-radio-group v-model="importMode" size="small">
            <el-radio-button value="merge">
              <el-icon><Plus /></el-icon> 合并（保留现有）
            </el-radio-button>
            <el-radio-button value="replace">
              <el-icon><RefreshRight /></el-icon> 替换（覆盖所有）
            </el-radio-button>
          </el-radio-group>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleFileImport"
        />
      </div>

      <!-- Danger Zone -->
      <div class="danger-zone">
        <div class="danger-header">
          <el-icon color="#ef4444"><Warning /></el-icon>
          <span>危险操作</span>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label danger-label">清除所有任务</span>
            <span class="setting-desc">删除所有任务数据，此操作不可撤销</span>
          </div>
          <el-button type="danger" @click="clearAllTasks" plain>
            <el-icon><Delete /></el-icon>
            清除所有数据
          </el-button>
        </div>
      </div>
    </div>

    <el-divider />

    <!-- About -->
    <div class="settings-section">
      <h3 class="section-title">
        <el-icon><InfoFilled /></el-icon> 关于
      </h3>
      <div class="about-info">
        <div class="about-item">
          <span class="about-key">应用版本</span>
          <span class="about-val">v1.0.0</span>
        </div>
        <div class="about-item">
          <span class="about-key">技术栈</span>
          <span class="about-val">Vue 3 + Vite + Pinia + Element Plus + ECharts</span>
        </div>
        <div class="about-item">
          <span class="about-key">数据存储</span>
          <span class="about-val">LocalStorage（本地缓存）云端存储</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.settings-section {
  margin-bottom: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border-light);
  gap: 16px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: 2px;
}

.setting-desc {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
}

.setting-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 14px;
  margin-top: 10px;
}

/* Data Cards */
.data-card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
}

.data-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.data-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 4px;
}

.data-card-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.data-stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.data-stat {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.data-stat strong {
  color: var(--color-text);
  font-weight: 600;
}

.import-mode-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.import-mode-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* Danger Zone */
.danger-zone {
  border: 1px solid var(--color-error-border);
  border-radius: 10px;
  padding: 16px;
  background: var(--color-error-light);
  margin-top: 8px;
}

.danger-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-error);
  margin-bottom: 12px;
}

.danger-label {
  color: var(--color-error) !important;
}

/* About */
.about-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.about-item {
  display: flex;
  gap: 20px;
  font-size: 13px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.about-item:last-child {
  border-bottom: none;
}

.about-key {
  width: 80px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.about-val {
  color: var(--color-text);
  font-weight: 500;
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .data-card-header {
    flex-direction: column;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>