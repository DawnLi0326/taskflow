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
      <el-card class="pc-card">
        <div class="pc-card-header">
          <el-icon class="pc-card-icon"><Monitor /></el-icon>
          <span class="pc-card-title">外观</span>
        </div>
        <div class="pc-setting-row">
          <div class="pc-setting-info">
            <span class="pc-setting-label">深色主题</span>
            <span class="pc-setting-desc">切换深色/浅色显示模式</span>
          </div>
          <el-switch
            :model-value="settingsStore.darkMode"
            @change="settingsStore.toggleDarkMode()"
            active-text="深色"
            inactive-text="浅色"
            inline-prompt
          />
        </div>
      </el-card>

      <!-- Sort & Display -->
      <el-card class="pc-card">
        <div class="pc-card-header">
          <el-icon class="pc-card-icon"><Sort /></el-icon>
          <span class="pc-card-title">排序方式</span>
        </div>
        <div class="pc-setting-row">
          <div class="pc-setting-info">
            <span class="pc-setting-label">默认排序</span>
            <span class="pc-setting-desc">影响任务列表的默认显示顺序</span>
          </div>
          <el-select
            :model-value="settingsStore.sortOrder"
            @change="settingsStore.setSortOrder($event)"
            class="pc-select"
            placeholder="选择排序"
          >
            <el-option label="按截止日期" value="dueDate" />
            <el-option label="按优先级" value="priority" />
            <el-option label="自定义顺序" value="custom" />
          </el-select>
        </div>
        <div class="pc-hint" v-if="settingsStore.sortOrder === 'custom'">
          <el-icon><InfoFilled /></el-icon>
          <span>自定义顺序模式下，可在任务列表页面拖拽排序任务</span>
        </div>
      </el-card>

      <!-- Data Management -->
      <el-card class="pc-card pc-data-card">
        <div class="pc-card-header">
          <el-icon class="pc-card-icon"><DataAnalysis /></el-icon>
          <span class="pc-card-title">数据管理</span>
        </div>

        <!-- Stats -->
        <div class="pc-stats-wrapper">
          <div class="pc-stat-item">
            <div class="pc-stat-circle">
              <span class="pc-stat-num">{{ taskStore.totalCount }}</span>
            </div>
            <span class="pc-stat-label">总任务</span>
          </div>
          <div class="pc-stat-divider"></div>
          <div class="pc-stat-item success">
            <div class="pc-stat-circle">
              <span class="pc-stat-num">{{ taskStore.completedCount }}</span>
            </div>
            <span class="pc-stat-label">已完成</span>
          </div>
          <div class="pc-stat-divider"></div>
          <div class="pc-stat-item warning">
            <div class="pc-stat-circle">
              <span class="pc-stat-num">{{ taskStore.incompleteCount }}</span>
            </div>
            <span class="pc-stat-label">未完成</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="pc-actions">
          <div class="pc-action-item">
            <div class="pc-action-icon export">
              <el-icon><Download /></el-icon>
            </div>
            <div class="pc-action-content">
              <span class="pc-action-title">导出数据</span>
              <span class="pc-action-desc">保存为 JSON 文件</span>
            </div>
            <el-button type="primary" @click="exportTasks" class="pc-action-btn">
              导出
            </el-button>
          </div>
          <div class="pc-action-item">
            <div class="pc-action-icon import">
              <el-icon><Upload /></el-icon>
            </div>
            <div class="pc-action-content">
              <span class="pc-action-title">导入数据</span>
              <span class="pc-action-desc">从 JSON 文件还原</span>
            </div>
            <el-button @click="triggerImport" class="pc-action-btn secondary">
              选择文件
            </el-button>
          </div>
        </div>

        <!-- Import Mode -->
        <div class="pc-import-mode-wrapper">
          <span class="pc-import-mode-label">导入方式</span>
          <div class="pc-import-options">
            <div 
              class="pc-import-option" 
              :class="{ active: importMode === 'merge' }"
              @click="importMode = 'merge'"
            >
              <el-icon><Plus /></el-icon>
              <span>合并</span>
            </div>
            <div 
              class="pc-import-option" 
              :class="{ active: importMode === 'replace' }"
              @click="importMode = 'replace'"
            >
              <el-icon><RefreshRight /></el-icon>
              <span>替换</span>
            </div>
          </div>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleFileImport"
        />
      </el-card>

      <!-- Danger Zone -->
      <el-card class="pc-card pc-danger-card">
        <div class="pc-danger-header">
          <el-icon color="#ef4444"><Warning /></el-icon>
          <span>危险操作</span>
        </div>
        <div class="pc-danger-content">
          <div class="pc-danger-info">
            <span class="pc-danger-label">清除所有任务</span>
            <span class="pc-danger-desc">删除所有任务数据，此操作不可撤销</span>
          </div>
          <el-button type="danger" @click="clearAllTasks" class="pc-danger-btn">
            <el-icon><Delete /></el-icon>
            清除所有数据
          </el-button>
        </div>
      </el-card>

      <!-- About -->
      <el-card class="pc-card pc-about-card">
        <div class="pc-card-header">
          <el-icon class="pc-card-icon"><InfoFilled /></el-icon>
          <span class="pc-card-title">关于</span>
        </div>
        <div class="pc-about-info">
          <div class="pc-about-item">
            <span class="pc-about-key">应用版本</span>
            <span class="pc-about-val">v1.0.0</span>
          </div>
          <div class="pc-about-item">
            <span class="pc-about-key">技术栈</span>
            <span class="pc-about-val">Vue 3 + Vite + Pinia + Element Plus</span>
          </div>
          <div class="pc-about-item">
            <span class="pc-about-key">数据存储</span>
            <span class="pc-about-val">LocalStorage + 云端存储</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 移动端布局 -->
    <div class="mobile-layout">
      <div class="mobile-header">
        <h2>设置</h2>
        <p class="mobile-subtitle">个性化您的任务仪表盘</p>
      </div>

      <!-- 外观卡片 -->
      <el-card class="mobile-card">
        <div class="mobile-card-content">
          <div class="mobile-setting-row">
            <div class="mobile-setting-info">
              <span class="mobile-setting-label">深色主题</span>
              <span class="mobile-setting-desc">切换深色/浅色显示模式</span>
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
        <div class="mobile-card-content">
          <div class="mobile-setting-row">
            <div class="mobile-setting-info">
              <span class="mobile-setting-label">默认排序</span>
              <span class="mobile-setting-desc">影响任务列表的默认显示顺序</span>
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
      <el-card class="mobile-card mobile-data-card">
        <div class="mobile-card-header">
          <el-icon class="header-icon"><DataAnalysis /></el-icon>
          <span class="mobile-card-title">数据管理</span>
        </div>

        <!-- 统计数据 -->
        <div class="mobile-stats-wrapper">
          <div class="mobile-stat-item">
            <div class="stat-circle">
              <span class="stat-num">{{ taskStore.totalCount }}</span>
            </div>
            <span class="stat-label">总任务</span>
          </div>
          <div class="mobile-stat-divider"></div>
          <div class="mobile-stat-item success">
            <div class="stat-circle">
              <span class="stat-num">{{ taskStore.completedCount }}</span>
            </div>
            <span class="stat-label">已完成</span>
          </div>
          <div class="mobile-stat-divider"></div>
          <div class="mobile-stat-item warning">
            <div class="stat-circle">
              <span class="stat-num">{{ taskStore.incompleteCount }}</span>
            </div>
            <span class="stat-label">未完成</span>
          </div>
        </div>

        <!-- 操作按钮区域 -->
        <div class="mobile-actions">
          <div class="action-item">
            <div class="action-icon export">
              <el-icon><Download /></el-icon>
            </div>
            <div class="action-content">
              <span class="action-title">导出数据</span>
              <span class="action-desc">保存为 JSON 文件</span>
            </div>
            <el-button type="primary" @click="exportTasks" class="action-btn">
              导出
            </el-button>
          </div>

          <div class="action-item">
            <div class="action-icon import">
              <el-icon><Upload /></el-icon>
            </div>
            <div class="action-content">
              <span class="action-title">导入数据</span>
              <span class="action-desc">从 JSON 文件还原</span>
            </div>
            <el-button @click="triggerImport" class="action-btn secondary">
              选择文件
            </el-button>
          </div>
        </div>

        <!-- 导入模式 -->
        <div class="mobile-import-mode-wrapper">
          <span class="import-mode-label">导入方式</span>
          <div class="import-options">
            <div 
              class="import-option" 
              :class="{ active: importMode === 'merge' }"
              @click="importMode = 'merge'"
            >
              <el-icon><Plus /></el-icon>
              <span>合并</span>
            </div>
            <div 
              class="import-option" 
              :class="{ active: importMode === 'replace' }"
              @click="importMode = 'replace'"
            >
              <el-icon><RefreshRight /></el-icon>
              <span>替换</span>
            </div>
          </div>
        </div>

        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleFileImport"
        />
      </el-card>

      <!-- 危险操作卡片 -->
      <el-card class="mobile-card mobile-danger-card">
        <div class="mobile-danger-header">
          <el-icon color="#ef4444"><Warning /></el-icon>
          <span>危险操作</span>
        </div>
        <div class="mobile-danger-content">
          <span class="mobile-danger-label">清除所有任务</span>
          <span class="mobile-danger-desc">删除所有任务数据，此操作不可撤销</span>
          <el-button type="danger" @click="clearAllTasks" plain class="mobile-danger-btn">
            <el-icon><Delete /></el-icon>
            清除所有数据
          </el-button>
        </div>
      </el-card>

      <!-- 关于卡片 -->
      <el-card class="mobile-card mobile-about-card">
        <div class="mobile-card-title">关于</div>
        <div class="mobile-about-info">
          <div class="mobile-about-item">
            <span class="mobile-about-key">应用版本</span>
            <span class="mobile-about-val">v1.0.0</span>
          </div>
          <div class="mobile-about-item">
            <span class="mobile-about-key">技术栈</span>
            <span class="mobile-about-val">Vue 3 + Vite + Pinia + Element Plus</span>
          </div>
          <div class="mobile-about-item">
            <span class="mobile-about-key">数据存储</span>
            <span class="mobile-about-val">LocalStorage + 云端存储</span>
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
  text-align: center;
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

/* ========= PC端卡片样式 ========= */
.pc-card {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.pc-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 0;
}

.pc-card-icon {
  font-size: 18px;
  color: var(--color-primary);
}

.pc-card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

.pc-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.pc-setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pc-setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.pc-setting-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.pc-select {
  width: 160px;
}

.pc-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px 16px;
  font-size: 12px;
  color: var(--color-text-muted);
}

/* PC端数据管理卡片 */
.pc-data-card {
  padding: 0;
  overflow: hidden;
}

.pc-data-card .pc-card-header {
  margin-bottom: 0;
}

.pc-stats-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 24px 20px;
  background: linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface) 100%);
}

.pc-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pc-stat-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.pc-stat-item.success .pc-stat-circle {
  background: var(--color-success);
}

.pc-stat-item.warning .pc-stat-circle {
  background: var(--color-warning);
}

.pc-stat-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.pc-stat-item.success .pc-stat-num,
.pc-stat-item.warning .pc-stat-num {
  color: #fff;
}

.pc-stat-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.pc-stat-divider {
  width: 1px;
  height: 48px;
  background: var(--color-border);
}

.pc-actions {
  padding: 0 20px;
}

.pc-action-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--color-surface-2);
  border-radius: 12px;
  margin-bottom: 12px;
  transition: background 0.2s ease;
}

.pc-action-item:last-child {
  margin-bottom: 0;
}

.pc-action-item:hover {
  background: var(--color-border-light);
}

.pc-action-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pc-action-icon.export {
  background: rgba(59, 130, 246, 0.15);
  color: var(--color-primary);
}

.pc-action-icon.import {
  background: rgba(139, 92, 246, 0.15);
  color: var(--color-purple);
}

.pc-action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pc-action-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.pc-action-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.pc-action-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
}

.pc-action-btn.secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.pc-import-mode-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border-light);
  gap: 16px;
}

.pc-import-mode-label {
  font-size: 13px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.pc-import-options {
  display: flex;
  gap: 10px;
}

.pc-import-option {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 13px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 70px;
  justify-content: center;
  color: var(--color-text-secondary);
}

.pc-import-option:hover {
  background: var(--color-border-light);
}

.pc-import-option.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.pc-import-option.active el-icon {
  color: #fff;
}

/* PC端危险操作卡片 */
.pc-danger-card {
  border-color: var(--color-error-border);
  background: var(--color-error-light);
}

.pc-danger-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-error);
}

.pc-danger-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 16px;
}

.pc-danger-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pc-danger-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-error);
}

.pc-danger-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.pc-danger-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
}

/* PC端关于卡片 */
.pc-about-card {
  padding: 0;
  overflow: hidden;
}

.pc-about-info {
  padding: 0 20px 16px;
}

.pc-about-item {
  display: flex;
  gap: 20px;
  font-size: 13px;
  padding: 14px 0;
  border-bottom: 1px solid var(--color-border-light);
}

.pc-about-item:last-child {
  border-bottom: none;
}

.pc-about-key {
  width: 80px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.pc-about-val {
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
    padding: 12px;
  }

  .mobile-header {
    padding: 16px 0 20px;
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
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--color-border);
    margin-bottom: 16px;
    padding: 0;
    overflow: hidden;
  }

  .mobile-card-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--color-border-light);
  }

  .mobile-card-content {
    padding: 16px;
  }

  .mobile-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .mobile-setting-info {
    flex: 1;
  }

  .mobile-setting-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 3px;
  }

  .mobile-setting-desc {
    display: block;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .mobile-select {
    max-width: 160px;
    flex-shrink: 0;
  }

  .mobile-data-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--color-border-light);
    gap: 12px;
  }

  .mobile-data-section:last-of-type {
    border-bottom: none;
  }

  .mobile-data-info {
    flex: 1;
  }

  .mobile-data-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 3px;
  }

  .mobile-data-desc {
    display: block;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .mobile-btn {
    flex-shrink: 0;
  }

  /* 数据管理卡片样式 */
  .mobile-data-card {
    padding: 0;
    overflow: hidden;
  }

  .mobile-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px;
    border-bottom: 1px solid var(--color-border-light);
  }

  .header-icon {
    width: 24px;
    height: 24px;
    color: var(--color-primary);
  }

  .mobile-card-header .mobile-card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
    padding: 0;
    border-bottom: none;
  }

  .mobile-stats-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 20px 16px;
    background: linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface) 100%);
  }

  .mobile-stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
  }

  .stat-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
    transition: all 0.3s ease;
  }

  .mobile-stat-item.success .stat-circle {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%);
    border: 2px solid var(--color-success);
  }

  .mobile-stat-item.warning .stat-circle {
    background: linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(234, 179, 8, 0.1) 100%);
    border: 2px solid var(--color-warning);
  }

  .stat-num {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text);
  }

  .mobile-stat-item.success .stat-num {
    color: var(--color-success);
  }

  .mobile-stat-item.warning .stat-num {
    color: var(--color-warning);
  }

  .mobile-stat-item .stat-label {
    font-size: 12px;
    color: var(--color-text-muted);
    font-weight: 500;
  }

  .mobile-stat-divider {
    width: 1px;
    height: 40px;
    background: var(--color-border);
    margin: 0 8px;
  }

  .mobile-actions {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--color-surface-2);
    border-radius: 10px;
    transition: background 0.2s ease;
  }

  .action-item:active {
    background: var(--color-border-light);
  }

  .action-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .action-icon.export {
    background: rgba(59, 130, 246, 0.15);
    color: var(--color-primary);
  }

  .action-icon.import {
    background: rgba(139, 92, 246, 0.15);
    color: var(--color-purple);
  }

  .action-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
  }

  .action-desc {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .action-btn {
    flex-shrink: 0;
    padding: 6px 16px;
    font-size: 13px;
    border-radius: 8px;
  }

  .action-btn.secondary {
    background: var(--color-surface);
    color: var(--color-text);
    border-color: var(--color-border);
  }

  .mobile-import-mode-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 16px;
    border-top: 1px solid var(--color-border-light);
    gap: 12px;
  }

  .import-mode-label {
    font-size: 13px;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .import-options {
    display: flex;
    gap: 8px;
    flex: 1;
    justify-content: flex-end;
  }

  .import-option {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 65px;
    justify-content: center;
    color: var(--color-text-secondary);
  }

  .import-option:hover {
    background: var(--color-border-light);
  }

  .import-option.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }

  .import-option.active el-icon {
    color: #fff;
  }

  .mobile-danger-card {
    border-color: var(--color-error-border);
    background: var(--color-error-light);
  }

  .mobile-danger-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-error);
    border-bottom: 1px solid var(--color-error-border);
  }

  .mobile-danger-content {
    padding: 16px;
  }

  .mobile-danger-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-error);
    margin-bottom: 4px;
  }

  .mobile-danger-desc {
    display: block;
    font-size: 12px;
    color: var(--color-text-muted);
    margin-bottom: 12px;
  }

  .mobile-danger-btn {
    width: 100%;
    justify-content: center;
  }

  .mobile-about-card {
    padding: 16px;
  }

  .mobile-about-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 8px;
  }

  .mobile-about-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .mobile-about-item:last-child {
    border-bottom: none;
  }

  .mobile-about-key {
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .mobile-about-val {
    font-size: 13px;
    color: var(--color-text);
    font-weight: 500;
  }
}
</style>