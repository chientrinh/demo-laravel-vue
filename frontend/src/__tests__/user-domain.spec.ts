import { describe, expect, it } from 'vitest'
import { createUserSchema, updateUserSchema, userFiltersSchema } from '@/modules/users/domain/schemas'
import {
  mapUser,
  mapUserInput,
  mapUserListResponse,
  mapUserOption,
} from '@/modules/users/data/mappers/user.mapper'
import { formatTimestamp } from '@/shared/utils/date'

describe('user schemas', () => {
  it('accepts a valid create payload and normalizes email', () => {
    const result = createUserSchema.safeParse({
      name: '  Rachel Adams ',
      email: ' Rachel.Adams@Materio.IO ',
      password: 'password123',
      role: 'admin',
    })

    expect(result.success).toBe(true)
    const data = createUserSchema.parse({
      name: '  Rachel Adams ',
      email: ' Rachel.Adams@Materio.IO ',
      password: 'password123',
      role: 'admin',
    })
    expect(data.name).toBe('Rachel Adams')
    expect(data.email).toBe('rachel.adams@materio.io')
  })

  it('rejects weak passwords and unknown roles', () => {
    expect(
      createUserSchema.safeParse({
        name: 'Rachel',
        email: 'rachel@materio.io',
        password: 'short',
        role: 'user',
      }).success,
    ).toBe(false)

    expect(
      createUserSchema.safeParse({
        name: 'Rachel',
        email: 'rachel@materio.io',
        password: 'password123',
        role: 'owner',
      }).success,
    ).toBe(false)
  })

  it('allows a blank password when editing but enforces the minimum otherwise', () => {
    expect(
      updateUserSchema.safeParse({
        name: 'Rachel Adams',
        email: 'rachel@materio.io',
        password: '',
        role: 'user',
      }).success,
    ).toBe(true)

    expect(
      updateUserSchema.safeParse({
        name: 'Rachel Adams',
        email: 'rachel@materio.io',
        password: 'short',
        role: 'user',
      }).success,
    ).toBe(false)
  })

  it('parses list filters with safe defaults', () => {
    const result = userFiltersSchema.parse({ search: '  lana ', role: 'admin', page: 2, per_page: 25 })
    expect(result).toEqual({ search: 'lana', role: 'admin', page: 2, per_page: 25 })
    expect(userFiltersSchema.parse({}).per_page).toBe(10)
  })
})

describe('user mappers', () => {
  it('maps a snake_case user payload to the domain model', () => {
    const user = mapUser({
      id: 7,
      name: 'Lana Steiner',
      email: 'lana@taskflow.dev',
      role: 'user',
      created_at: '2026-02-03T10:00:00.000000Z',
      updated_at: '2026-02-04T11:30:00.000000Z',
    })

    expect(user).toMatchObject({
      id: '7',
      name: 'Lana Steiner',
      email: 'lana@taskflow.dev',
      role: 'user',
    })
    expect(user.createdAt.toISOString()).toContain('2026-02-03')
    expect(user.updatedAt.toISOString()).toContain('2026-02-04')
  })

  it('maps paginated responses with either meta shape', () => {
    expect(
      mapUserListResponse({
        data: [{ id: 1, name: 'Admin', email: 'admin@taskflow.dev', role: 'admin' }],
        meta: { page: 1, per_page: 10, total: 1, total_pages: 1 },
      }),
    ).toEqual({ currentPage: 1, perPage: 10, total: 1, lastPage: 1 })
  })

  it('maps lightweight user options', () => {
    expect(mapUserOption({ id: 3, name: 'Demi', email: 'demi@taskflow.dev', role: 'user' })).toEqual({
      id: '3',
      name: 'Demi',
      email: 'demi@taskflow.dev',
      role: 'user',
    })
  })

  it('omits a blank password from update payloads', () => {
    expect(
      mapUserInput({
        name: 'Demi',
        email: 'demi@taskflow.dev',
        password: '',
        role: 'user',
      }),
    ).toEqual({ name: 'Demi', email: 'demi@taskflow.dev', role: 'user' })

    expect(
      mapUserInput({
        name: 'Demi',
        email: 'demi@taskflow.dev',
        password: 'password123',
        role: 'admin',
      }),
    ).toEqual({
      name: 'Demi',
      email: 'demi@taskflow.dev',
      password: 'password123',
      role: 'admin',
    })
  })
})

describe('formatTimestamp', () => {
  it('formats ISO timestamps for the table', () => {
    expect(formatTimestamp('2026-02-03T10:05:00.000000Z')).toMatch(/^2026-02-03 \d{2}:\d{2}$/)
    expect(formatTimestamp(null)).toBe('—')
    expect(formatTimestamp('not-a-date')).toBe('—')
  })
})
