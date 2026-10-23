import { reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import taskService from '../services/task.service'
import type { Task, TaskFilters, TaskListMeta } from '../../domain/types'
import { getApiErrorMessage } from '@/adapters/infrastructures/clients/HttpClient'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const meta = ref<TaskListMeta>({ currentPage: 1, lastPage: 1, perPage: 10, total: 0 })
  const filters = reactive<TaskFilters>({ page: 1, per_page: 10 })
  const loading = ref(false)
  const initialLoading = ref(true)
  const error = ref<string | null>(null)
  let requestId = 0

  async function fetchTasks(): Promise<void> {
    const currentRequest = ++requestId
    loading.value = true
    error.value = null
    try {
      const result = await taskService.list({ ...filters })
      if (currentRequest !== requestId) return
      tasks.value = result.tasks
      meta.value = result.meta
      filters.page = result.meta.currentPage
    } catch (caught) {
      if (currentRequest !== requestId) return
      error.value = getApiErrorMessage(caught)
      tasks.value = []
    } finally {
      if (currentRequest === requestId) {
        loading.value = false
        initialLoading.value = false
      }
    }
  }

  function resetFilters(): void {
    filters.page = 1
    filters.per_page = 10
    filters.search = undefined
    filters.status = undefined
    filters.priority = undefined
    filters.assigned_to = undefined
    filters.sort_by = undefined
    filters.sort_order = undefined
  }

  async function refreshAfterMutation(): Promise<void> {
    await fetchTasks()
  }

  return {
    tasks,
    meta,
    filters,
    loading,
    initialLoading,
    error,
    fetchTasks,
    resetFilters,
    refreshAfterMutation,
  }
})
