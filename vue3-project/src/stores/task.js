import { defineStore } from 'pinia'

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [
      { id: 1, title: '完成项目计划', completed: true, dueDate: '2026-04-01', priority: 'high' },
      { id: 2, title: '设计用户界面', completed: false, dueDate: '2026-04-10', priority: 'medium' },
      { id: 3, title: '实现任务管理功能', completed: false, dueDate: '2026-04-15', priority: 'high' },
      { id: 4, title: '测试任务管理系统', completed: false, dueDate: '2026-04-20', priority: 'low' }
    ]
  }),
  actions: {
    // 添加任务
    addTask(task) {
      this.tasks.push(task)
      this.saveToLocalStorage()
    },
    // 更新任务
    updateTask(updatedTask) {
      const index = this.tasks.findIndex(task => task.id === updatedTask.id)
      if (index !== -1) {
        this.tasks[index] = updatedTask
        this.saveToLocalStorage()
      }
    },
    // 删除任务
    deleteTask(taskId) {
      this.tasks = this.tasks.filter(task => task.id !== taskId)
      this.saveToLocalStorage()
    },
    // 更新任务状态
    updateStatus(taskId, completed) {
      const task = this.tasks.find(task => task.id === taskId)
      if (task) {
        task.completed = completed
        this.saveToLocalStorage()
      }
    },
    // 导入任务
    importTasks(tasks) {
      this.tasks = tasks
      this.saveToLocalStorage()
    },
    // 保存到本地存储
    saveToLocalStorage() {
      localStorage.setItem('tasks', JSON.stringify(this.tasks))
    },
    // 从本地存储加载
    loadFromLocalStorage() {
      const savedTasks = localStorage.getItem('tasks')
      if (savedTasks) {
        this.tasks = JSON.parse(savedTasks)
      }
    },
    // 设置任务数组（用于拖拽排序）
    setTasks(tasks) {
      this.tasks = tasks
      this.saveToLocalStorage()
    }
  }
})
