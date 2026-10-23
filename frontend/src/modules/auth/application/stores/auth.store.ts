import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import authService from '../services/auth.service'
import type { LoginCredentials, RegisterPayload, User } from '../../domain/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const displayName = computed(() => user.value?.name ?? 'Guest')

  function applySession(sessionUser: User): void {
    user.value = sessionUser
  }

  function clearSession(): void {
    user.value = null
  }

  async function login(credentials: LoginCredentials): Promise<User> {
    loading.value = true
    try {
      const session = await authService.login(credentials)
      applySession(session.user)
      initialized.value = true
      return session.user
    } finally {
      loading.value = false
    }
  }

  async function register(payload: RegisterPayload): Promise<User> {
    loading.value = true
    try {
      const session = await authService.register(payload)
      applySession(session.user)
      initialized.value = true
      return session.user
    } finally {
      loading.value = false
    }
  }

  async function initialize(): Promise<void> {
    if (initialized.value) return
    try {
      user.value = await authService.me()
    } catch {
      clearSession()
    } finally {
      initialized.value = true
    }
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout()
    } finally {
      clearSession()
      initialized.value = true
    }
  }

  return {
    user,
    initialized,
    loading,
    isAuthenticated,
    isAdmin,
    displayName,
    login,
    register,
    initialize,
    logout,
    clearSession,
  }
})