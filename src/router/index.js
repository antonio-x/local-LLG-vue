import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore'

const routes = [
  { path: '/', redirect: '/chat' },
  { path: '/login', component: () => import('../components/Login.vue') },
  { path: '/chat', component: () => import('../components/Chat.vue'), meta: { requireAuth: true } },
  {
    path: '/user-manage',
    component: () => import('../components/UserManage.vue'),
    meta: { requireAuth: true, requireAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.meta.requireAuth) {
    if (!userStore.token) {
      return next('/login')
    }
    if (to.meta.requireAdmin && userStore.role !== 'super_admin') {
      return next('/chat')
    }
  }
  next()
})

export default router
