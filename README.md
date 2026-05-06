# 任务仪表盘 (Task Dashboard)

一个基于 Vue 3 的任务管理工具，支持任务的增删改查、拖拽排序、数据统计图表和深色主题。

## ✨ 功能特性

- ✅ 任务的增、删、改、查
- 🔄 拖拽排序（只对未完成任务生效，顺序自动保存）
- 📊 数据统计图表（任务完成比例、优先级分布、近7天趋势）
- 🌙 深色 / 浅色主题切换
- 💾 数据持久化（localStorage，刷新不丢失）
- 📱 响应式布局（PC + 手机）

## 🛠 技术栈

- Vue 3 + Composition API
- Pinia（状态管理）
- Vue Router 4
- Element Plus（UI组件）
- ECharts（图表）
- Vite（构建工具）
- Cloudflare Pages（部署）

## 🔗 链接

- GitHub 仓库：[DawnLi0326/taskflow](https://github.com/DawnLi0326/taskflow)
- 在线预览：[8dd41185.taskflow1.pages.dev](https://8dd41185.taskflow1.pages.dev)

## 🖥 本地运行

```bash
# 克隆项目
git clone https://github.com/DawnLi0326/taskflow.git
cd taskflow/vue3-project

# 安装依赖
npm install

# 启动开发服务
npm run dev
