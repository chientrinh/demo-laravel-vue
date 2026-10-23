export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskSortField = 'created_at' | 'due_date' | 'title' | 'priority'
export type SortDirection = 'asc' | 'desc'

export interface TaskAssignee {
  id: string
  name: string
  email: string
  role: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  assignee?: TaskAssignee
}

export interface TaskFilters {
  page: number
  per_page: number
  search?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: string
  sort_by?: TaskSortField
  sort_order?: SortDirection
}

export interface TaskListMeta {
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

export interface PaginatedTasks {
  tasks: Task[]
  meta: TaskListMeta
}

export interface TaskInput {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo: string
  dueDate: string | null
}
