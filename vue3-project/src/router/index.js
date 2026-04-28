import { createRouter, createWebHistory } from 'vue-router'
import Layout from '../components/Layout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/HomeView.vue'),
        },
        {
          path: 'tasks',
          name: 'TaskList',
          component: () => import('../views/TaskListView.vue'),
        },
        {
          path: 'statistics',
          name: 'Statistics',
          component: () => import('../views/StatisticsView.vue'),
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('../views/SettingsView.vue'),
        },
      ],
    },
    {
      path: '/task/:id',
      name: 'TaskDetail',
      component: () => import('../views/TaskDetail.vue'),
      meta: { title: '任务详情' }
    },
  ],
})

export default router
