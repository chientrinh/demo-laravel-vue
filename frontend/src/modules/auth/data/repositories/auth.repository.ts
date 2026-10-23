import axios from 'axios'
import { appConfig } from '@/app/config'
import httpClient from '@/adapters/infrastructures/clients/HttpClient'
import {
  createMockToken,
  delay,
  getCurrentMockUser,
  getMockDb,
  publicUser,
  saveMockDb,
} from '@/adapters/infrastructures/mocks/mockDb'
import { AUTH_TOKEN_KEY } from '@/shared/constants/auth'
import type {
  AuthSession,
  LoginCredentials,
  RegisterPayload,
  User,
} from '../../domain/types'
import type { LoginResponseDto, RegisterRequestDto, UserResponseDto } from '../dtos/auth.dto'
import { mapLoginResponse, mapUser } from '../mappers/auth.mapper'

async function getCsrfCookie(): Promise<void> {
  // Establishes the Sanctum session (HttpOnly cookie) and the XSRF-TOKEN
  // cookie. Axios then forwards XSRF-TOKEN as the X-XSRF-TOKEN header.
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}

class AuthRepository {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    if (appConfig.useMockApi) {
      await delay()
      const db = getMockDb()
      const user = db.users.find(
        (candidate) =>
          candidate.email.toLowerCase() === credentials.email.toLowerCase() &&
          candidate.password === credentials.password,
      )
      if (!user) throw new Error('Invalid email or password.')
      localStorage.setItem(AUTH_TOKEN_KEY, createMockToken(user.id))
      return { user: publicUser(user) }
    }

    await getCsrfCookie()
    const { data } = await httpClient.post<LoginResponseDto>('/login', credentials)
    return mapLoginResponse(data)
  }

  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (appConfig.useMockApi) {
      await delay()
      const db = getMockDb()
      const exists = db.users.some(
        (user) => user.email.toLowerCase() === payload.email.toLowerCase(),
      )
      if (exists) throw new Error('An account with this email already exists.')

      const id = String(Math.max(...db.users.map((user) => Number(user.id))) + 1)
      const user = {
        id,
        name: payload.name,
        email: payload.email,
        role: 'user' as const,
        password: payload.password,
      }
      db.users.push(user)
      saveMockDb(db)
      localStorage.setItem(AUTH_TOKEN_KEY, createMockToken(user.id))
      return { user: publicUser(user) }
    }

    await getCsrfCookie()
    const request: RegisterRequestDto = {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
    }
    const { data } = await httpClient.post<LoginResponseDto>('/register', request)
    return mapLoginResponse(data)
  }

  async me(): Promise<User> {
    if (appConfig.useMockApi) {
      const user = getCurrentMockUser()
      if (!user) throw new Error('Your session has expired. Please sign in again.')
      return publicUser(user)
    }

    const { data } = await httpClient.get<UserResponseDto>('/me')
    return mapUser(data.user)
  }

  async logout(): Promise<void> {
    if (appConfig.useMockApi) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      return
    }
    try {
      await httpClient.post('/logout')
    } catch {
      // The local session is cleared even when the server is unreachable.
    }
  }
}

export default new AuthRepository()