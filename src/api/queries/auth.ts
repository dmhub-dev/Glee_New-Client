import type { UserRole } from '@glee/types'
import { apiFetch } from '../client'

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

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true
  email: string
  role: UserRole | null
  message?: string
}

export type LoginResult = LoginResponse | TwoFactorRequiredResponse

interface BackendUser {
  id: string
  name: string
  email: string
  role: string | { name: string } | null
  profileImage?: string | null
  twoFactorEnabled?: boolean
}

interface BackendLoginResponse {
  success?: boolean
  requiresTwoFactor?: boolean
  message?: string
  data?: {
    email: string
    role: string | null
  }
  user: BackendUser
  accessToken: string
  refreshToken: string
}

interface BackendMeResponse {
  success: boolean
  data: BackendUser & { password?: string }
}

function toAuthUser(raw: BackendUser): AuthUser {
  const role = typeof raw.role === 'string' ? raw.role : raw.role?.name
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: (role ?? '').toLowerCase() as UserRole,
    avatarUrl: raw.profileImage ?? null,
  }
}

export function apiLogin(email: string, password: string): Promise<LoginResult> {
  return apiFetch<BackendLoginResponse>('/api/v1/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  }).then(raw => {
    if (raw.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        email: raw.data?.email ?? email,
        role: raw.data?.role ? raw.data.role.toLowerCase() as UserRole : null,
        message: raw.message,
      }
    }
    return {
      accessToken: raw.accessToken,
      refreshToken: raw.refreshToken,
      user: toAuthUser(raw.user),
    }
  })
}

export function apiVerifyLoginTwoFactor(email: string, otp: string): Promise<LoginResponse> {
  return apiFetch<BackendLoginResponse>('/api/v1/login/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
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
