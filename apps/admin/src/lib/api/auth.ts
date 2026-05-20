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

// Backend response shapes
interface BackendUser {
  id: string
  name: string
  email: string
  role: string | null
  profileImage?: string | null
}

interface BackendLoginResponse {
  user: BackendUser
  accessToken: string
  refreshToken: string
}

interface BackendMeResponse {
  success: boolean
  data: BackendUser & { password?: string }
}

function toAuthUser(raw: BackendUser): AuthUser {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    // Backend returns UPPER_CASE role names; normalise to lowercase for frontend type
    role: (raw.role ?? '').toLowerCase() as UserRole,
    avatarUrl: raw.profileImage ?? null,
  }
}

export function apiLogin(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<BackendLoginResponse>('/api/v1/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  }).then(raw => ({
    accessToken: raw.accessToken,
    refreshToken: raw.refreshToken,
    user: toAuthUser(raw.user),
  }))
}

export function apiLogout(): Promise<void> {
  return Promise.resolve()
}

export function apiMe(): Promise<AuthUser> {
  return apiFetch<BackendMeResponse>('/api/v1/me').then(raw => toAuthUser(raw.data))
}
