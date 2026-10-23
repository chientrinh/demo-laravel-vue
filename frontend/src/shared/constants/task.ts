import type { TaskPriority, TaskStatus } from '@/modules/tasks/domain/types'

export interface SelectOption<T extends string> {
  title: string
  value: T
  color: string
  icon: string
}

export const STATUS_OPTIONS: SelectOption<TaskStatus>[] = [
  { title: 'To Do', value: 'todo', color: 'gray', icon: 'mdi-circle-outline' },
  { title: 'In Progress', value: 'in_progress', color: 'warning', icon: 'mdi-progress-clock' },
  { title: 'Done', value: 'done', color: 'success', icon: 'mdi-check-circle-outline' },
  { title: 'Cancelled', value: 'cancelled', color: 'error', icon: 'mdi-cancel' },
]

export const PRIORITY_OPTIONS: SelectOption<TaskPriority>[] = [
  { title: 'Low', value: 'low', color: 'success', icon: 'mdi-arrow-down' },
  { title: 'Medium', value: 'medium', color: 'info', icon: 'mdi-minus' },
  { title: 'High', value: 'high', color: 'warning', icon: 'mdi-arrow-up' },
  { title: 'Urgent', value: 'urgent', color: 'error', icon: 'mdi-alert-circle-outline' },
]

export const STATUS_LABEL: Record<TaskStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.title]),
) as Record<TaskStatus, string>

export const STATUS_COLOR: Record<TaskStatus, string> = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.color]),
) as Record<TaskStatus, string>

export const PRIORITY_LABEL: Record<TaskPriority, string> = Object.fromEntries(
  PRIORITY_OPTIONS.map((option) => [option.value, option.title]),
) as Record<TaskPriority, string>

export const PRIORITY_COLOR: Record<TaskPriority, string> = Object.fromEntries(
  PRIORITY_OPTIONS.map((option) => [option.value, option.color]),
) as Record<TaskPriority, string>
