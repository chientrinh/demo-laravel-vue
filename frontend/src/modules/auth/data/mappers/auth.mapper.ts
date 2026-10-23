import type { AuthSession, User } from '../../domain/types'
import type { AuthUserDto, LoginResponseDto } from '../dtos/auth.dto'

export function mapUser(dto: AuthUserDto): User {
  return {
    id: String(dto.id),
    name: dto.name,
    email: dto.email,
    role: dto.role,
  }
}

export function mapLoginResponse(dto: LoginResponseDto): AuthSession {
  return {
    user: mapUser(dto.user),
  }
}