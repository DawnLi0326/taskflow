<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '../stores/settings'
import { useTaskStore } from '../stores/task'
import { Checked, Expand, Fold, Menu, Odometer, List, TrendCharts, Setting, Sunny, Moon } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const taskStore = useTaskStore()

const collapsed = ref(false)
const mobileMenuOpen = ref(false)

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: Odometer, label: '仪表盘' },
  { name: 'TaskList', path: '/tasks', icon: List, label: '任务列表' },
  { name: 'Statistics', path: '/statistics', icon: TrendCharts, label: '数据统计' },
  { name: 'Settings', path: '/settings', icon: Setting, label: '设置' },
]

const activeRoute = computed(() => route.path)
const overdueCount = computed(() => taskStore.overdueTasks.length)

function navigate(path) {
  router.push(path)
  mobileMenuOpen.value = false
}

function toggleSidebar() {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <div class="layout">
    <!-- Mobile overlay -->
    <div
      v-if="mobileMenuOpen"
      class="mobile-overlay"
      @click="mobileMenuOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="sidebar"
      :class="{ collapsed, 'mobile-open': mobileMenuOpen }"
    >
      <!-- Logo -->
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">
            <el-icon size="20" color="#fff"><Checked /></el-icon>
          </div>
          <Transition name="fade">
            <span v-if="!collapsed" class="logo-text">任务中心</span>
          </Transition>
        </div>
        <button class="collapse-btn" @click="toggleSidebar" title="折叠侧边栏">
          <el-icon size="16">
            <component :is="collapsed ? Expand : Fold" />
          </el-icon>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav">
        <button
          v-for="item in menuItems"
          :key="item.path"
          class="nav-item"
          :class="{ active: activeRoute.startsWith(item.path) }"
          @click="navigate(item.path)"
          :title="collapsed ? item.label : ''"
        >
          <div class="nav-icon">
            <el-icon size="18"><component :is="item.icon" /></el-icon>
            <span
              v-if="item.name === 'TaskList' && overdueCount > 0"
              class="nav-badge"
            >{{ overdueCount }}</span>
          </div>
          <Transition name="fade">
            <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
          </Transition>
        </button>
      </nav>

      <!-- Theme toggle at bottom -->
      <div class="sidebar-footer">
        <button
          class="theme-toggle"
          :title="settingsStore.darkMode ? '切换浅色' : '切换深色'"
          @click="settingsStore.toggleDarkMode()"
        >
          <el-icon size="16">
            <component :is="settingsStore.darkMode ? Sunny : Moon" />
          </el-icon>
          <Transition name="fade">
            <span v-if="!collapsed">{{ settingsStore.darkMode ? '浅色模式' : '深色模式' }}</span>
          </Transition>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="main-wrapper">
      <!-- Mobile topbar -->
      <header class="mobile-topbar">
        <button class="hamburger" @click="mobileMenuOpen = true">
          <el-icon size="20"><Menu /></el-icon>
        </button>
        <span class="mobile-title">任务中心</span>
        <button class="theme-btn-mobile" @click="settingsStore.toggleDarkMode()">
          <el-icon size="18">
            <component :is="settingsStore.darkMode ? Sunny : Moon" />
          </el-icon>
        </button>
      </header>

      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-bg);
}

/* ===== Sidebar ===== */
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background-color: var(--sidebar-bg);
  display: flex;
  flex-direction: column;
  height: 100vh;
  transition: width var(--transition-base), min-width var(--transition-base);
  overflow: hidden;
  position: relative;
  z-index: 100;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
  min-width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.logo-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--sidebar-text);
  white-space: nowrap;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--sidebar-text-muted);
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color var(--transition-fast), background var(--transition-fast);
  flex-shrink: 0;
}

.collapse-btn:hover {
  color: var(--sidebar-text);
  background: var(--sidebar-hover-bg);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  background: none;
  color: var(--sidebar-text-muted);
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-fast);
  white-space: nowrap;
  width: 100%;
  text-align: left;
  font-family: var(--font-family);
}

.nav-item:hover {
  background: var(--sidebar-hover-bg);
  color: var(--sidebar-text);
}

.nav-item.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
}

.nav-icon {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.nav-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: var(--color-error);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 0 4px;
  border-radius: 10px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-label {
  white-space: nowrap;
}

.sidebar-footer {
  padding: 12px 8px;
  border-top: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  background: none;
  color: var(--sidebar-text-muted);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
  white-space: nowrap;
  width: 100%;
  font-family: var(--font-family);
}

.theme-toggle:hover {
  background: var(--sidebar-hover-bg);
  color: var(--sidebar-text);
}

/* ===== Main ===== */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.mobile-topbar {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 56px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.hamburger, .theme-btn-mobile {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text);
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
}

.mobile-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ===== Transitions ===== */
.fade-enter-active, .fade-leave-active {
  transition: opacity var(--transition-fast);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* ===== Mobile overlay ===== */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 99;
  display: none;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -240px;
    top: 0;
    height: 100vh;
    transition: left var(--transition-base);
  }

  .sidebar.mobile-open {
    left: 0;
  }

  .sidebar.collapsed {
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
  }

  .mobile-overlay {
    display: block;
  }

  .mobile-topbar {
    display: flex;
  }

  .collapse-btn {
    display: none;
  }
}
</style>