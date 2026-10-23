import type { User, UserInput, UserListMeta, UserOption } from '../../domain/types'
import type {
  UpdateUserRequestDto,
  UserDto,
  UserListMetaDto,
  UserListResponseDto,
} from '../dtos/user.dto'

export function mapUserOption(dto: UserDto): UserOption {
  return {
    id: String(dto.id),
    name: dto.name,
    email: dto.email,
    role: dto.role,
  }
}

export function mapUser(dto: UserDto): User {
  const createdAt = dto.created_at ? new Date(dto.created_at) : new Date()
  const updatedAt = dto.updated_at ? new Date(dto.updated_at) : createdAt

  return {
    ...mapUserOption(dto),
    createdAt,
    updatedAt,
  }
}

export function mapUserMeta(dto: UserListMetaDto = {}): UserListMeta {
  const currentPage = dto.current_page ?? dto.page ?? 1
  const lastPage = dto.last_page ?? dto.total_pages ?? 1

  return {
    currentPage,
    lastPage: Math.max(1, lastPage),
    perPage: dto.per_page ?? 10,
    total: dto.total ?? 0,
  }
}

export function mapUserListResponse(dto: UserListResponseDto): UserListMeta {
  return mapUserMeta(dto.meta)
}

export function mapUserInput(input: UserInput): UpdateUserRequestDto {
  const payload: UpdateUserRequestDto = {
    name: input.name,
    email: input.email,
    role: input.role,
  }
  if (input.password) payload.password = input.password
  return payload
}
