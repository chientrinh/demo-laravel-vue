import authRepository from '../../data/repositories/auth.repository'
import type { AuthSession, LoginCredentials, RegisterPayload, User } from '../../domain/types'

const authService = {
  login(credentials: LoginCredentials): Promise<AuthSession> {
    return authRepository.login(credentials)
  },

  register(payload: RegisterPayload): Promise<AuthSession> {
    return authRepository.register(payload)
  },

  me(): Promise<User> {
    return authRepository.me()
  },

  logout(): Promise<void> {
    return authRepository.logout()
  },
}

export default authService
