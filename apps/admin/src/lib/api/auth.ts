import type { UserRole } from '@glee/types'
import { apiFetch } from './client'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string | null
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  })
}

export function apiLogout(): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST' })
}

export function apiMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/api/auth/me')
}
