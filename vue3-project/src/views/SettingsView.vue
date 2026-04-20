<script setup>
import { ref, watch, onMounted } from 'vue'
import { useThemeStore } from '../stores/theme'
import { useTaskStore } from '../stores/task'

// 主题 store
const themeStore = useThemeStore()
// 任务 store
const taskStore = useTaskStore()

// 文件输入引用
const fileInput = ref(null)

// 设置选项
const settings = ref({
  theme: 'light'
})

// 关于部分显示状态
const aboutVisible = ref(false)

// 初始化设置
onMounted(() => {
  // 同步主题设置
  settings.value.theme = themeStore.isDark ? 'dark' : 'light'
})

// 监听主题变化
watch(() => themeStore.isDark, (isDark) => {
  settings.value.theme = isDark ? 'dark' : 'light'
})

// 保存设置
const saveSettings = () => {
  // 更新主题
  let themeChanged = false
  if (settings.value.theme === 'dark' && !themeStore.isDark) {
    themeStore.toggleTheme()
    themeChanged = true
  } else if (settings.value.theme === 'light' && themeStore.isDark) {
    themeStore.toggleTheme()
    themeChanged = true
  }
  
  // 这里可以添加保存其他设置的逻辑，例如发送到服务器或存储到本地存储
  console.log('保存设置:', settings.value)
  
  // 根据主题显示不同的提示
  if (themeChanged) {
    const themeText = settings.value.theme === 'dark' ? '夜间' : '白天'
    alert(`已经切换为${themeText}模式`)
  } else {
    alert('设置已保存')
  }
}

// 重置设置
const resetSettings = () => {
  settings.value = {
    theme: 'light'
  }
  
  // 重置主题为浅色
  if (themeStore.isDark) {
    themeStore.toggleTheme()
  }
}

// 导出任务
const exportTasks = () => {
  const tasksJson = JSON.stringify(taskStore.tasks, null, 2)
  const blob = new Blob([tasksJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tasks_backup.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 触发文件输入
const triggerFileInput = () => {
  fileInput.value.click()
}

// 导入任务
const importTasks = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  if (file.type !== 'application/json') {
    alert('请选择 JSON 文件')
    return
  }
  
  if (!confirm('警告：导入任务会覆盖当前所有数据，确定继续吗？')) {
    event.target.value = ''
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const importedTasks = JSON.parse(e.target.result)
      if (Array.isArray(importedTasks)) {
        taskStore.importTasks(importedTasks)
        alert('任务导入成功！')
      } else {
        alert('无效的任务数据格式')
      }
    } catch (error) {
      alert('解析 JSON 文件失败：' + error.message)
    }
  }
  reader.onerror = () => {
    alert('读取文件失败')
  }
  reader.readAsText(file)
  
  // 重置文件输入
  event.target.value = ''
}
</script>

<template>
  <div class="settings">
    <div class="settings-header">
      <h1>设置</h1>
      <p>自定义您的任务仪表板体验</p>
    </div>
    
    <div class="settings-content">
      <!-- 外观设置 -->
      <section class="settings-section">
        <h2>外观</h2>
        <div class="setting-item">
          <label for="theme">主题</label>
          <select id="theme" v-model="settings.theme">
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
      </section>
      

      
      <!-- 关于 -->
      <section class="settings-section">
        <div class="section-header">
          <h2>关于</h2>
          <el-button 
            type="text" 
            @click="aboutVisible = !aboutVisible"
            :icon="aboutVisible ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"
          >
            {{ aboutVisible ? '收起' : '展开' }}
          </el-button>
        </div>
        <div class="about-info" v-show="aboutVisible">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="项目版本">v1.0.0</el-descriptions-item>
            <el-descriptions-item label="技术栈">Vue 3 / Vite / Element Plus / Pinia / ECharts</el-descriptions-item>
            <el-descriptions-item label="GitHub 仓库">
              <el-input placeholder="https://github.com/你的用户名/task-dashboard" disabled />
            </el-descriptions-item>
            <el-descriptions-item label="作者">
              <el-input placeholder="唐梨铭" disabled />
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </section>
      
      <!-- 数据管理 -->
      <section class="settings-section">
        <h2>数据管理</h2>
        <div class="setting-item vertical">
          <label>任务备份</label>
          <div class="import-export-buttons">
            <el-button type="primary" @click="exportTasks" style="margin-right: 10px;">导出为 JSON</el-button>
            <el-button @click="triggerFileInput">选择 JSON 文件导入</el-button>
            <input 
              ref="fileInput" 
              type="file" 
              accept=".json" 
              @change="importTasks" 
              style="display: none;"
            />
          </div>
          <div class="import-export-tip">
            支持 JSON 格式备份，导入会覆盖当前所有数据
          </div>
        </div>
      </section>
      
      <!-- 操作按钮 -->
      <div class="settings-actions">
        <button @click="saveSettings" class="save-btn">保存设置</button>
        <button @click="resetSettings" class="reset-btn">重置为默认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  padding: 40px 20px;
  max-width: 800px;
  margin: 0 auto;
}

.settings-header {
  text-align: center;
  margin-bottom: 60px;
}

.settings-header h1 {
  font-size: 36px;
  margin-bottom: 20px;
  color: var(--text-primary);
  transition: color 0.3s;
}

.settings-header p {
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
  transition: color 0.3s;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.settings-section {
  background-color: var(--bg-card);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 30px;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.settings-section:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transform: translateY(-4px);
  border-color: var(--button-primary);
}

.settings-section h2 {
  font-size: 20px;
  margin-bottom: 20px;
  color: var(--text-primary);
  position: relative;
  padding-bottom: 10px;
  transition: color 0.3s;
}

.settings-section h2::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 60px;
  height: 3px;
  background-color: var(--button-primary);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-header h2::after {
  display: none;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item.vertical {
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.setting-item.vertical label {
  align-self: flex-start;
}

.setting-item.vertical > div {
  align-self: flex-end;
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item label {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 500;
  transition: color 0.3s;
}

.setting-item select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.3s ease;
  min-width: 150px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.setting-item select:focus {
  outline: none;
  border-color: var(--button-primary);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.setting-item.nested {
  padding-left: 20px;
  font-size: 14px;
  color: var(--text-secondary);
  transition: color 0.3s;
}

.about-info {
  margin-top: 20px;
}

.about-info .el-descriptions {
  width: 100%;
}

.about-info .el-descriptions__label {
  font-weight: 500;
  color: var(--text-primary);
  width: 120px;
}

.about-info .el-descriptions__content {
  color: var(--text-primary);
}

.about-info .el-input {
  width: 100%;
  max-width: 400px;
}

.import-export-buttons {
  display: flex;
  align-items: center;
}

.import-export-tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  width: 100%;
  text-align: right;
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-switch input:checked + label {
  background-color: var(--button-primary);
}

.toggle-switch input:checked + label:before {
  transform: translateX(26px);
}

.toggle-switch input:disabled + label {
  background-color: #e4e7ed;
  cursor: not-allowed;
}

/* 操作按钮 */
.settings-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
}

.save-btn,
.reset-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-btn {
  background-color: var(--button-primary);
  color: var(--button-primary-text);
}

.save-btn:hover {
  background-color: var(--button-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px 0 rgba(59, 130, 246, 0.3);
}

.reset-btn {
  background-color: #909399;
  color: white;
}

.reset-btn:hover {
  background-color: #73767a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px 0 rgba(144, 147, 153, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings {
    padding: 20px 10px;
  }
  
  .settings-header h1 {
    font-size: 28px;
  }
  
  .settings-section {
    padding: 20px;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .setting-item select {
    width: 100%;
  }
  
  .toggle-switch {
    align-self: flex-end;
  }
  
  .settings-actions {
    flex-direction: column;
  }
  
  .save-btn,
  .reset-btn {
    width: 100%;
  }
}
</style>