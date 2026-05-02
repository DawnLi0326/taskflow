<script setup>
import { ref } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  ElCard,
  ElSwitch,
  ElSelect,
  ElOption,
  ElButton,
  ElIcon,
  ElDivider
} from 'element-plus'
import {Monitor, Sort, DataAnalysis, Download, Upload, Plus, RefreshRight, Warning, Delete, InfoFilled,
  Calendar,
  Flag,
  Rank
} from '@element-plus/icons-vue'
import { useSettingsStore } from '../stores/settings'
import { useTaskStore } from '../stores/task'

/**
 * 设置页面组件
 * 提供个性化设置、数据管理等功能
 */

// Store 实例
const settingsStore = useSettingsStore()
const taskStore = useTaskStore()

// 响应式状态
const importMode = ref('merge')
const fileInputRef = ref(null)

/**
 * 导出任务数据为 JSON 文件
 */
function exportTasks() {
  const exportData = {
    tasks: taskStore.getTasksForStats(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: 'application/json' 
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = `tasks-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  ElMessage.success('任务数据已导出')
}

/**
 * 触发文件选择对话框
 */
function triggerImport() {
  fileInputRef.value?.click()
}

/**
 * 验证任务数据格式
 * @param {Array} tasks - 待验证的任务数组
 * @returns {boolean} 是否有效
 */
function validateTasks(tasks) {
  return tasks.every((task) => {
    return task.id !== undefined && 
           task.title !== undefined && 
           task.dueDate !== undefined && 
           task.priority !== undefined
  })
}

/**
 * 处理文件导入
 * @param {Event} event - 文件选择事件
 */
function handleFileImport(event) {
  const input = event.target
  const file = input.files?.[0]
  
  if (!file) return

  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result
      const parsed = JSON.parse(content)
      const tasks = parsed.tasks || parsed
      
      if (!Array.isArray(tasks)) {
        ElMessage.error('文件格式不正确')
        return
      }
      
      if (!validateTasks(tasks)) {
        ElMessage.error('任务数据格式不正确')
        return
      }
      
      taskStore.importTasks(tasks, importMode.value)
      const modeText = importMode.value === 'merge' ? '合并' : '替换'
      ElMessage.success(`已成功导入 ${tasks.length} 个任务（${modeText}模式）`)
    } catch {
      ElMessage.error('文件解析失败，请检查JSON格式')
    }
    
    // 重置输入
    input.value = ''
  }
  
  reader.readAsText(file)
}

/**
 * 清除所有任务数据（需要确认）
 */
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
    // 用户取消操作
  }
}
</script>

<template>
  <div class="settings-page">
    <!-- ========= PC端布局 ========= -->
    <div class="layout pc-layout">
      <!-- 页面标题 -->
      <header class="page-header">
        <h1>设置</h1>
        <p class="page-subtitle">个性化您的任务仪表盘</p>
      </header>

      <!-- 外观设置卡片 -->
      <section class="setting-section">
        <ElCard class="setting-card">
          <div class="card-header">
            <ElIcon class="card-icon"><Monitor /></ElIcon>
            <h2 class="card-title">外观</h2>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">深色主题</span>
              <span class="setting-desc">切换深色/浅色显示模式</span>
            </div>
            <ElSwitch
              :model-value="settingsStore.darkMode"
              @change="settingsStore.toggleDarkMode()"
              active-text="深色"
              inactive-text="浅色"
              inline-prompt
            />
          </div>
        </ElCard>
      </section>

      <!-- 排序设置卡片 -->
      <section class="setting-section">
        <ElCard class="setting-card">
          <div class="card-header">
            <ElIcon class="card-icon"><Sort /></ElIcon>
            <h2 class="card-title">排序方式</h2>
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">默认排序</span>
              <span class="setting-desc">影响任务列表的默认显示顺序</span>
            </div>
            <ElSelect
              :model-value="settingsStore.sortOrder"
              @change="settingsStore.setSortOrder($event)"
              class="setting-select"
              placeholder="选择排序"
            >
              <ElOption label="按截止日期" value="dueDate" />
              <ElOption label="按优先级" value="priority" />
              <ElOption label="自定义顺序" value="custom" />
            </ElSelect>
          </div>
          <div v-if="settingsStore.sortOrder === 'custom'" class="setting-hint">
            <ElIcon><InfoFilled /></ElIcon>
            <span>自定义顺序模式下，可在任务列表页面拖拽排序任务</span>
          </div>
        </ElCard>
      </section>

      <!-- 数据管理卡片 -->
      <section class="setting-section">
        <ElCard class="setting-card data-card">
          <div class="card-header">
            <ElIcon class="card-icon"><DataAnalysis /></ElIcon>
            <h2 class="card-title">数据管理</h2>
          </div>

          <!-- 统计数据 -->
          <div class="stats-wrapper">
            <div class="stat-item">
              <div class="stat-circle">
                <span class="stat-num">{{ taskStore.totalCount }}</span>
              </div>
              <span class="stat-label">总任务</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item success">
              <div class="stat-circle">
                <span class="stat-num">{{ taskStore.completedCount }}</span>
              </div>
              <span class="stat-label">已完成</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item warning">
              <div class="stat-circle">
                <span class="stat-num">{{ taskStore.incompleteCount }}</span>
              </div>
              <span class="stat-label">未完成</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="actions-wrapper">
            <div class="action-item">
              <div class="action-icon export">
                <ElIcon><Download /></ElIcon>
              </div>
              <div class="action-content">
                <span class="action-title">导出数据</span>
                <span class="action-desc">保存为 JSON 文件</span>
              </div>
              <ElButton type="primary" @click="exportTasks" class="action-btn">
                导出
              </ElButton>
            </div>

            <div class="action-item">
              <div class="action-icon import">
                <ElIcon><Upload /></ElIcon>
              </div>
              <div class="action-content">
                <span class="action-title">导入数据</span>
                <span class="action-desc">从 JSON 文件还原</span>
              </div>
              <ElButton @click="triggerImport" class="action-btn secondary">
                选择文件
              </ElButton>
            </div>
          </div>

          <!-- 导入模式选择 -->
          <div class="import-mode-wrapper">
            <span class="import-mode-label">导入方式</span>
            <div class="import-options">
              <button
                class="import-option"
                :class="{ active: importMode === 'merge' }"
                @click="importMode = 'merge'"
              >
                <ElIcon><Plus /></ElIcon>
                <span>合并</span>
              </button>
              <button
                class="import-option"
                :class="{ active: importMode === 'replace' }"
                @click="importMode = 'replace'"
              >
                <ElIcon><RefreshRight /></ElIcon>
                <span>替换</span>
              </button>
            </div>
          </div>

          <!-- 文件输入（隐藏） -->
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            class="file-input"
            @change="handleFileImport"
          />
        </ElCard>
      </section>

      <!-- 危险操作卡片 -->
      <section class="setting-section">
        <ElCard class="setting-card danger-card">
          <div class="danger-header">
            <ElIcon color="#ef4444"><Warning /></ElIcon>
            <span>危险操作</span>
          </div>
          <div class="danger-content">
            <div class="danger-info">
              <span class="danger-label">清除所有任务</span>
              <span class="danger-desc">删除所有任务数据，此操作不可撤销</span>
            </div>
            <ElButton type="danger" @click="clearAllTasks" class="danger-btn">
              <ElIcon><Delete /></ElIcon>
              清除所有数据
            </ElButton>
          </div>
        </ElCard>
      </section>

      <!-- 关于卡片 -->
      <section class="setting-section">
        <ElCard class="setting-card about-card">
          <div class="card-header">
            <ElIcon class="card-icon"><InfoFilled /></ElIcon>
            <h2 class="card-title">关于</h2>
          </div>
          <div class="about-info">
            <div class="about-item">
              <span class="about-key">应用版本</span>
              <span class="about-val">v1.0.0</span>
            </div>
            <div class="about-item">
              <span class="about-key">技术栈</span>
              <span class="about-val">Vue 3 + Vite + Pinia + Element Plus</span>
            </div>
            <div class="about-item">
              <span class="about-key">数据存储</span>
              <span class="about-val">LocalStorage + 云端存储</span>
            </div>
          </div>
        </ElCard>
      </section>
    </div>

    <!-- ========= 移动端布局 ========= -->
    <div class="layout mobile-layout">
      <!-- 页面标题 -->
      <header class="mobile-header">
        <h1>设置</h1>
        <p class="mobile-subtitle">个性化您的任务仪表盘</p>
      </header>

      <!-- 外观设置卡片 -->
      <section class="mobile-section">
        <ElCard class="mobile-card">
          <div class="mobile-card-header">
            <ElIcon class="mobile-header-icon"><Monitor /></ElIcon>
            <span class="mobile-card-title">外观</span>
          </div>
          <div class="mobile-card-content">
            <div class="mobile-setting-row">
              <div class="mobile-setting-info">
                <span class="mobile-setting-label">深色主题</span>
                <span class="mobile-setting-desc">切换深色/浅色显示模式</span>
              </div>
              <ElSwitch
                :model-value="settingsStore.darkMode"
                @change="settingsStore.toggleDarkMode()"
                active-text=""
                inactive-text=""
              />
            </div>
          </div>
        </ElCard>
      </section>

      <!-- 排序设置卡片 -->
      <section class="mobile-section">
        <ElCard class="mobile-card">
          <div class="mobile-card-header">
            <ElIcon class="mobile-header-icon"><Sort /></ElIcon>
            <span class="mobile-card-title">排序方式</span>
          </div>
          <div class="mobile-card-content">
            <div class="mobile-setting-row">
              <div class="mobile-setting-info">
                <span class="mobile-setting-label">默认排序</span>
                <span class="mobile-setting-desc">影响任务列表的默认显示顺序</span>
              </div>
              <ElSelect
                :model-value="settingsStore.sortOrder"
                @change="settingsStore.setSortOrder($event)"
                class="mobile-select"
                placeholder="选择排序"
              >
                <ElOption label="按截止日期" value="dueDate" />
                <ElOption label="按优先级" value="priority" />
                <ElOption label="自定义顺序" value="custom" />
              </ElSelect>
            </div>
          </div>
        </ElCard>
      </section>

      <!-- 数据管理卡片 -->
      <section class="mobile-section">
        <ElCard class="mobile-card mobile-data-card">
          <div class="mobile-card-header">
            <ElIcon class="mobile-header-icon"><DataAnalysis /></ElIcon>
            <span class="mobile-card-title">数据管理</span>
          </div>

          <!-- 统计数据 -->
          <div class="mobile-stats-wrapper">
            <div class="mobile-stat-item">
              <div class="mobile-stat-circle">
                <span class="mobile-stat-num">{{ taskStore.totalCount }}</span>
              </div>
              <span class="mobile-stat-label">总任务</span>
            </div>
            <div class="mobile-stat-divider"></div>
            <div class="mobile-stat-item success">
              <div class="mobile-stat-circle">
                <span class="mobile-stat-num">{{ taskStore.completedCount }}</span>
              </div>
              <span class="mobile-stat-label">已完成</span>
            </div>
            <div class="mobile-stat-divider"></div>
            <div class="mobile-stat-item warning">
              <div class="mobile-stat-circle">
                <span class="mobile-stat-num">{{ taskStore.incompleteCount }}</span>
              </div>
              <span class="mobile-stat-label">未完成</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mobile-actions">
            <div class="mobile-action-item">
              <div class="mobile-action-icon export">
                <ElIcon><Download /></ElIcon>
              </div>
              <div class="mobile-action-content">
                <span class="mobile-action-title">导出数据</span>
                <span class="mobile-action-desc">保存为 JSON 文件</span>
              </div>
              <ElButton type="primary" @click="exportTasks" class="mobile-action-btn">
                导出
              </ElButton>
            </div>

            <div class="mobile-action-item">
              <div class="mobile-action-icon import">
                <ElIcon><Upload /></ElIcon>
              </div>
              <div class="mobile-action-content">
                <span class="mobile-action-title">导入数据</span>
                <span class="mobile-action-desc">从 JSON 文件还原</span>
              </div>
              <ElButton @click="triggerImport" class="mobile-action-btn secondary">
                选择文件
              </ElButton>
            </div>
          </div>

          <!-- 导入模式选择 -->
          <div class="mobile-import-mode-wrapper">
            <span class="mobile-import-mode-label">导入方式</span>
            <div class="mobile-import-options">
              <button
                class="mobile-import-option"
                :class="{ active: importMode === 'merge' }"
                @click="importMode = 'merge'"
              >
                <ElIcon><Plus /></ElIcon>
                <span>合并</span>
              </button>
              <button
                class="mobile-import-option"
                :class="{ active: importMode === 'replace' }"
                @click="importMode = 'replace'"
              >
                <ElIcon><RefreshRight /></ElIcon>
                <span>替换</span>
              </button>
            </div>
          </div>

          <!-- 文件输入（隐藏） -->
          <input
            ref="fileInputRef"
            type="file"
            accept=".json"
            class="file-input"
            @change="handleFileImport"
          />
        </ElCard>
      </section>

      <!-- 危险操作卡片 -->
      <section class="mobile-section">
        <ElCard class="mobile-card mobile-danger-card">
          <div class="mobile-danger-header">
            <ElIcon color="#ef4444"><Warning /></ElIcon>
            <span>危险操作</span>
          </div>
          <div class="mobile-danger-content">
            <span class="mobile-danger-label">清除所有任务</span>
            <span class="mobile-danger-desc">删除所有任务数据，此操作不可撤销</span>
            <ElButton type="danger" @click="clearAllTasks" plain class="mobile-danger-btn">
              <ElIcon><Delete /></ElIcon>
              清除所有数据
            </ElButton>
          </div>
        </ElCard>
      </section>

      <!-- 关于卡片 -->
      <section class="mobile-section">
        <ElCard class="mobile-card mobile-about-card">
          <div class="mobile-card-header">
            <ElIcon class="mobile-header-icon"><InfoFilled /></ElIcon>
            <span class="mobile-card-title">关于</span>
          </div>
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
        </ElCard>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* ========= 全局样式 ========= */
.settings-page {
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
}

.layout {
  display: block;
}

.file-input {
  display: none;
}

/* ========= PC端样式 ========= */
.mobile-layout {
  display: none;
}

/* 页面标题 */
.page-header {
  margin-bottom: 24px;
  text-align: center;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* 设置区域 */
.setting-section {
  margin-bottom: 20px;
}

/* 设置卡片 */
.setting-card {
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-light);
}

.card-icon {
  font-size: 18px;
  color: var(--color-primary);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
}

/* 设置行 */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.setting-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.setting-select {
  width: 160px;
}

.setting-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px 16px;
  font-size: 12px;
  color: var(--color-text-muted);
}

/* 数据管理卡片特殊样式 */
.data-card .card-header {
  margin-bottom: 0;
}

/* 统计区域 */
.stats-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 24px 20px;
  background: linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface) 100%);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.stat-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.stat-item.success .stat-circle {
  background: var(--color-success);
}

.stat-item.warning .stat-circle {
  background: var(--color-warning);
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
}

.stat-item.success .stat-num,
.stat-item.warning .stat-num {
  color: #fff;
}

.stat-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.stat-divider {
  width: 1px;
  height: 48px;
  background: var(--color-border);
}

/* 操作区域 */
.actions-wrapper {
  padding: 0 20px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--color-surface-2);
  border-radius: 12px;
  margin-bottom: 12px;
  transition: background 0.2s ease;
}

.action-item:last-child {
  margin-bottom: 0;
}

.action-item:hover {
  background: var(--color-border-light);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
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
  font-weight: 500;
  color: var(--color-text);
}

.action-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.action-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
}

.action-btn.secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

/* 导入模式 */
.import-mode-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border-light);
  gap: 16px;
}

.import-mode-label {
  font-size: 13px;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.import-options {
  display: flex;
  gap: 10px;
}

.import-option {
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

.import-option:hover {
  background: var(--color-border-light);
}

.import-option.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.import-option.active :deep(.el-icon) {
  color: #fff;
}

/* 危险操作卡片 */
.danger-card {
  border-color: var(--color-error-border);
  background: var(--color-error-light);
}

.danger-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-error);
}

.danger-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 16px;
}

.danger-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.danger-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-error);
}

.danger-desc {
  font-size: 12px;
  color: var(--color-text-muted);
}

.danger-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
}

/* 关于卡片 */
.about-card {
  padding: 0;
}

.about-info {
  padding: 0 20px 16px;
}

.about-item {
  display: flex;
  gap: 20px;
  font-size: 13px;
  padding: 14px 0;
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
    padding: 12px;
  }

  /* 页面标题 */
  .mobile-header {
    padding: 16px 0 20px;
    text-align: center;
  }

  .mobile-header h1 {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .mobile-subtitle {
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  /* 卡片 */
  .mobile-section {
    margin-bottom: 16px;
  }

  .mobile-card {
    background: var(--color-surface);
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border: 1px solid var(--color-border);
    padding: 0;
    overflow: hidden;
  }

  /* 卡片头部 */
  .mobile-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px;
    border-bottom: 1px solid var(--color-border-light);
  }

  .mobile-header-icon {
    width: 24px;
    height: 24px;
    color: var(--color-primary);
  }

  .mobile-card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
  }

  /* 卡片内容 */
  .mobile-card-content {
    padding: 16px;
  }

  /* 设置行 */
  .mobile-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .mobile-setting-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mobile-setting-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
  }

  .mobile-setting-desc {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .mobile-select {
    width: 140px;
    font-size: 13px;
  }

  /* 数据管理卡片 */
  .mobile-data-card {
    padding: 0;
  }

  /* 统计区域 */
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
    gap: 8px;
  }

  .mobile-stat-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .mobile-stat-item.success .mobile-stat-circle {
    background: var(--color-success);
  }

  .mobile-stat-item.warning .mobile-stat-circle {
    background: var(--color-warning);
  }

  .mobile-stat-num {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text);
  }

  .mobile-stat-item.success .mobile-stat-num,
  .mobile-stat-item.warning .mobile-stat-num {
    color: #fff;
  }

  .mobile-stat-label {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .mobile-stat-divider {
    width: 1px;
    height: 40px;
    background: var(--color-border);
  }

  /* 操作区域 */
  .mobile-actions {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--color-surface-2);
    border-radius: 10px;
    transition: background 0.2s ease;
  }

  .mobile-action-item:hover {
    background: var(--color-border-light);
  }

  .mobile-action-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .mobile-action-icon.export {
    background: rgba(59, 130, 246, 0.15);
    color: var(--color-primary);
  }

  .mobile-action-icon.import {
    background: rgba(139, 92, 246, 0.15);
    color: var(--color-purple);
  }

  .mobile-action-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mobile-action-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
  }

  .mobile-action-desc {
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .mobile-action-btn {
    padding: 6px 16px;
    border-radius: 6px;
    font-size: 12px;
  }

  .mobile-action-btn.secondary {
    background: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-text);
  }

  /* 导入模式 */
  .mobile-import-mode-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 16px;
    border-top: 1px solid var(--color-border-light);
    gap: 12px;
  }

  .mobile-import-mode-label {
    font-size: 13px;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .mobile-import-options {
    display: flex;
    gap: 8px;
    flex: 1;
    justify-content: flex-end;
  }

  .mobile-import-option {
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

  .mobile-import-option:hover {
    background: var(--color-border-light);
  }

  .mobile-import-option.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }

  .mobile-import-option.active :deep(.el-icon) {
    color: #fff;
  }

  /* 危险操作卡片 */
  .mobile-danger-card {
    border-color: var(--color-error-border);
    background: var(--color-error-light);
    padding: 16px;
  }

  .mobile-danger-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-error);
    margin-bottom: 12px;
  }

  .mobile-danger-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mobile-danger-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-error);
  }

  .mobile-danger-desc {
    font-size: 12px;
    color: var(--color-text-muted);
    margin-bottom: 12px;
  }

  .mobile-danger-btn {
    width: 100%;
    justify-content: center;
  }

  /* 关于卡片 */
  .mobile-about-card {
    padding: 0;
    overflow: hidden;
  }

  .mobile-about-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .mobile-about-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
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
