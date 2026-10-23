import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore, type UserRole } from '@/modules/auth'
import userService from '../../application/services/user.service'
import type { User, UserFilters, UserListMeta } from '../../domain/types'
import { useDebounce } from '@/shared/composables/useDebounce'
import { useToast } from '@/shared/composables/useToast'
import { ApiError } from '@/shared/utils/errors'
import { formatTimestamp } from '@/shared/utils/date'
import { getApiErrorMessage } from '@/adapters/infrastructures/clients/HttpClient'

const ROLE_OPTIONS: { title: string; value: UserRole | null }[] = [
  { title: 'All Roles', value: null },
  { title: 'Admin', value: 'admin' },
  { title: 'User', value: 'user' },
]

function isRole(value: unknown): value is UserRole {
  return value === 'admin' || value === 'user'
}

export function useUserList() {
  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const users = ref<User[]>([])
  const meta = ref<UserListMeta>({
    currentPage: 1,
    lastPage: 1,
    perPage: 10,
    total: 0,
  })
  const loading = ref(false)
  const initialLoading = ref(true)
  const error = ref<string | null>(null)
  const exporting = ref(false)
  const deleteTarget = ref<User | null>(null)
  const deleting = ref(false)
  let ready = false

  const filters = ref<UserFilters>({
    page: 1,
    per_page: 10,
  })

  const searchInput = ref(typeof route.query.search === 'string' ? route.query.search : '')
  const { debounced, run } = useDebounce(searchInput, 300)

  const initialPage = Number(route.query.page)
  const initialPerPage = Number(route.query.per_page)
  if (Number.isFinite(initialPage) && initialPage > 0) filters.value.page = initialPage
  if (Number.isFinite(initialPerPage) && initialPerPage > 0) filters.value.per_page = initialPerPage
  if (isRole(route.query.role)) filters.value.role = route.query.role
  if (typeof route.query.search === 'string') filters.value.search = route.query.search || undefined

  const roleFilter = computed<UserRole | null>({
    get: () => filters.value.role ?? null,
    set: (value) => setRole(value),
  })

  const hasActiveFilters = computed(
    () => Boolean(filters.value.search) || Boolean(filters.value.role),
  )

  const showingRange = computed(() => {
    if (meta.value.total === 0) return '0 users'
    const start = (meta.value.currentPage - 1) * meta.value.perPage + 1
    const end = Math.min(meta.value.currentPage * meta.value.perPage, meta.value.total)
    return `${start}-${end} of ${meta.value.total}`
  })

  function handleError(caught: unknown): void {
    if (caught instanceof ApiError && caught.statusCode === 403) {
      toast.error('You do not have permission to access this page.')
      void router.replace({ name: 'tasks' })
      return
    }
    toast.error(getApiErrorMessage(caught))
  }

  function queryForFilters(): Record<string, string> {
    const query: Record<string, string> = {}
    if (filters.value.search) query.search = filters.value.search
    if (filters.value.role) query.role = filters.value.role
    if (filters.value.page > 1) query.page = String(filters.value.page)
    if (filters.value.per_page !== 10) query.per_page = String(filters.value.per_page)
    return query
  }

  async function syncQuery(): Promise<void> {
    await router.replace({ query: queryForFilters() })
  }

  async function refresh(sync = true): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const result = await userService.listPaginated(filters.value)
      users.value = result.users
      meta.value = result.meta
      if (result.meta.currentPage !== filters.value.page) {
        filters.value.page = result.meta.currentPage
      }
      if (sync) await syncQuery()
    } catch (caught) {
      error.value = getApiErrorMessage(caught)
      handleError(caught)
    } finally {
      loading.value = false
      initialLoading.value = false
    }
  }

  watch(searchInput, (value) => {
    if (ready) run(value)
  })

  watch(debounced, (value) => {
    if (!ready) return
    filters.value.search = value.trim() || undefined
    filters.value.page = 1
    void refresh()
  })

  function setRole(value: UserRole | null): void {
    filters.value.role = value ?? undefined
    filters.value.page = 1
    void refresh()
  }

  function setPage(value: number): void {
    filters.value.page = value
    void refresh()
  }

  function setPerPage(value: number): void {
    filters.value.per_page = value
    filters.value.page = 1
    void refresh()
  }

  function clearFilters(): void {
    filters.value.search = undefined
    filters.value.role = undefined
    filters.value.page = 1
    searchInput.value = ''
    void refresh()
  }

  function canDelete(user: User): boolean {
    return authStore.user?.id !== user.id
  }

  function askDelete(user: User): void {
    if (!canDelete(user)) return
    deleteTarget.value = user
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget.value) return
    deleting.value = true
    try {
      await userService.remove(deleteTarget.value.id)
      toast.success('User deleted.')
      deleteTarget.value = null
      if (users.value.length === 1 && filters.value.page > 1) filters.value.page -= 1
      await refresh()
    } catch (caught) {
      handleError(caught)
    } finally {
      deleting.value = false
    }
  }

  async function exportCsv(): Promise<void> {
    exporting.value = true
    try {
      const exported = await userService.listPaginated({
        page: 1,
        per_page: 100,
        search: filters.value.search,
        role: filters.value.role,
      })
      const escape = (value: string): string => `"${value.replaceAll('"', '""')}"`
      const rows = [
        ['ID', 'Name', 'Email', 'Role', 'Created At'],
        ...exported.users.map((user) => [
          user.id,
          user.name,
          user.email,
          user.role,
          formatTimestamp(user.createdAt),
        ]),
      ]
      const csv = rows.map((row) => row.map((cell) => escape(String(cell))).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Users exported.')
    } catch (caught) {
      toast.error(getApiErrorMessage(caught))
    } finally {
      exporting.value = false
    }
  }

  function openEdit(user: User): void {
    void router.push({ name: 'user-edit', params: { id: user.id } })
  }

  function openCreate(): void {
    void router.push({ name: 'user-create' })
  }

  onMounted(async () => {
    await refresh(false)
    ready = true
  })

  return {
    users,
    meta,
    loading,
    initialLoading,
    error,
    filters,
    searchInput,
    roleFilter,
    roleOptions: ROLE_OPTIONS,
    hasActiveFilters,
    showingRange,
    exporting,
    deleteTarget,
    deleting,
    refresh,
    setRole,
    setPage,
    setPerPage,
    clearFilters,
    canDelete,
    askDelete,
    confirmDelete,
    exportCsv,
    openCreate,
    openEdit,
  }
}
