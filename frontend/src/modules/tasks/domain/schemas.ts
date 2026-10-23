import { z } from 'zod'

export const STATUS_VALUES = ['todo', 'in_progress', 'done', 'cancelled'] as const
export const PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'] as const

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(120, 'Title must be 120 characters or fewer'),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer'),
  status: z.enum(STATUS_VALUES),
  priority: z.enum(PRIORITY_VALUES),
  assignedTo: z.string().min(1, 'Assignee is required'),
  dueDate: z
    .string()
    .nullable()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Invalid date'),
})

export const taskFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(5).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  priority: z.enum(PRIORITY_VALUES).optional(),
  assigned_to: z.string().optional(),
  sort_by: z.enum(['created_at', 'due_date', 'title', 'priority']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export type CreateTaskFormValues = z.infer<typeof createTaskSchema>
