<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useTaskStore } from '../stores/task'
import { useSettingsStore } from '../stores/settings'

const router = useRouter()
const taskStore = useTaskStore()
const settingsStore = useSettingsStore()

// Chart refs
const pieChartRef = ref()
const barChartRef = ref()
const barDailyRef = ref()
const lineChartRef = ref()

let pieChart = null
let barChart = null
let barDailyChart = null
let lineChart = null

const isDark = computed(() => settingsStore.darkMode)

const textColor = computed(() => isDark.value ? '#94a3b8' : '#64748b')
const titleColor = computed(() => isDark.value ? '#f1f5f9' : '#0f172a')
const bgColor = computed(() => isDark.value ? '#1e293b' : '#ffffff')
const borderColor = computed(() => isDark.value ? '#334155' : '#e2e8f0')
const tooltipBg = computed(() => isDark.value ? '#1e293b' : '#fff')
const tooltipBorder = computed(() => isDark.value ? '#334155' : '#e2e8f0')

const overdueCount = computed(() => taskStore.overdueTasks.length)

// Compute last 7 days labels and data
const last7Days = computed(() => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
})

const dayLabels = computed(() =>
  last7Days.value.map(d => {
    const dt = new Date(d)
    return `${dt.getMonth() + 1}/${dt.getDate()}`
  })
)

const completedPerDay = computed(() =>
  last7Days.value.map(day => {
    return taskStore.tasks.filter(t => {
      if (!t.completedAt) return false
      return t.completedAt.split('T')[0] === day
    }).length
  })
)

const completionRatePerDay = computed(() =>
  last7Days.value.map(day => {
    const due = taskStore.tasks.filter(t => t.dueDate === day)
    if (due.length === 0) return 0
    const done = due.filter(t => t.completed).length
    return Math.round((done / due.length) * 100)
  })
)

function getBaseOption() {
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Inter, sans-serif' },
  }
}

function initPieChart() {
  if (!pieChartRef.value) return
  pieChart = echarts.init(pieChartRef.value)
  updatePieChart()
}

function updatePieChart() {
  if (!pieChart) return
  const completed = taskStore.completedCount
  const incomplete = taskStore.incompleteCount

  pieChart.setOption({
    ...getBaseOption(),
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg.value,
      borderColor: tooltipBorder.value,
      textStyle: { color: titleColor.value },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 8,
      textStyle: { color: textColor.value },
    },
    series: [{
      name: '任务完成',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: bgColor.value,
        borderWidth: 2,
      },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold', color: titleColor.value },
      },
      data: [
        { value: completed, name: '已完成', itemStyle: { color: '#10b981' } },
        { value: incomplete, name: '未完成', itemStyle: { color: '#2563eb' } },
      ],
    }],
  })
}

function initBarChart() {
  if (!barChartRef.value) return
  barChart = echarts.init(barChartRef.value)
  updateBarChart()
}

function updateBarChart() {
  if (!barChart) return
  const dist = taskStore.incompletePriorityDistribution
  const total = taskStore.incompleteCount

  barChart.setOption({
    ...getBaseOption(),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: tooltipBg.value,
      borderColor: tooltipBorder.value,
      textStyle: { color: titleColor.value },
    },
    grid: { left: '3%', right: '10%', top: '8%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'value',
      max: total || 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: borderColor.value } },
      axisLabel: { color: textColor.value },
    },
    yAxis: {
      type: 'category',
      data: ['低优先级', '中优先级', '高优先级'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: textColor.value },
    },
    series: [{
      name: '任务数',
      type: 'bar',
      barWidth: '40%',
      itemStyle: { borderRadius: [0, 6, 6, 0] },
      label: { show: true, position: 'right', color: textColor.value },
      data: [
        { value: dist.low, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#34d399' }] } } },
        { value: dist.medium, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#f59e0b' }, { offset: 1, color: '#fbbf24' }] } } },
        { value: dist.high, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#ef4444' }, { offset: 1, color: '#f87171' }] } } },
      ],
    }],
  })
}

function initBarDailyChart() {
  if (!barDailyRef.value) return
  barDailyChart = echarts.init(barDailyRef.value)
  updateBarDailyChart()
}

function updateBarDailyChart() {
  if (!barDailyChart) return

  barDailyChart.setOption({
    ...getBaseOption(),
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: tooltipBg.value,
      borderColor: tooltipBorder.value,
      textStyle: { color: titleColor.value },
      formatter: (params) => {
        const p = params[0]
        return `${p.name}<br/>完成 ${p.value} 个任务`
      },
    },
    grid: { left: '3%', right: '4%', top: '10%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dayLabels.value,
      axisLine: { lineStyle: { color: borderColor.value } },
      axisTick: { show: false },
      axisLabel: { color: textColor.value },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: borderColor.value } },
      axisLabel: { color: textColor.value },
    },
    series: [{
      name: '完成数量',
      type: 'bar',
      barWidth: '50%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#2563eb' },
            { offset: 1, color: '#0ea5e9' },
          ],
        },
      },
      emphasis: {
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1d4ed8' },
              { offset: 1, color: '#0284c7' },
            ],
          },
        },
      },
      data: completedPerDay.value,
    }],
  })
}

function initLineChart() {
  if (!lineChartRef.value) return
  lineChart = echarts.init(lineChartRef.value)
  updateLineChart()
}

function updateLineChart() {
  if (!lineChart) return

  lineChart.setOption({
    ...getBaseOption(),
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg.value,
      borderColor: tooltipBorder.value,
      textStyle: { color: titleColor.value },
      formatter: (params) => {
        const p = params[0]
        return `${p.name}<br/>完成率 ${p.value}%`
      },
    },
    grid: { left: '3%', right: '4%', top: '10%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      data: dayLabels.value,
      axisLine: { lineStyle: { color: borderColor.value } },
      axisTick: { show: false },
      axisLabel: { color: textColor.value },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: borderColor.value } },
      axisLabel: { color: textColor.value, formatter: '{value}%' },
    },
    series: [{
      name: '完成率',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      lineStyle: { color: '#10b981', width: 2.5 },
      itemStyle: { color: '#10b981', borderWidth: 2, borderColor: bgColor.value },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(16,185,129,0.3)' },
            { offset: 1, color: 'rgba(16,185,129,0)' },
          ],
        },
      },
      data: completionRatePerDay.value,
    }],
  })
}

function resizeCharts() {
  pieChart?.resize()
  barChart?.resize()
  barDailyChart?.resize()
  lineChart?.resize()
}

onMounted(async () => {
  await nextTick()
  initPieChart()
  initBarChart()
  initBarDailyChart()
  initLineChart()
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCharts)
  pieChart?.dispose()
  barChart?.dispose()
  barDailyChart?.dispose()
  lineChart?.dispose()
})

// Update charts when data or theme changes
watch([() => taskStore.tasks, isDark], async () => {
  await nextTick()
  updatePieChart()
  updateBarChart()
  updateBarDailyChart()
  updateLineChart()
}, { deep: true })

function goToOverdue() {
  router.push('/tasks?filter=overdue')
}
</script>

<template>
  <div class="statistics-page">
    <div class="page-header">
      <h2>数据统计</h2>
      <p class="page-subtitle">任务完成情况分析</p>
    </div>

    <!-- Overdue Alert -->
    <div
      v-if="overdueCount > 0"
      class="overdue-alert"
      @click="goToOverdue"
    >
      <div class="alert-content">
        <el-icon size="20" color="#ef4444"><Warning /></el-icon>
        <span>
          当前有 <strong>{{ overdueCount }}</strong> 个逾期任务未完成
        </span>
      </div>
      <div class="alert-action">
        <span>查看逾期任务</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="charts-grid">
      <!-- Pie Chart -->
      <div class="chart-card">
        <h3 class="chart-title">任务完成比例</h3>
        <div ref="pieChartRef" class="chart-container"></div>
      </div>

      <!-- Priority Bar Chart -->
      <div class="chart-card">
        <h3 class="chart-title">优先级分布（未完成）</h3>
        <div ref="barChartRef" class="chart-container"></div>
      </div>

      <!-- Daily Completion Bar Chart -->
      <div class="chart-card chart-wide">
        <h3 class="chart-title">近7天完成任务数量</h3>
        <div ref="barDailyRef" class="chart-container"></div>
      </div>

      <!-- Completion Rate Line Chart -->
      <div class="chart-card chart-wide">
        <h3 class="chart-title">近7天任务完成率</h3>
        <div ref="lineChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="summary-row">
      <div class="summary-stat">
        <span class="ss-value">{{ taskStore.totalCount }}</span>
        <span class="ss-label">总任务数</span>
      </div>
      <div class="summary-stat">
        <span class="ss-value text-success">{{ taskStore.completedCount }}</span>
        <span class="ss-label">已完成</span>
      </div>
      <div class="summary-stat">
        <span class="ss-value text-primary">{{ taskStore.incompleteCount }}</span>
        <span class="ss-label">未完成</span>
      </div>
      <div class="summary-stat">
        <span class="ss-value text-error">{{ taskStore.overdueTasks.length }}</span>
        <span class="ss-label">已逾期</span>
      </div>
      <div class="summary-stat">
        <span class="ss-value">
          {{ taskStore.totalCount > 0 ? Math.round((taskStore.completedCount / taskStore.totalCount) * 100) : 0 }}%
        </span>
        <span class="ss-label">总完成率</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.statistics-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* Overdue Alert */
.overdue-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-error-light);
  border: 1px solid var(--color-error-border);
  border-left: 4px solid var(--color-error);
  border-radius: 10px;
  padding: 14px 18px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.overdue-alert:hover {
  transform: translateX(2px);
  box-shadow: var(--shadow-sm);
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text);
}

.alert-content strong {
  color: var(--color-error);
  font-weight: 700;
}

.alert-action {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--color-error);
  font-weight: 500;
}

/* Charts Grid */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.chart-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.chart-wide {
  grid-column: span 2;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 12px;
}

.chart-container {
  height: 240px;
}

.chart-wide .chart-container {
  height: 220px;
}

/* Summary */
.summary-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.summary-stat {
  flex: 1;
  min-width: 120px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow-card);
}

.ss-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.ss-label {
  font-size: 12px;
  color: var(--color-text-muted);
}

.text-success { color: #10b981; }
.text-primary { color: #2563eb; }
.text-error { color: #ef4444; }

@media (max-width: 768px) {
  .statistics-page {
    padding: 16px;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .chart-wide {
    grid-column: span 1;
  }

  .summary-row {
    gap: 10px;
  }
}
</style>