<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useTaskStore } from '../stores/task'
import { useRouter } from 'vue-router'

const taskStore = useTaskStore()
const router = useRouter()
const tasks = computed(() => taskStore.tasks)

// 图表容器引用
const pieChartRef = ref(null)
const barChartRef = ref(null)
const priorityChartRef = ref(null)

// 图表实例
let pieChart = null
let barChart = null
let priorityChart = null

// 计算逾期任务数量（截止日期早于今天且未完成）
const overdueCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  
  return tasks.value.filter(task => {
    if (task.completed) return false
    if (!task.dueDate) return false
    return task.dueDate < todayStr
  }).length
})

// 跳转到逾期任务筛选
const goToOverdueTasks = () => {
  console.log('从统计页面跳转到逾期任务筛选')
  router.push('/tasks?filter=overdue')
}

// 计算饼图数据
const pieData = computed(() => {
  const completed = tasks.value.filter(task => task.completed).length
  const pending = tasks.value.filter(task => !task.completed).length
  return [
    { name: '已完成', value: completed },
    { name: '未完成', value: pending }
  ]
})

// 计算优先级分布数据
const priorityData = computed(() => {
  const high = tasks.value.filter(task => task.priority === 'high').length
  const medium = tasks.value.filter(task => task.priority === 'medium').length
  const low = tasks.value.filter(task => task.priority === 'low').length
  return [
    { name: '高优先级', value: high },
    { name: '中优先级', value: medium },
    { name: '低优先级', value: low }
  ]
})

// 计算近7天的日期和对应完成任务数量
const barData = computed(() => {
  // 获取近7天的日期
  const dates = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0]) // YYYY-MM-DD 格式
  }

  // 统计每天完成的任务数量
  const counts = dates.map(date => {
    return tasks.value.filter(task =>
      task.completed && task.dueDate === date
    ).length
  })

  // 格式化日期为 MM-DD
  const formattedDates = dates.map(date => {
    const [year, month, day] = date.split('-')
    return `${month}-${day}`
  })

  return {
    dates: formattedDates,
    counts
  }
})

// 计算近7天的完成率数据
const lineData = computed(() => {
  // 获取近7天的日期
  const dates = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0]) // YYYY-MM-DD 格式
  }

  // 统计每天的完成率
  const rates = dates.map(date => {
    // 获取当天截止的所有任务（有截止日期的任务）
    const tasksWithDueDate = tasks.value.filter(task => task.dueDate === date)
    const totalTasks = tasksWithDueDate.length

    if (totalTasks === 0) {
      return 0 // 如果没有截止任务，完成率视为0
    }

    // 计算已完成的任务数量
    const completedTasks = tasksWithDueDate.filter(task => task.completed).length

    // 计算完成率百分比
    return Math.round((completedTasks / totalTasks) * 100)
  })

  // 格式化日期为 MM-DD
  const formattedDates = dates.map(date => {
    const [year, month, day] = date.split('-')
    return `${month}-${day}`
  })

  return {
    dates: formattedDates,
    rates
  }
})

// 检查是否为深色模式
const isDarkMode = ref(document.documentElement.classList.contains('dark'))

// 初始化饼图
const initPieChart = () => {
  if (!pieChartRef.value) return
  
  pieChart = echarts.init(pieChartRef.value)
  updatePieChart()
  
  // 监听窗口 resize
  window.addEventListener('resize', handleResize)
}

// 初始化柱状图
const initBarChart = () => {
  if (!barChartRef.value) return
  
  barChart = echarts.init(barChartRef.value)
  updateBarChart()
  
  // 监听窗口 resize
  window.addEventListener('resize', handleResize)
}

// 初始化优先级图表
const initPriorityChart = () => {
  if (!priorityChartRef.value) return
  
  priorityChart = echarts.init(priorityChartRef.value)
  updatePriorityChart()
  
  // 监听窗口 resize
  window.addEventListener('resize', handleResize)
}

// 通用的 resize 处理
const handleResize = () => {
  pieChart?.resize()
  barChart?.resize()
  priorityChart?.resize()
}

// 更新饼图
const updatePieChart = () => {
  if (!pieChart) return
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        color: isDarkMode.value ? '#e0e0e0' : '#333'
      }
    },
    series: [
      {
        name: '任务状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: isDarkMode.value ? '#333' : '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
            color: isDarkMode.value ? '#e0e0e0' : '#333'
          }
        },
        labelLine: {
          show: false
        },
        data: pieData.value,
        color: isDarkMode.value ? ['#5470c6', '#fac858'] : ['#42b883', '#f56c6c']
      }
    ]
  }
  
  pieChart.setOption(option)
}

// 更新柱状图（双轴图表：柱状图+折线图）
const updateBarChart = () => {
  if (!barChart) return

  // 计算任务数量的最大值，用于设置Y轴范围
  const maxCount = Math.max(...barData.value.counts, 1)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['任务数量', '完成率'],
      textStyle: {
        color: isDarkMode.value ? '#e0e0e0' : '#333'
      },
      right: 10,
      top: 10
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: barData.value.dates,
      axisLabel: {
        color: isDarkMode.value ? '#e0e0e0' : '#333'
      },
      axisLine: {
        lineStyle: {
          color: isDarkMode.value ? '#666' : '#ddd'
        }
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '任务数量',
        min: 0,
        max: maxCount + 1,
        minInterval: 1,
        axisLabel: {
          color: isDarkMode.value ? '#e0e0e0' : '#333',
          formatter: (value) => Math.floor(value)
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: isDarkMode.value ? '#87ceeb' : '#64b5f6'
          }
        },
        splitLine: {
          lineStyle: {
            color: isDarkMode.value ? '#333' : '#f0f0f0'
          }
        }
      },
      {
        type: 'value',
        name: '完成率',
        min: 0,
        max: 100,
        axisLabel: {
          color: isDarkMode.value ? '#e0e0e0' : '#333',
          formatter: '{value}%'
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: isDarkMode.value ? '#ffa07a' : '#f56c6c'
          }
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '任务数量',
        type: 'bar',
        barWidth: '35%',
        data: barData.value.counts,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: isDarkMode.value ? '#87ceeb' : '#64b5f6' },
              { offset: 1, color: isDarkMode.value ? '#5cabeb' : '#4facfe' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: '完成率',
        type: 'line',
        yAxisIndex: 1,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 10,
        data: lineData.value.rates,
        itemStyle: {
          color: isDarkMode.value ? '#ffa07a' : '#f56c6c'
        },
        lineStyle: {
          color: isDarkMode.value ? '#ffa07a' : '#f56c6c',
          width: 3
        },
        label: {
          show: true,
          position: 'top',
          distance: 8,
          color: isDarkMode.value ? '#ffa07a' : '#f56c6c',
          fontWeight: 'bold',
          formatter: '{c}%'
        }
      }
    ]
  }

  barChart.setOption(option)
}

// 更新优先级图表（水平条形图）
const updatePriorityChart = () => {
  if (!priorityChart) return
  
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: '{a} <br/>{b}: {c} 个'
    },
    grid: {
      left: '3%',
      right: '10%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        color: isDarkMode.value ? '#e0e0e0' : '#333',
        formatter: (value) => Math.floor(value)
      },
      axisLine: {
        lineStyle: {
          color: isDarkMode.value ? '#666' : '#ddd'
        }
      },
      splitLine: {
        lineStyle: {
          color: isDarkMode.value ? '#444' : '#f0f0f0'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: priorityData.value.map(item => item.name),
      axisLabel: {
        color: isDarkMode.value ? '#e0e0e0' : '#333'
      },
      axisLine: {
        lineStyle: {
          color: isDarkMode.value ? '#666' : '#ddd'
        }
      }
    },
    series: [
      {
        name: '任务数量',
        type: 'bar',
        barWidth: '50%',
        data: priorityData.value.map(item => item.value),
        itemStyle: {
          color: (params) => {
            const colors = isDarkMode.value 
              ? ['#f56c6c', '#e6a23c', '#67c23a'] 
              : ['#f56c6c', '#e6a23c', '#67c23a']
            return colors[params.dataIndex]
          },
          borderRadius: [0, 5, 5, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: isDarkMode.value ? '#e0e0e0' : '#333',
          formatter: '{c} 个'
        }
      }
    ]
  }
  
  priorityChart.setOption(option)
}

// 监听任务数据变化
watch(tasks, () => {
  updatePieChart()
  updateBarChart()
  updatePriorityChart()
}, { deep: true })

// 监听深色模式变化
const checkDarkMode = () => {
  isDarkMode.value = document.documentElement.classList.contains('dark')
  updatePieChart()
  updateBarChart()
  updatePriorityChart()
}

onMounted(() => {
  taskStore.loadFromLocalStorage()
  initPieChart()
  initBarChart()
  initPriorityChart()
  
  // 监听深色模式变化
  const observer = new MutationObserver(checkDarkMode)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })
  
  // 清理函数
  onUnmounted(() => {
    observer.disconnect()
    pieChart?.dispose()
    barChart?.dispose()
    priorityChart?.dispose()
    window.removeEventListener('resize', handleResize)
  })
})
</script>

<template>
  <div class="statistics">
    <div class="statistics-header">
      <h1>数据统计</h1>
      <p>任务完成情况和统计分析</p>
    </div>
    
    <!-- 逾期任务提醒卡片 -->
    <!-- 说明：如果需要 TaskList.vue 支持 filter=overdue 参数筛选，需要在该页面中添加对应逻辑 -->
    <div v-if="tasks.length > 0" class="overdue-alert">
      <div class="overdue-content">
        <span class="overdue-icon">⚠️</span>
        <span class="overdue-text">
          <template v-if="overdueCount > 0">
            逾期任务：<strong>{{ overdueCount }}</strong> 个
          </template>
          <template v-else>
            暂无逾期任务，继续保持！🎉
          </template>
        </span>
      </div>
      <el-button 
        v-if="overdueCount > 0" 
        type="primary" 
        link 
        @click="goToOverdueTasks"
      >
        点击查看 →
      </el-button>
    </div>
    
    <div class="statistics-content">
      <!-- 第一行：任务完成比例 + 任务优先级分布 -->
      <el-row :gutter="20">
        <el-col :xs="24" :md="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>任务完成比例</span>
              </div>
            </template>
            <div v-if="tasks.length > 0" ref="pieChartRef" class="chart-container"></div>
            <div v-else class="empty-state">
              <el-empty description="暂无数据" />
            </div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :md="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>任务优先级分布</span>
              </div>
            </template>
            <div v-if="tasks.length > 0" ref="priorityChartRef" class="chart-container"></div>
            <div v-else class="empty-state">
              <el-empty description="暂无数据" />
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 第二行：近7天完成任务数量和完成率趋势（双轴图表） -->
      <el-row :gutter="20">
        <el-col :span="24">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="card-header">
                <span>近7天任务完成情况</span>
              </div>
            </template>
            <div v-if="tasks.length > 0" ref="barChartRef" class="chart-container"></div>
            <div v-else class="empty-state">
              <el-empty description="暂无数据" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.statistics {
  padding: 40px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.statistics-header {
  text-align: center;
  margin-bottom: 60px;
}

.statistics-header h1 {
  font-size: 36px;
  margin-bottom: 20px;
  color: var(--text-primary);
  transition: color 0.3s;
}

.statistics-header p {
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 800px;
  margin: 0 auto;
  transition: color 0.3s;
}

/* 逾期任务提醒卡片样式 */
.overdue-alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fdf6ec;
  border: 1px solid #f5dab1;
  border-radius: 12px;
  padding: 16px 24px;
  margin-bottom: 30px;
  transition: all 0.3s ease;
}

.dark .overdue-alert {
  background-color: #3d2c1f;
  border-color: #5c4033;
}

.overdue-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.overdue-icon {
  font-size: 24px;
}

.overdue-text {
  font-size: 16px;
  color: #e6a23c;
}

.dark .overdue-text {
  color: #f0b774;
}

.overdue-text strong {
  font-size: 20px;
  font-weight: bold;
  margin: 0 4px;
}

.statistics-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.chart-card {
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
}

.chart-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transform: translateY(-4px);
}

.card-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s;
}

.chart-container {
  height: 350px;
  width: 100%;
}

.empty-state {
  height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .statistics {
    padding: 20px 10px;
  }
  
  .statistics-header h1 {
    font-size: 28px;
  }
  
  .chart-container {
    height: 300px;
  }
  
  .empty-state {
    height: 300px;
  }
}
</style>