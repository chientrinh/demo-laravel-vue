import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth'
import { useTaskStore } from '../../application/stores/task.store'
import taskService from '../../application/services/task.service'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '../../domain/types'
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '@/shared/constants/task'
import { useDebounce } from '@/shared/composables/useDebounce'
import { useToast } from '@/shared/composables/useToast'
import { isOverdue } from '@/shared/utils/date'
import { collectAssignees, type AssigneeOption } from '@/shared/utils/task'
import { getApiErrorMessage } from '@/adapters/infrastructures/clients/HttpClient'

function isStatus(value: unknown): value is TaskStatus {
  return STATUS_OPTIONS.some((option) => option.value === value)
}

function isPriority(value: unknown): value is TaskPriority {
  return PRIORITY_OPTIONS.some((option) => option.value === value)
}

export function useTaskList() {
  const store = useTaskStore()
  const { tasks, meta, loading, initialLoading, error } = storeToRefs(store)
  const filters = store.filters
  const authStore = useAuthStore()
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const searchInput = ref(typeof route.query.search === 'string' ? route.query.search : '')
  const { debounced, run } = useDebounce(searchInput, 300)
  const formOpen = ref(false)
  const editingTask = ref<Task | null>(null)
  const saving = ref(false)
  const deleteTarget = ref<Task | null>(null)
  const deleting = ref(false)
  let ready = false

  const initialPage = Number(route.query.page)
  const initialPerPage = Number(route.query.per_page)
  if (Number.isFinite(initialPage) && initialPage > 0) filters.page = initialPage
  if (Number.isFinite(initialPerPage) && initialPerPage >= 5) filters.per_page = initialPerPage
  if (isStatus(route.query.status)) filters.status = route.query.status
  if (isPriority(route.query.priority)) filters.priority = route.query.priority
  if (typeof route.query.search === 'string') filters.search = route.query.search || undefined
  if (typeof route.query.assigned_to === 'string') filters.assigned_to = route.query.assigned_to
  if (route.query.assigned === 'me' && authStore.user) filters.assigned_to = authStore.user.id

  const assigneeOptions = computed<AssigneeOption[]>(() => {
    const map = new Map<string, AssigneeOption>()
    for (const assignee of collectAssignees(tasks.value)) {
      map.set(assignee.id, assignee)
    }
    if (authStore.user) {
      map.set(authStore.user.id, {
        id: authStore.user.id,
        name: authStore.user.name,
        email: authStore.user.email,
        role: authStore.user.role,
      })
    }
    if (editingTask.value?.assignee) {
      map.set(editingTask.value.assignee.id, {
        id: editingTask.value.assignee.id,
        name: editingTask.value.assignee.name,
        email: editingTask.value.assignee.email,
        role: editingTask.value.assignee.role,
      })
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  })

  const defaultAssigneeId = computed(() => authStore.user?.id ?? '')

  const stats = computed(() => ({
    total: meta.value.total,
    todo: tasks.value.filter((task) => task.status === 'todo').length,
    inProgress: tasks.value.filter((task) => task.status === 'in_progress').length,
    done: tasks.value.filter((task) => task.status === 'done').length,
    overdue: tasks.value.filter((task) => isOverdue(task.dueDate, task.status)).length,
  }))

  const hasActiveFilters = computed(
    () =>
      Boolean(filters.search) ||
      Boolean(filters.status) ||
      Boolean(filters.priority) ||
      Boolean(filters.assigned_to),
  )

  const showingRange = computed(() => {
    if (meta.value.total === 0) return '0 tasks'
    const start = (meta.value.currentPage - 1) * meta.value.perPage + 1
    const end = Math.min(meta.value.currentPage * meta.value.perPage, meta.value.total)
    return `${start}–${end} of ${meta.value.total}`
  })

  function queryForFilters(): Record<string, string> {
    const query: Record<string, string> = {}
    if (filters.search) query.search = filters.search
    if (filters.status) query.status = filters.status
    if (filters.priority) query.priority = filters.priority
    if (filters.assigned_to) query.assigned_to = filters.assigned_to
    if (filters.page > 1) query.page = String(filters.page)
    if (filters.per_page !== 10) query.per_page = String(filters.per_page)
    return query
  }

  async function syncQuery(): Promise<void> {
    await router.replace({ query: queryForFilters() })
  }

  async function refresh(sync = true): Promise<void> {
    await store.fetchTasks()
    if (sync) await syncQuery()
  }

  watch(searchInput, (value) => {
    if (ready) run(value)
  })

  watch(debounced, (value) => {
    if (!ready) return
    filters.search = value.trim() || undefined
    filters.page = 1
    void refresh()
  })

  function setStatus(value: TaskStatus | null): void {
    filters.status = value ?? undefined
    filters.page = 1
    void refresh()
  }

  function setPriority(value: TaskPriority | null): void {
    filters.priority = value ?? undefined
    filters.page = 1
    void refresh()
  }

  function setAssignee(value: string | null): void {
    filters.assigned_to = value ?? undefined
    filters.page = 1
    void refresh()
  }

  function setPage(value: number): void {
    filters.page = value
    void refresh()
  }

  function setPerPage(value: number): void {
    filters.per_page = value
    filters.page = 1
    void refresh()
  }

  function clearFilters(): void {
    store.resetFilters()
    searchInput.value = ''
    void refresh()
  }

  function openCreate(): void {
    editingTask.value = null
    formOpen.value = true
    const query = { ...route.query }
    delete query.create
    void router.replace({ query })
  }

  function openEdit(task: Task): void {
    editingTask.value = task
    formOpen.value = true
  }

  function closeForm(): void {
    formOpen.value = false
    editingTask.value = null
  }

  async function saveTask(input: TaskInput): Promise<void> {
    saving.value = true
    try {
      if (editingTask.value) {
        await taskService.update(editingTask.value.id, input)
        toast.success('Task updated successfully.')
      } else {
        filters.page = 1
        await taskService.create(input)
        toast.success('Task created successfully.')
      }
      closeForm()
      await refresh()
    } catch (caught) {
      toast.error(getApiErrorMessage(caught))
    } finally {
      saving.value = false
    }
  }

  function askDelete(task: Task): void {
    deleteTarget.value = task
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget.value) return
    deleting.value = true
    try {
      await taskService.remove(deleteTarget.value.id)
      toast.success('Task deleted.')
      deleteTarget.value = null
      if (tasks.value.length === 1 && filters.page > 1) filters.page -= 1
      await refresh()
    } catch (caught) {
      toast.error(getApiErrorMessage(caught))
    } finally {
      deleting.value = false
    }
  }

  function openDetail(task: Task): void {
    void router.push({ name: 'task-detail', params: { id: task.id } })
  }

  onMounted(async () => {
    await refresh(false)
    ready = true
    if (route.query.create === '1') openCreate()
  })

  return {
    tasks,
    meta,
    loading,
    initialLoading,
    error,
    filters,
    searchInput,
    formOpen,
    editingTask,
    saving,
    deleteTarget,
    deleting,
    assigneeOptions,
    defaultAssigneeId,
    stats,
    hasActiveFilters,
    showingRange,
    refresh,
    setStatus,
    setPriority,
    setAssignee,
    setPage,
    setPerPage,
    clearFilters,
    openCreate,
    openEdit,
    closeForm,
    saveTask,
    askDelete,
    confirmDelete,
    openDetail,
  }
}
