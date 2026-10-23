import type { Task, TaskInput, TaskListMeta } from '../../domain/types'
import type { CreateTaskRequestDto, TaskDto, TaskListResponseDto } from '../dtos/task.dto'

export function mapTask(dto: TaskDto): Task {
  return {
    id: String(dto.id),
    title: dto.title,
    description: dto.description ?? '',
    status: dto.status,
    priority: dto.priority ?? 'medium',
    assignedTo: String(dto.assigned_to),
    dueDate: dto.due_date ? new Date(dto.due_date) : null,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
    assignee: dto.assignee
      ? {
          id: String(dto.assignee.id),
          name: dto.assignee.name,
          email: dto.assignee.email,
          role: dto.assignee.role,
        }
      : undefined,
  }
}

export function mapTaskMeta(dto: TaskListResponseDto['meta']): TaskListMeta {
  return {
    currentPage: dto.current_page,
    lastPage: dto.last_page,
    perPage: dto.per_page,
    total: dto.total,
  }
}

export function mapTaskInput(input: TaskInput): CreateTaskRequestDto {
  return {
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    assigned_to: input.assignedTo,
    due_date: input.dueDate,
  }
}
