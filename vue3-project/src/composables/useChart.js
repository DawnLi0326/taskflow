import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

export function useChart(chartRef, updateFn, dependencies = []) {
  let chart = null

  function initChart() {
    if (!chartRef.value) return
    chart = echarts.init(chartRef.value)
    updateChart()
  }

  function updateChart() {
    if (!chart) return
    updateFn(chart)
  }

  function resize() {
    chart?.resize()
  }

  onMounted(() => {
    initChart()
    window.addEventListener('resize', resize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', resize)
    chart?.dispose()
  })

  watch(dependencies, () => {
    updateChart()
  }, { deep: true })

  return { chart, updateChart, resize }
}
