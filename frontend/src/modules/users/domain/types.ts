import type { UserRole } from '@/modules/auth'

export interface UserOption {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface User extends UserOption {
  createdAt: Date
  updatedAt: Date
}

export interface UserFilters {
  page: number
  per_page: number
  search?: string
  role?: UserRole
}

export interface UserListMeta {
  currentPage: number
  lastPage: number
  perPage: number
  total: number
}

export interface PaginatedUsers {
  users: User[]
  meta: UserListMeta
}

export interface UserInput {
  name: string
  email: string
  password?: string
  role: UserRole
}
