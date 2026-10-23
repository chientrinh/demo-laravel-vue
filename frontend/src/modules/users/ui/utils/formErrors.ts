import { ApiError } from '@/shared/utils/errors'

export function fieldErrorsFrom(caught: unknown): Record<string, string> {
  const details = caught instanceof ApiError ? caught.details : undefined
  if (!details || typeof details !== 'object') return {}

  const errors: Record<string, string> = {}
  for (const [field, value] of Object.entries(details as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      const first = value[0]
      if (typeof first === 'string') errors[field] = first
    } else if (typeof value === 'string') {
      errors[field] = value
    }
  }
  return errors
}
