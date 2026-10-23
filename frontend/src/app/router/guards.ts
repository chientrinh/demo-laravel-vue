import type { Router } from 'vue-router'
import { useAuthStore } from '@/modules/auth'

export function registerGuards(router: Router): void {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    if (!authStore.initialized) {
      await authStore.initialize()
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const requiresAdmin = to.matched.some((record) => record.meta.requiresAdmin)
    const guestOnly = to.matched.some((record) => record.meta.guestOnly)

    if (requiresAuth && !authStore.isAuthenticated) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }

    if (guestOnly && authStore.isAuthenticated) {
      return { name: 'tasks' }
    }

    if (requiresAdmin && !authStore.isAdmin) {
      return { name: 'tasks' }
    }

    return true
  })
}
