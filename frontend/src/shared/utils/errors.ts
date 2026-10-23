export class ApiError {
  statusCode: number
  code: string
  message: string
  details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    this.statusCode = statusCode
    this.code = code
    this.message = message
    this.details = details
  }
}

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  ASSIGNEE_NOT_FOUND: 'ASSIGNEE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
}