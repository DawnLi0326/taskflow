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
    <!-- PC端布局 -->
    <div class="pc-layout">
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

    <!-- 移动端布局 -->
    <div class="mobile-layout">
      <div class="mobile-header">
        <h2>设置</h2>
        <p class="mobile-subtitle">个性化您的任务仪表盘</p>
      </div>

      <!-- 外观卡片 -->
      <el-card class="mobile-card">
        <div class="mobile-card-body">
          <div class="mobile-row">
            <div class="mobile-label">
              <span class="mobile-label-title">深色主题</span>
              <span class="mobile-label-desc">切换深色/浅色显示模式</span>
            </div>
            <el-switch
              :model-value="settingsStore.darkMode"
              @change="settingsStore.toggleDarkMode()"
              active-text=""
              inactive-text=""
            />
          </div>
        </div>
      </el-card>

      <!-- 排序方式卡片 -->
      <el-card class="mobile-card">
        <div class="mobile-card-body">
          <div class="mobile-row">
            <div class="mobile-label">
              <span class="mobile-label-title">默认排序</span>
              <span class="mobile-label-desc">影响任务列表的默认显示顺序</span>
            </div>
            <el-select
              :model-value="settingsStore.sortOrder"
              @change="settingsStore.setSortOrder($event)"
              class="mobile-select"
              placeholder="选择排序"
            >
              <el-option label="按截止日期" value="dueDate" />
              <el-option label="按优先级" value="priority" />
              <el-option label="自定义顺序" value="custom" />
            </el-select>
          </div>
        </div>
      </el-card>

      <!-- 数据管理卡片 -->
      <el-card class="mobile-card">
        <div class="mobile-card-header">数据管理</div>
        
        <!-- 导出区域 -->
        <div class="mobile-card-body">
          <div class="mobile-row">
            <div class="mobile-label">
              <span class="mobile-label-title">导出任务数据</span>
              <span class="mobile-label-desc">将所有任务保存为 JSON 文件</span>
            </div>
            <el-button type="primary" @click="exportTasks" plain>
              <el-icon><Download /></el-icon>
              导出 JSON
            </el-button>
          </div>

          <!-- 统计数据 -->
          <div class="mobile-stats-row">
            <el-tag class="mobile-stat-tag">
              <span class="stat-num">{{ taskStore.totalCount }}</span>
              <span class="stat-label">总任务</span>
            </el-tag>
            <el-tag class="mobile-stat-tag mobile-stat-success">
              <span class="stat-num">{{ taskStore.completedCount }}</span>
              <span class="stat-label">已完成</span>
            </el-tag>
            <el-tag class="mobile-stat-tag mobile-stat-warning">
              <span class="stat-num">{{ taskStore.incompleteCount }}</span>
              <span class="stat-label">未完成</span>
            </el-tag>
          </div>

          <!-- 导入区域 -->
          <div class="mobile-row">
            <div class="mobile-label">
              <span class="mobile-label-title">导入任务数据</span>
              <span class="mobile-label-desc">从 JSON 文件还原任务数据</span>
            </div>
            <el-button type="primary" @click="triggerImport" plain>
              <el-icon><Upload /></el-icon>
              选择文件
            </el-button>
          </div>

          <!-- 导入模式 -->
          <div class="mobile-import-mode">
            <el-radio-group v-model="importMode">
              <el-radio value="merge" border>合并（保留现有）</el-radio>
              <el-radio value="replace" border>替换（覆盖所有）</el-radio>
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
      </el-card>

      <!-- 危险操作卡片 -->
      <el-card class="mobile-card mobile-danger-card">
        <div class="mobile-card-body">
          <div class="mobile-row">
            <div class="mobile-label">
              <span class="mobile-label-title mobile-danger-title">清除所有任务</span>
              <span class="mobile-label-desc">删除所有任务数据，此操作不可撤销</span>
            </div>
            <el-button type="danger" @click="clearAllTasks" plain>
              <el-icon><Delete /></el-icon>
              清除所有数据
            </el-button>
          </div>
        </div>
      </el-card>

      <!-- 关于卡片 -->
      <el-card class="mobile-card">
        <div class="mobile-card-header">关于</div>
        <div class="mobile-card-body">
          <div class="mobile-about-row">
            <span class="mobile-about-label">应用版本</span>
            <span class="mobile-about-value">v1.0.0</span>
          </div>
          <div class="mobile-about-row">
            <span class="mobile-about-label">技术栈</span>
            <span class="mobile-about-value">Vue 3 + Vite + Pinia + Element Plus</span>
          </div>
          <div class="mobile-about-row">
            <span class="mobile-about-label">数据存储</span>
            <span class="mobile-about-value">LocalStorage + 云端存储</span>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
}

/* ========= PC端样式 ========= */
.pc-layout {
  display: block;
}

.mobile-layout {
  display: none;
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

/* ========= 移动端样式 ========= */
@media (max-width: 768px) {
  .pc-layout {
    display: none;
  }

  .mobile-layout {
    display: block;
  }

  .settings-page {
    padding: 16px;
  }

  .mobile-header {
    padding: 8px 0 20px;
    text-align: center;
  }

  .mobile-header h2 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 6px;
    color: var(--color-text);
  }

  .mobile-subtitle {
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .mobile-card {
    background: var(--color-surface);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid var(--color-border);
    margin-bottom: 16px;
    overflow: hidden;
  }

  .mobile-card-header {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    padding: 16px;
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-surface-2);
  }

  .mobile-card-body {
    padding: 16px;
  }

  .mobile-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
  }

  .mobile-row:not(:last-child) {
    border-bottom: 1px solid var(--color-border-light);
  }

  .mobile-label {
    flex: 1;
    min-width: 0;
  }

  .mobile-label-title {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 2px;
  }

  .mobile-label-desc {
    display: block;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .mobile-select {
    max-width: 160px;
    flex-shrink: 0;
  }

  .mobile-stats-row {
    display: flex;
    justify-content: center;
    gap: 12px;
    padding: 16px 0;
    border-bottom: 1px solid var(--color-border-light);
    margin: 0 -16px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .mobile-stat-tag {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 8px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 12px;
  }

  .mobile-stat-success {
    background: rgba(34, 197, 94, 0.1);
    border-color: rgba(34, 197, 94, 0.3);
    color: var(--color-success);
  }

  .mobile-stat-warning {
    background: rgba(234, 179, 8, 0.1);
    border-color: rgba(234, 179, 8, 0.3);
    color: var(--color-warning);
  }

  .stat-num {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
  }

  .stat-label {
    font-size: 11px;
    opacity: 0.8;
    line-height: 1.4;
  }

  .mobile-import-mode {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding-top: 8px;
  }

  .mobile-danger-card {
    border-color: var(--color-error-border);
    background: var(--color-surface);
  }

  .mobile-danger-title {
    color: var(--color-error) !important;
  }

  .mobile-about-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .mobile-about-row:last-child {
    border-bottom: none;
  }

  .mobile-about-label {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .mobile-about-value {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 500;
  }
}
</style>