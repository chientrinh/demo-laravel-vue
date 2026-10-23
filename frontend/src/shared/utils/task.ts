import type { Task } from '@/modules/tasks/domain/types'

export interface AssigneeOption {
  id: string
  name: string
  email?: string
  role?: string
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function formatTaskCode(id: string): string {
  if (id.startsWith('TSK-')) return id
  return `TSK-${id.padStart(4, '0')}`
}

export function collectAssignees(tasks: Task[]): AssigneeOption[] {
  const map = new Map<string, AssigneeOption>()
  for (const task of tasks) {
    if (task.assignee) {
      map.set(task.assignee.id, {
        id: task.assignee.id,
        name: task.assignee.name,
        email: task.assignee.email,
        role: task.assignee.role,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function avatarColor(seed: string): string {
  const palette = ['primary', 'secondary', 'info', 'success', 'warning', 'error']
  const total = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return palette[total % palette.length] ?? 'primary'
}
