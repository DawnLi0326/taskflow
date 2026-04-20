<script setup>
//导入必要的工具 ：
//从Vue中导入了 ref 和 watch 两个函数， ref 用于创建响应式变量， watch 用于监听数据变化
import { ref, watch } from 'vue'
// 从Vue Router中导入了 useRoute 和 useRouter ，用于处理页面路由
import { useRoute, useRouter } from 'vue-router'
// 导入主题 store
import { useThemeStore } from '../stores/theme'
//route 用于获取当前页面的路由信息
const route = useRoute()
//router 用于控制页面跳转
const router = useRouter()
// 主题 store
const themeStore = useThemeStore()
//activeMenu 是一个响应式变量，记录当前选中的菜单项，页面加载后默认选中"任务列表"
const activeMenu = ref('tasks') 

// 定义菜单数据 ：
// 创建了一个包含三个菜单项的数组，分别是"首页"、"任务列表"和"数据统计"
// 每个菜单项都有一个唯一的id、显示名称和图标
const menuItems = [
  { id: 'dashboard', name: '首页', icon: '🏠' },
  { id: 'tasks', name: '任务列表', icon: '📋' },
  { id: 'statistics', name: '数据统计', icon: '📊' },
  { id: 'settings', name: '设置', icon: '⚙️' }
]

// 监听路由变化watch()
//路由变化 ： route.path 的值会改变（比如从 /tasks 变成 /dashboard ）
//触发监听 ： watch 监听到 route.path 变化，执行回调函数newPath。
//这里监听用了getter函数，返回 route.path 的值
watch(() => route.path, (newPath) => { 
  //参数传递 ：回调函数的 newPath 参数会收到新的路径值（比如 /dashboard ）。
  //处理路径 ： newPath.replace('/', '') 把路径开头的斜杠去掉，得到 dashboard 。
  const path = newPath.replace('/', '')
  // 检查路径 ：判断处理后的路径是否在菜单 id 数组中。
  const menuIds = ['dashboard', 'tasks', 'statistics', 'settings']
  if (menuIds.includes(path)) {
    //更新状态 ：如果在数组中，就把 activeMenu.value 设置为当前路径，这样对应的菜单项就会高亮。
    activeMenu.value = path
  }
})

// 处理菜单点击
// 这是一个 箭头函数 ，定义了一个名为 handleMenuSelect 的函数 (key) 是函数的参数，代表被点击的菜单项的 id （比如 'tasks' 或 'dashboard' ）
const handleMenuSelect = (key) => {
  //把 activeMenu 的值设置为当前点击的菜单项 id ，这样对应的菜单项就会被高亮显示（通过模板中的
  activeMenu.value = key
  //router.push() 方法跳转到对应的页面 比如 key 是 'tasks' ，那么 `/${key}` 就会变成 '/tasks'
  router.push(`/${key}`)
}

// 切换主题
const toggleTheme = () => {
  themeStore.toggleTheme()
}
</script>

<template>
  <div class="layout-container">
    <!-- 顶部导航栏 -->
    <header class="header">
      <h1>任务仪表板</h1>
      <!-- 主题切换按钮 -->
      <!-- 主题切换按钮 -->
    <button class="theme-toggle" @click="toggleTheme" aria-label="切换主题">
    {{ themeStore.isDark ? '🌙' : '🌞' }}
     </button>
    </header>
    
    <div class="content-container">
      <!-- 左侧菜单栏 -->
      <aside class="sidebar">
        <nav class="menu">
          <ul>
            <li 
             v-for="item in menuItems"
             :key="item.id"
             :class="{active:activeMenu.value===item.id}"
             @click="handleMenuSelect(item.id)"
            >
              <span class="menu-icon">{{ item.icon }}</span>
              <span class="menu-text">{{ item.name }}</span>
            </li>
          </ul>
        </nav>
      </aside>
      
      <!-- 右侧内容区 -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

.header {
  height: 60px;
  background-color: var(--header-bg);
  color: var(--header-text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  transition: background-color 0.3s, color 0.3s;
}

.header h1 {
  margin: 0;
  font-size: 18px;
}

/* 主题切换按钮 */
.theme-toggle {
  background: none;
  border: none;
  color: var(--header-text);
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.theme-toggle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.content-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 160px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  transition: background-color 0.3s, border-color 0.3s;
}

.menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu li {
  height: 50px;
  line-height: 50px;
  padding: 0 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
}

.menu li:hover {
  background-color: var(--menu-hover-bg);
}

.menu li.active {
  background-color: var(--menu-active-bg);
  color: var(--menu-active-text);
  font-weight: bold;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.menu-text {
  font-size: 14px;
}

.main-content {
  flex: 1;
  padding: 40px;
  background-color: var(--bg-secondary);
  overflow-y: auto;
  transition: background-color 0.3s;
}
</style>
