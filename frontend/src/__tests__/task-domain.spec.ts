import { describe, expect, it } from 'vitest'
import { createTaskSchema } from '@/modules/tasks/domain/schemas'
import { loginSchema, registerSchema } from '@/modules/auth/domain/schemas'
import { formatTaskCode, getInitials } from '@/shared/utils/task'
import { isOverdue, toDateInput } from '@/shared/utils/date'

describe('task utilities', () => {
  it('formats task codes and initials', () => {
    expect(formatTaskCode('1')).toBe('TSK-0001')
    expect(formatTaskCode('TSK-2083')).toBe('TSK-2083')
    expect(getInitials('Olivia Rhye')).toBe('OR')
  })

  it('serializes dates and detects overdue work', () => {
    expect(toDateInput(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(isOverdue('2020-01-01', 'todo')).toBe(true)
    expect(isOverdue('2020-01-01', 'done')).toBe(false)
    expect(isOverdue(null, 'todo')).toBe(false)
  })
})

describe('domain schemas', () => {
  it('requires a valid login payload', () => {
    expect(loginSchema.safeParse({ email: 'admin@taskflow.dev', password: 'password123' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'not-an-email', password: '' }).success).toBe(false)
  })

  it('rejects mismatched registration passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Alex Morgan',
      email: 'alex@taskflow.dev',
      password: 'password123',
      passwordConfirmation: 'different123',
    })
    expect(result.success).toBe(false)
  })

  it('validates a task form payload', () => {
    const result = createTaskSchema.safeParse({
      title: 'Ship the task board',
      description: '',
      status: 'todo',
      priority: 'high',
      assignedTo: '1',
      dueDate: null,
    })
    expect(result.success).toBe(true)
  })
})
