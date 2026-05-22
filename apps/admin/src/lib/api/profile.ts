// apps/admin/src/lib/api/profile.ts
import type { UserRole } from '@glee/types'
import { apiFetch } from './client'

export interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  avatarUrl: string | null
}

export interface UpdateProfileDto {
  firstName?: string
  lastName?: string
  phone?: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

interface ProfileResponse {
  success: boolean
  data: ProfileData
}

interface AvatarResponse {
  success: boolean
  data: { avatarUrl: string }
}

export function getProfile(): Promise<ProfileData> {
  return apiFetch<ProfileResponse>('/api/v1/profile/me').then(r => r.data)
}

export function updateProfile(dto: UpdateProfileDto): Promise<ProfileData> {
  return apiFetch<ProfileResponse>('/api/v1/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

export function changePassword(dto: ChangePasswordDto): Promise<void> {
  return apiFetch<void>('/api/v1/profile/me/password', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData()
  formData.append('avatar', file)
  return apiFetch<AvatarResponse>('/api/v1/profile/me/avatar', {
    method: 'POST',
    body: formData,
  }).then(r => r.data)
}

// ── Security ──────────────────────────────────────────────────────────────────

export interface ActiveSession {
  id: string
  device: string
  location: string | null
  lastActive: string
  isCurrent: boolean
}

export interface SecurityInfo {
  twoFactorEnabled: boolean
  lastLoginAt: string | null
  lastLoginIp: string | null
  activeSessions: ActiveSession[]
}

interface SecurityResponse {
  success: boolean
  data: SecurityInfo
}

export function getSecurityInfo(): Promise<SecurityInfo> {
  return apiFetch<SecurityResponse>('/api/v1/profile/me/security').then(r => r.data)
}

export function enableTwoFactor(): Promise<void> {
  return apiFetch<void>('/api/v1/profile/me/security/2fa/enable', { method: 'POST' })
}

export function disableTwoFactor(): Promise<void> {
  return apiFetch<void>('/api/v1/profile/me/security/2fa/disable', { method: 'POST' })
}

export function revokeSession(sessionId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/profile/me/security/sessions/${sessionId}`, { method: 'DELETE' })
}

export function revokeAllOtherSessions(): Promise<void> {
  return apiFetch<void>('/api/v1/profile/me/security/sessions', { method: 'DELETE' })
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface NotificationPreferences {
  bookingAlerts: boolean
  eventAlerts: boolean
  systemAlerts: boolean
  weeklyReport: boolean
}

interface NotifResponse {
  success: boolean
  data: NotificationPreferences
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiFetch<NotifResponse>('/api/v1/profile/me/notifications').then(r => r.data)
}

export function updateNotificationPreferences(dto: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  return apiFetch<NotifResponse>('/api/v1/profile/me/notifications', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}
