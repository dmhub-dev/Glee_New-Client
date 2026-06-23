import type { UserRole } from '../../types'
import { apiFetch, refreshAccessToken } from '../client'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string | null
  profileStatus?: boolean
  twoFactorEnabled?: boolean
  passwordChangeRequired?: boolean
  passwordRotationEnabled?: boolean
  passwordRotationDays?: number
  passwordChangedAt?: string | null
  passwordExpiresAt?: string | null
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true
  email: string
  role: UserRole | null
  message?: string
}

export type LoginResult = LoginResponse | TwoFactorRequiredResponse

export interface RegisterUserParams {
  name: string
  email: string
  password: string
}

export interface RegisterUserResult {
  id: string
  name: string
  email: string
}

export interface UserExistsResult {
  isUserExists: boolean
}

interface BackendUser {
  id: string
  name: string
  email: string
  role: string | { name: string } | null
  profileImage?: string | null
  twoFactorEnabled?: boolean
  profileStatus?: boolean
  passwordChangeRequired?: boolean
  passwordRotationEnabled?: boolean
  passwordRotationDays?: number
  passwordChangedAt?: string | null
  passwordExpiresAt?: string | null
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
    profileStatus: raw.profileStatus ?? true,
    twoFactorEnabled: raw.twoFactorEnabled ?? false,
    passwordChangeRequired: raw.passwordChangeRequired ?? false,
    passwordRotationEnabled: raw.passwordRotationEnabled ?? false,
    passwordRotationDays: raw.passwordRotationDays,
    passwordChangedAt: raw.passwordChangedAt ?? null,
    passwordExpiresAt: raw.passwordExpiresAt ?? null,
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
      user: toAuthUser(raw.user),
    }
  })
}

export function apiVerifyLoginTwoFactor(email: string, otp: string): Promise<LoginResponse> {
  return apiFetch<BackendLoginResponse>('/api/v1/login/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({ email, otp: Number(otp) }),
    skipAuth: true,
  }).then(raw => ({
    accessToken: raw.accessToken,
    user: toAuthUser(raw.user),
  }))
}

export function apiRegisterUser(params: RegisterUserParams): Promise<RegisterUserResult> {
  return apiFetch<{ success: boolean; message: string; data: RegisterUserResult }>('/api/v1/register', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      password: params.password,
      confirmPassword: params.password,
      role: 'USER',
    }),
    skipAuth: true,
  }).then(raw => raw.data)
}

export function apiVerifySignupOtp(email: string, otp: string): Promise<void> {
  return apiFetch<void>('/api/v1/register/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp: Number(otp) }),
    skipAuth: true,
  })
}

export function apiCheckUserExists(email: string): Promise<UserExistsResult> {
  return apiFetch<{ success: boolean; message: string; data: UserExistsResult }>('/api/v1/user-exists', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  }).then(raw => raw.data)
}

export function apiForgotPassword(email: string): Promise<string> {
  return apiFetch<{ success: boolean; message: string }>('/api/v1/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  }).then(raw => raw.message)
}

export function apiResetPassword(params: { email: string; otp: string; password: string; confirmPassword: string }): Promise<string> {
  return apiFetch<{ success: boolean; message: string }>('/api/v1/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      otp: Number(params.otp),
      password: params.password,
      confirmPassword: params.confirmPassword,
    }),
    skipAuth: true,
  }).then(raw => raw.message)
}

export function apiAcceptInvitation(token: string, password: string): Promise<void> {
  return apiFetch<void>(`/api/v1/invitations/accept/${token}`, {
    method: 'POST',
    body: JSON.stringify({ password, confirmPassword: password }),
    skipAuth: true,
  })
}

export function apiLogout(): Promise<void> {
  return apiFetch<void>('/api/v1/logout', {
    method: 'POST',
  })
}

export function apiRefreshSession(): Promise<string | null> {
  return refreshAccessToken()
}

export function apiMe(): Promise<AuthUser> {
  return apiFetch<BackendMeResponse>('/api/v1/me').then(raw => toAuthUser(raw.data))
}
