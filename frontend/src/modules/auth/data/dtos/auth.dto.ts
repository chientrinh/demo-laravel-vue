export interface AuthUserDto {
  id: string | number
  name: string
  email: string
  role: 'admin' | 'user'
}

export interface LoginResponseDto {
  user: AuthUserDto
}

export interface RegisterRequestDto {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export interface UserResponseDto {
  user: AuthUserDto
}