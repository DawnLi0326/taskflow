<script setup>
// 暂时注释掉 Pinia 相关代码，以排除状态管理问题
// import { useCounterStore } from '../stores/counter'
// const counter = useCounterStore()

// 使用本地状态代替 Pinia
import { ref, computed } from 'vue'
const count = ref(0)
const doubleCount = computed(() => count.value * 2)

function increment() {
  count.value++
}

function decrement() {
  count.value--
}

function reset() {
  count.value = 0
}
</script>

<template>
  <div class="home">
    <h1 style="text-align: center; margin-bottom: 20px;">首页</h1>
    <p style="text-align: center; margin-bottom: 40px;">欢迎使用Vue3 + Vite + Vue Router + Pinia项目！</p>
    
    <div class="counter">
      <h2 style="text-align: center; margin-bottom: 20px;">计数器示例</h2>
      <p style="text-align: center; margin: 10px 0;">当前计数: {{ count }}</p>
      <p style="text-align: center; margin: 10px 0 30px 0;">双倍计数: {{ doubleCount }}</p>
      <div style="display: flex; justify-content: center; gap: 10px;">
        <button @click="increment()">增加</button>
        <button @click="decrement()">减少</button>
        <button @click="reset()">重置</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  min-height: 100%;
}

.counter {
  background-color: var(--bg-card);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 40px;
  max-width: 600px;
  margin: 0 auto;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.counter:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transform: translateY(-4px);
  border-color: var(--button-primary);
}

button {
  margin: 0 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--button-primary);
  color: var(--button-primary-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover {
  background-color: var(--button-primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px 0 rgba(59, 130, 246, 0.3);
}
</style>
