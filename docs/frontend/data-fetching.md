# Data Fetching — Frontend

## Architecture

```
UI Component (Vue)
      ↓
Composable (useTasks, useTaskForm)
      ↓
Application Service (tasks.service.ts)
      ↓
Data Layer (tasks.repository.ts)
      ↓
HTTP Client (adapters/clients/HttpClient.ts)
      ↓
Laravel REST API
```

**Rule:** UI components **never** call `data/` or `axios` directly. Always go through composables → services → repositories.

---

## HTTP Client (`adapters/infrastructures/clients/HttpClient.ts`)

```typescript
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiError } from '@/shared/types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: false,
})

// Request interceptor: attach auth token
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: normalize errors, handle 401
httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const apiError = normalizeError(error)
    
    if (error.response?.status === 401) {
      handleUnauthorized()
    }
    
    return Promise.reject(apiError)
  }
)

function normalizeError(error: AxiosError): ApiError {
  if (error.response) {
    const data = error.response.data as any
    return {
      status: error.response.status,
      code: data?.code ?? 'UNKNOWN_ERROR',
      message: data?.message ?? error.message,
      details: data?.details,
      timestamp: new Date().toISOString(),
      path: error.config?.url ?? '',
    }
  }
  
  if (error.code === 'ECONNABORTED') {
    return { status: 0, code: 'TIMEOUT', message: 'Request timeout', timestamp: new Date().toISOString(), path: '' }
  }
  
  if (!navigator.onLine) {
    return { status: 0, code: 'NETWORK_ERROR', message: 'No internet connection', timestamp: new Date().toISOString(), path: '' }
  }
  
  return { status: 0, code: 'UNKNOWN_ERROR', message: error.message, timestamp: new Date().toISOString(), path: '' }
}

function handleUnauthorized(): void {
  localStorage.removeItem('auth_token')
  // Optionally redirect to login
  // window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname)
}

// Optional HTTP contract for testing
export interface IHttpClient {
  get<T>(url: string, config?: any): Promise<T>
  post<T>(url: string, data?: any, config?: any): Promise<T>
  put<T>(url: string, data?: any, config?: any): Promise<T>
  patch<T>(url: string, data?: any, config?: any): Promise<T>
  delete<T>(url: string, config?: any): Promise<T>
}
```

---

## Data Layer — Repository (`modules/tasks/data/repositories/tasks.repository.ts`)

```typescript
import { httpClient } from '@/adapters/infrastructures/clients/HttpClient'
import type { TaskListParams, TaskDto, CreateTaskDto, UpdateTaskDto, PaginatedTaskResponse } from '../dtos/task.dto'

export const tasksRepository = {
  async findAll(params: TaskListParams = {}): Promise<PaginatedTaskResponse> {
    const response = await httpClient.get<PaginatedTaskResponse>('/tasks', { params })
    return response.data
  },

  async findById(id: string): Promise<TaskDto> {
    const response = await httpClient.get<TaskDto>(`/tasks/${id}`)
    return response.data
  },

  async create(data: CreateTaskDto): Promise<TaskDto> {
    const response = await httpClient.post<TaskDto>('/tasks', data)
    return response.data
  },

  async update(id: string, data: UpdateTaskDto): Promise<TaskDto> {
    const response = await httpClient.put<TaskDto>(`/tasks/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/tasks/${id}`)
  },
}
```

---

## Application Service (`modules/tasks/application/services/tasks.service.ts`)

```typescript
import { tasksRepository } from '../../data/repositories/tasks.repository'
import { toDomain, toCreateDto, toUpdateDto } from '../../data/mappers/task.mapper'
import type { Task, TaskFilters } from '../../domain/types'

export const tasksService = {
  async list(filters: TaskFilters = {}): Promise<{ tasks: Task[]; meta: any }> {
    const response = await tasksRepository.findAll(filters)
    return {
      tasks: response.data.map(toDomain),
      meta: response.meta,
    }
  },

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return toDomain(await tasksRepository.create(toCreateDto(task)))
  },

  async update(id: string, task: Partial<Task>): Promise<Task> {
    return toDomain(await tasksRepository.update(id, toUpdateDto(task)))
  },

  async remove(id: string): Promise<void> {
    await tasksRepository.delete(id)
  },
}
```

Services own orchestration and map DTOs to domain types. Composables call services, never repositories.

---

## Composable Pattern (`modules/tasks/ui/composables/useTasks.ts`)

```typescript
import { ref, computed, watch } from 'vue'
import { tasksService } from '../../application/services/tasks.service'
import type { Task, TaskStatus, TaskFilters } from '../../domain/types'
import { useUIStore } from '@/shared/stores/ui.store'

export function useTasks() {
  const uiStore = useUIStore()
  
  // State
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const meta = ref<{ page: number; per_page: number; total: number; total_pages: number } | null>(null)
  
  const filters = ref<TaskFilters>({
    page: 1,
    per_page: 20,
    status: undefined,
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  })

  // Getters
  const hasTasks = computed(() => tasks.value.length > 0)
  const totalTasks = computed(() => meta.value?.total ?? 0)

  // Actions
  async function fetch(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await tasksService.list(filters.value)
      tasks.value = response.tasks
      meta.value = response.meta
    } catch (e) {
      error.value = e as Error
      uiStore.toast.error('Failed to load tasks')
    } finally {
      loading.value = false
    }
  }

  async function create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const task = await tasksService.create(data)
    tasks.value.unshift(task)
    uiStore.toast.success('Task created')
    return task
  }

  async function update(id: string, data: Partial<Task>): Promise<Task> {
    const task = await tasksService.update(id, data)
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) tasks.value[idx] = task
    uiStore.toast.success('Task updated')
    return task
  }

  async function remove(id: string): Promise<void> {
    await tasksService.remove(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
    uiStore.toast.success('Task deleted')
  }

  async function changeStatus(id: string, status: TaskStatus): Promise<void> {
    await update(id, { status })
  }

  // Debounced search
  let debounceTimer: ReturnType<typeof setTimeout>
  watch(filters, (newFilters) => {
    clearTimeout(debounceTimer)
    if (newFilters.search !== undefined) {
      debounceTimer = setTimeout(() => {
        filters.value.page = 1
        fetch()
      }, 300)
    } else {
      fetch()
    }
  }, { deep: true })

  // Initial load
  fetch()

  return {
    tasks,
    loading,
    error,
    meta,
    filters,
    hasTasks,
    totalTasks,
    fetch,
    create,
    update,
    remove,
    changeStatus,
  }
}
```

---

## Form Composable (`modules/tasks/ui/composables/useTaskForm.ts`)

```typescript
import { ref, computed } from 'vue'
import type { Task, TaskStatus } from '../../domain/types'

export function useTaskForm(initialTask?: Task | null) {
  const form = ref({
    title: initialTask?.title ?? '',
    description: initialTask?.description ?? '',
    status: initialTask?.status ?? 'todo' as TaskStatus,
    assignedTo: initialTask?.assignedTo ?? '',
    dueDate: initialTask?.dueDate ? initialTask.dueDate.toISOString().split('T')[0] : '',
  })

  const errors = ref<Partial<Record<keyof typeof form.value, string>>>({})
  const submitting = ref(false)

  const isValid = computed(() => 
    form.value.title.trim().length > 0 && 
    form.value.assignedTo.length > 0
  )

  function validate(): boolean {
    errors.value = {}
    if (!form.value.title.trim()) errors.value.title = 'Title is required'
    if (!form.value.assignedTo) errors.value.assignedTo = 'Assignee is required'
    return Object.keys(errors.value).length === 0
  }

  function setFieldError(field: keyof typeof form.value, message: string): void {
    errors.value[field] = message
  }

  function clearErrors(): void {
    errors.value = {}
  }

  function reset(task?: Task | null): void {
    form.value = {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? 'todo',
      assignedTo: task?.assignedTo ?? '',
      dueDate: task?.dueDate ? task.dueDate.toISOString().split('T')[0] : '',
    }
    clearErrors()
  }

  return {
    form,
    errors,
    submitting,
    isValid,
    validate,
    setFieldError,
    clearErrors,
    reset,
  }
}
```

---

## MSW Mocking (`tests/msw/handlers.ts`)

```typescript
import { http, HttpResponse } from 'msw'
import type { TaskDto, CreateTaskDto, PaginatedTaskResponse } from '@/modules/tasks/data/dtos/task.dto'

let tasks: TaskDto[] = [
  { id: '1', title: 'Task 1', description: 'Desc', status: 'todo', assigned_to: '1', due_date: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export const handlers = [
  http.get('/api/tasks', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const perPage = parseInt(url.searchParams.get('per_page') || '20')
    const status = url.searchParams.get('status')
    
    let filtered = tasks
    if (status) filtered = filtered.filter(t => t.status === status)
    
    const start = (page - 1) * perPage
    const paginated = filtered.slice(start, start + perPage)
    
    return HttpResponse.json<PaginatedTaskResponse>({
      data: paginated,
      meta: { page, per_page: perPage, total: filtered.length, total_pages: Math.ceil(filtered.length / perPage) },
    })
  }),

  http.post('/api/tasks', async ({ request }) => {
    const body = await request.json() as CreateTaskDto
    const newTask: TaskDto = { id: String(tasks.length + 1), ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    tasks.push(newTask)
    return HttpResponse.json(newTask, { status: 201 })
  }),

  http.put('/api/tasks/:id', async ({ params, request }) => {
    const body = await request.json()
    const idx = tasks.findIndex(t => t.id === params.id)
    if (idx === -1) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    tasks[idx] = { ...tasks[idx], ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json(tasks[idx])
  }),

  http.delete('/api/tasks/:id', ({ params }) => {
    tasks = tasks.filter(t => t.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
```

---

## TanStack Query (Alternative)

```typescript
// If using @tanstack/vue-query
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { tasksService } from '@/modules/tasks/application/services/tasks.service'
import type { Task, TaskFilters } from '@/modules/tasks/domain/types'

export function useTasksQuery(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksService.list(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => tasksService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
```

---

## Error Handling

```typescript
// In composable
async function fetch(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    // ...
  } catch (e) {
    error.value = e as Error
    uiStore.toast.error('Failed to load tasks')
  } finally {
    loading.value = false
  }
}

// Component usage
<template>
  <div v-if="loading" class="loading">Loading...</div>
  <ErrorState v-else-if="error" :error="error" @retry="fetch" />
  <TasksTable v-else :tasks="tasks" />
</template>
```

---

## Testing

```typescript
// tests/composables/useTasks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTasks } from '@/modules/tasks/ui/composables/useTasks'
import { tasksService } from '@/modules/tasks/application/services/tasks.service'
import type { Task } from '@/modules/tasks/domain/types'

vi.mock('@/modules/tasks/application/services/tasks.service')

describe('useTasks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads tasks on init', async () => {
    const mockTasks: Task[] = [{
      id: '1',
      title: 'Test',
      description: '',
      status: 'todo',
      assignedTo: '1',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]
    vi.mocked(tasksService.list).mockResolvedValue({
      tasks: mockTasks,
      meta: { page: 1, per_page: 20, total: 1, total_pages: 1 },
    })

    const { tasks, fetch } = useTasks()
    await fetch()

    expect(tasks.value).toHaveLength(1)
  })
})
```