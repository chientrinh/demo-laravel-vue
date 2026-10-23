import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { registerGuards } from './guards'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

registerGuards(router)

export default router
