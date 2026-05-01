<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useSettingsStore } from './stores/settings'
import { useTaskStore } from './stores/task'

const settingsStore = useSettingsStore()
const taskStore = useTaskStore()

onMounted(async () => {
  settingsStore.applyTheme()
  await taskStore.initTasks()
})
</script>

<template>
  <RouterView />
</template>