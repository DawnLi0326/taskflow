<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useSettingsStore } from './stores/settings'

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.applyTheme()
})
</script>

<template>
  <RouterView />
</template>