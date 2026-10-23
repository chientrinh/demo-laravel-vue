import taskRepository from '../../data/repositories/task.repository'
import type { PaginatedTasks, Task, TaskFilters, TaskInput } from '../../domain/types'

const taskService = {
  list(filters: TaskFilters): Promise<PaginatedTasks> {
    return taskRepository.list(filters)
  },

  get(id: string): Promise<Task> {
    return taskRepository.get(id)
  },

  create(input: TaskInput): Promise<Task> {
    return taskRepository.create(input)
  },

  update(id: string, input: TaskInput): Promise<Task> {
    return taskRepository.update(id, input)
  },

  remove(id: string): Promise<void> {
    return taskRepository.remove(id)
  },
}

export default taskService
