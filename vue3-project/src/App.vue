<script setup>
import Layout from './components/Layout.vue'
</script>

<template>
  <Layout />
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 主题 CSS 变量 */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f7fa;
  --bg-card: #ffffff;
  --text-primary: #333333;
  --text-secondary: #666666;
  --border-color: #e4e7ed;
  --header-bg: #1976d2;
  --header-text: #ffffff;
  --menu-active-bg: #e3f2fd;
  --menu-active-text: #1976d2;
  --menu-hover-bg: #f5f7fa;
  --button-primary: #1976d2;
  --button-primary-text: #ffffff;
}

/* 深色主题 */
.dark {
  --bg-primary: #0f1419;
  --bg-secondary: #11161c;
  --bg-card: #1e2732;
  --text-primary: #e7e9ea;
  --text-secondary: #9ba3af;
  --border-color: #2d3741;
  --header-bg: #1565c0;
  --header-text: #ffffff;
  --menu-active-bg: #1565c0;
  --menu-active-text: #ffffff;
  --menu-hover-bg: #11161c;
  --button-primary: #3b82f6;
  --button-primary-hover: #60a5fa;
  --button-primary-text: #ffffff;
}

/* 平滑过渡 */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

/* 自定义滚动条（深色模式） */
.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.dark ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #3a4553;
}

body {
  font-family: Arial, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}
</style>