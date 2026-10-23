import type { UserRole } from '@/modules/auth'

export interface UserDto {
  id: string | number
  name: string
  email: string
  role: UserRole
  created_at?: string | null
  updated_at?: string | null
}

export interface UserListMetaDto {
  current_page?: number
  last_page?: number
  per_page?: number
  total?: number
  page?: number
  total_pages?: number
}

export interface UserListResponseDto {
  data: UserDto[]
  meta?: UserListMetaDto
}

export interface CreateUserRequestDto {
  name: string
  email: string
  password: string
  role: UserRole
}

export interface UpdateUserRequestDto {
  name: string
  email: string
  role: UserRole
  password?: string
}
