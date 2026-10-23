import type { TaskPriority, TaskStatus } from '../../domain/types'

export interface TaskAssigneeDto {
  id: string | number
  name: string
  email: string
  role: string
}

export interface TaskDto {
  id: string | number
  title: string
  description: string | null
  status: TaskStatus
  priority?: TaskPriority
  assigned_to: string | number
  due_date: string | null
  created_at: string
  updated_at: string
  assignee?: TaskAssigneeDto
}

export interface TaskListResponseDto {
  data: TaskDto[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface CreateTaskRequestDto {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string
  due_date: string | null
}
