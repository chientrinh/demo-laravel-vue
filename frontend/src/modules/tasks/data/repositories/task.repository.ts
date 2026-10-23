import { appConfig } from '@/app/config'
import httpClient from '@/adapters/infrastructures/clients/HttpClient'
import {
  delay,
  getCurrentMockUser,
  getMockDb,
  saveMockDb,
  type MockTaskRecord,
} from '@/adapters/infrastructures/mocks/mockDb'
import type {
  PaginatedTasks,
  Task,
  TaskFilters,
  TaskInput,
} from '../../domain/types'
import type { TaskDto, TaskListResponseDto } from '../dtos/task.dto'
import { mapTask, mapTaskInput, mapTaskMeta } from '../mappers/task.mapper'

const PRIORITY_WEIGHT = { low: 0, medium: 1, high: 2, urgent: 3 } as const

function toMockTask(record: MockTaskRecord): Task {
  const db = getMockDb()
  const assignee = db.users.find((user) => user.id === record.assigned_to)
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    assignedTo: record.assigned_to,
    dueDate: record.due_date ? new Date(record.due_date) : null,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
    assignee: assignee
      ? {
          id: assignee.id,
          name: assignee.name,
          email: assignee.email,
          role: assignee.role,
        }
      : undefined,
  }
}

function mockList(filters: TaskFilters): PaginatedTasks {
  const currentUser = getCurrentMockUser()
  if (!currentUser) throw new Error('Your session has expired. Please sign in again.')

  let records = [...getMockDb().tasks]
  if (currentUser.role !== 'admin') {
    records = records.filter((task) => task.assigned_to === currentUser.id)
  }

  const search = filters.search?.toLowerCase().trim()
  if (search) {
    records = records.filter((task) => {
      const haystack = `${task.id} ${task.title} ${task.description}`.toLowerCase()
      return haystack.includes(search)
    })
  }
  if (filters.status) records = records.filter((task) => task.status === filters.status)
  if (filters.priority) records = records.filter((task) => task.priority === filters.priority)
  if (filters.assigned_to) {
    records = records.filter((task) => task.assigned_to === filters.assigned_to)
  }

  const sortBy = filters.sort_by ?? 'created_at'
  const direction = filters.sort_order === 'asc' ? 1 : -1
  records.sort((a, b) => {
    if (sortBy === 'priority') {
      return (PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]) * direction
    }
    if (sortBy === 'title') return a.title.localeCompare(b.title) * direction
    if (sortBy === 'due_date') {
      return ((a.due_date ? Date.parse(a.due_date) : 0) - (b.due_date ? Date.parse(b.due_date) : 0)) * direction
    }
    return (Date.parse(a.created_at) - Date.parse(b.created_at)) * direction
  })

  const total = records.length
  const lastPage = Math.max(1, Math.ceil(total / filters.per_page))
  const page = Math.min(filters.page, lastPage)
  const start = (page - 1) * filters.per_page
  const pageRecords = records.slice(start, start + filters.per_page)

  return {
    tasks: pageRecords.map(toMockTask),
    meta: {
      currentPage: page,
      lastPage,
      perPage: filters.per_page,
      total,
    },
  }
}

function mockGet(id: string): Task {
  const currentUser = getCurrentMockUser()
  if (!currentUser) throw new Error('Your session has expired. Please sign in again.')
  const record = getMockDb().tasks.find((task) => task.id === id)
  if (!record) throw new Error('Task not found.')
  if (currentUser.role !== 'admin' && record.assigned_to !== currentUser.id) {
    throw new Error('You do not have permission to view this task.')
  }
  return toMockTask(record)
}

class TaskRepository {
  async list(filters: TaskFilters): Promise<PaginatedTasks> {
    if (appConfig.useMockApi) {
      await delay()
      return mockList(filters)
    }

    const { data } = await httpClient.get<TaskListResponseDto>('/tasks', { params: filters })
    return {
      tasks: data.data.map(mapTask),
      meta: mapTaskMeta(data.meta),
    }
  }

  async get(id: string): Promise<Task> {
    if (appConfig.useMockApi) {
      await delay(160)
      return mockGet(id)
    }

    const { data } = await httpClient.get<{ data: TaskDto }>(`/tasks/${id}`)
    return mapTask(data.data)
  }

  async create(input: TaskInput): Promise<Task> {
    if (appConfig.useMockApi) {
      await delay()
      const db = getMockDb()
      const now = new Date().toISOString()
      const nextId = Math.max(2094, ...db.tasks.map((task) => Number(task.id.replace('TSK-', '')))) + 1
      const record: MockTaskRecord = {
        id: `TSK-${nextId}`,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assigned_to: input.assignedTo,
        due_date: input.dueDate ? new Date(input.dueDate).toISOString() : null,
        created_at: now,
        updated_at: now,
      }
      db.tasks.unshift(record)
      saveMockDb(db)
      return toMockTask(record)
    }

    const { data } = await httpClient.post<{ data: TaskDto }>('/tasks', mapTaskInput(input))
    return mapTask(data.data)
  }

  async update(id: string, input: TaskInput): Promise<Task> {
    if (appConfig.useMockApi) {
      await delay()
      const db = getMockDb()
      const index = db.tasks.findIndex((task) => task.id === id)
      if (index < 0) throw new Error('Task not found.')
      const current = db.tasks[index]
      if (!current) throw new Error('Task not found.')
      const record: MockTaskRecord = {
        ...current,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assigned_to: input.assignedTo,
        due_date: input.dueDate ? new Date(input.dueDate).toISOString() : null,
        updated_at: new Date().toISOString(),
      }
      db.tasks[index] = record
      saveMockDb(db)
      return toMockTask(record)
    }

    const { data } = await httpClient.put<{ data: TaskDto }>(`/tasks/${id}`, mapTaskInput(input))
    return mapTask(data.data)
  }

  async remove(id: string): Promise<void> {
    if (appConfig.useMockApi) {
      await delay()
      const db = getMockDb()
      const index = db.tasks.findIndex((task) => task.id === id)
      if (index < 0) throw new Error('Task not found.')
      db.tasks.splice(index, 1)
      saveMockDb(db)
      return
    }

    await httpClient.delete(`/tasks/${id}`)
  }
}

export default new TaskRepository()
