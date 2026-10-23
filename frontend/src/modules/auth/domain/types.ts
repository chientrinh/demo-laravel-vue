export type UserRole = 'admin' | 'user'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AuthSession {
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  passwordConfirmation: string
}