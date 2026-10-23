import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../application/stores/auth.store'

export function useAuthPage() {
  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()

  function redirectAfterAuth(): void {
    const requested = route.query.redirect
    const target = typeof requested === 'string' && requested.startsWith('/') ? requested : '/tasks'
    void router.replace(target)
  }

  return { authStore, redirectAfterAuth }
}
