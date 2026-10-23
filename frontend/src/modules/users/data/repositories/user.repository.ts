import { appConfig } from '@/app/config'
import httpClient from '@/adapters/infrastructures/clients/HttpClient'
import {
  delay,
  getCurrentMockUser,
  getMockDb,
  saveMockDb,
  type MockUserRecord,
} from '@/adapters/infrastructures/mocks/mockDb'
import { ApiError } from '@/shared/utils/errors'
import type {
  PaginatedUsers,
  User,
  UserFilters,
  UserInput,
  UserOption,
} from '../../domain/types'
import type {
  CreateUserRequestDto,
  UserDto,
  UserListResponseDto,
} from '../dtos/user.dto'
import {
  mapUser,
  mapUserInput,
  mapUserListResponse,
  mapUserOption,
} from '../mappers/user.mapper'

function mockCreatedAt(record: MockUserRecord): Date {
  if (record.created_at) return new Date(record.created_at)
  const numericId = Number(record.id)
  const base = new Date(2024, 0, 1)
  base.setDate(base.getDate() + (Number.isFinite(numericId) ? numericId : 0))
  return base
}

function toMockUser(record: MockUserRecord): User {
  const createdAt = mockCreatedAt(record)
  return {
    ...mapUserOption(record),
    createdAt,
    updatedAt: record.updated_at ? new Date(record.updated_at) : createdAt,
  }
}

function requireMockAdmin(): MockUserRecord {
  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.')
  }
  if (currentUser.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to access this page.')
  }
  return currentUser
}

function mockList(filters: UserFilters): PaginatedUsers {
  requireMockAdmin()

  let records = [...getMockDb().users]
  const search = filters.search?.toLowerCase().trim()
  if (search) {
    records = records.filter((user) => {
      const haystack = `${user.name} ${user.email}`.toLowerCase()
      return haystack.includes(search)
    })
  }
  if (filters.role) {
    records = records.filter((user) => user.role === filters.role)
  }

  records.sort((a, b) => mockCreatedAt(b).getTime() - mockCreatedAt(a).getTime())

  const total = records.length
  const lastPage = Math.max(1, Math.ceil(total / filters.per_page))
  const page = Math.min(Math.max(1, filters.page), lastPage)
  const start = (page - 1) * filters.per_page
  const pageRecords = records.slice(start, start + filters.per_page)

  return {
    users: pageRecords.map(toMockUser),
    meta: {
      currentPage: page,
      lastPage,
      perPage: filters.per_page,
      total,
    },
  }
}

class UserRepository {
  async listOptions(): Promise<UserOption[]> {
    if (appConfig.useMockApi) {
      await delay()
      return getMockDb()
        .users.map((user) => mapUserOption(user))
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    const { data } = await httpClient.get<UserListResponseDto>('/users', {
      params: { per_page: 100 },
    })
    return data.data.map(mapUserOption)
  }

  async list(filters: UserFilters): Promise<PaginatedUsers> {
    if (appConfig.useMockApi) {
      await delay()
      return mockList(filters)
    }

    const { data } = await httpClient.get<UserListResponseDto>('/users', {
      params: {
        page: filters.page,
        per_page: filters.per_page,
        search: filters.search,
        role: filters.role,
      },
    })
    return {
      users: data.data.map(mapUser),
      meta: mapUserListResponse(data),
    }
  }

  async get(id: string): Promise<User> {
    if (appConfig.useMockApi) {
      await delay(160)
      requireMockAdmin()
      const record = getMockDb().users.find((user) => user.id === id)
      if (!record) throw new ApiError(404, 'NOT_FOUND', 'User not found.')
      return toMockUser(record)
    }

    const { data } = await httpClient.get<{ data: UserDto }>(`/users/${id}`)
    return mapUser(data.data)
  }

  async create(input: UserInput): Promise<User> {
    if (appConfig.useMockApi) {
      await delay()
      requireMockAdmin()
      const db = getMockDb()
      const email = input.email.trim().toLowerCase()
      if (db.users.some((user) => user.email.toLowerCase() === email)) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'The email has already been taken.')
      }

      const now = new Date().toISOString()
      const nextId = String(Math.max(0, ...db.users.map((user) => Number(user.id) || 0)) + 1)
      const record: MockUserRecord = {
        id: nextId,
        name: input.name.trim(),
        email,
        role: input.role,
        password: input.password ?? '',
        created_at: now,
        updated_at: now,
      }
      db.users.push(record)
      saveMockDb(db)
      return toMockUser(record)
    }

    const payload: CreateUserRequestDto = {
      name: input.name,
      email: input.email,
      password: input.password ?? '',
      role: input.role,
    }
    const { data } = await httpClient.post<{ data: UserDto }>('/users', payload)
    return mapUser(data.data)
  }

  async update(id: string, input: UserInput): Promise<User> {
    if (appConfig.useMockApi) {
      await delay()
      const currentUser = requireMockAdmin()
      const db = getMockDb()
      const index = db.users.findIndex((user) => user.id === id)
      if (index < 0) throw new ApiError(404, 'NOT_FOUND', 'User not found.')
      const current = db.users[index]
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'User not found.')

      if (currentUser.id === id && input.role !== 'admin') {
        throw new ApiError(422, 'VALIDATION_FAILED', 'You cannot remove your own admin role.')
      }

      const email = input.email.trim().toLowerCase()
      if (db.users.some((user) => user.id !== id && user.email.toLowerCase() === email)) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'The email has already been taken.')
      }

      const record: MockUserRecord = {
        ...current,
        name: input.name.trim(),
        email,
        role: input.role,
        password: input.password ? input.password : current.password,
        updated_at: new Date().toISOString(),
      }
      db.users[index] = record
      saveMockDb(db)
      return toMockUser(record)
    }

    const { data } = await httpClient.put<{ data: UserDto }>(`/users/${id}`, mapUserInput(input))
    return mapUser(data.data)
  }

  async remove(id: string): Promise<void> {
    if (appConfig.useMockApi) {
      await delay()
      const currentUser = requireMockAdmin()
      if (currentUser.id === id) {
        throw new ApiError(403, 'FORBIDDEN', 'You cannot delete your own account.')
      }

      const db = getMockDb()
      const target = db.users.find((user) => user.id === id)
      if (!target) throw new ApiError(404, 'NOT_FOUND', 'User not found.')
      if (target.role === 'admin' && db.users.filter((user) => user.role === 'admin').length <= 1) {
        throw new ApiError(409, 'CONFLICT', 'The last admin account cannot be deleted.')
      }

      db.users = db.users.filter((user) => user.id !== id)
      db.tasks = db.tasks.filter((task) => task.assigned_to !== id)
      saveMockDb(db)
      return
    }

    await httpClient.delete(`/users/${id}`)
  }
}

export default new UserRepository()
