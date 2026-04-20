// 从 Vue 库中导入 createApp 函数，用于创建 Vue 应用实例
import { createApp } from 'vue'

// 从 Pinia 库中导入 createPinia 函数，用于创建 Pinia 状态管理实例
import { createPinia } from 'pinia'

// 导入 router 实例，该实例在 ./router/index.js 中定义，用于路由管理
import router from './router'

// 导入根组件 App，这是整个应用的入口组件
import App from './App.vue'

// 导入 Element Plus 组件库，这是一个流行的 Vue UI 组件库
import ElementPlus from 'element-plus'

// 导入 Element Plus 的 CSS 样式文件，确保组件正确显示
import 'element-plus/dist/index.css'


// 创建 Vue 应用实例 通过 createApp() 函数创建 APP是Vue 应用实例的入口点(作为参数传入的根组件）
const app = createApp(App)
//- 添加状态管理插件
app.use(createPinia())
//- 添加路由插件
app.use(router)
//- 添加 Element Plus 组件库插件
app.use(ElementPlus)
// 导入主题 store
import { useThemeStore } from './stores/theme'

//- 挂载应用到 DOM 元素
app.mount('#app')

// 初始化主题
const themeStore = useThemeStore()
themeStore.initTheme()
