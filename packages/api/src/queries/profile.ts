import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '@glee/types'
import { apiFetch } from '../client'

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

export interface NotificationPreferences {
  bookingAlerts: boolean
  eventAlerts: boolean
  systemAlerts: boolean
  weeklyReport: boolean
}

export const profileKeys = {
  me:            ['profile', 'me']            as const,
  security:      ['profile', 'security']      as const,
  notifications: ['profile', 'notifications'] as const,
}

export function getProfile(): Promise<ProfileData> {
  return apiFetch<{ success: boolean; data: ProfileData }>('/api/v1/profile/me').then(r => r.data)
}

export function updateProfile(dto: UpdateProfileDto): Promise<ProfileData> {
  return apiFetch<{ success: boolean; data: ProfileData }>('/api/v1/profile/me', {
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
  return apiFetch<{ success: boolean; data: { avatarUrl: string } }>('/api/v1/profile/me/avatar', {
    method: 'POST',
    body: formData,
  }).then(r => r.data)
}

export function getSecurityInfo(): Promise<SecurityInfo> {
  return apiFetch<{ success: boolean; data: SecurityInfo }>('/api/v1/profile/me/security').then(r => r.data)
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

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiFetch<{ success: boolean; data: NotificationPreferences }>('/api/v1/profile/me/notifications').then(r => r.data)
}

export function updateNotificationPreferences(dto: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  return apiFetch<{ success: boolean; data: NotificationPreferences }>('/api/v1/profile/me/notifications', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(r => r.data)
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useProfile() {
  return useQuery({ queryKey: profileKeys.me, queryFn: getProfile, staleTime: 1000 * 60 * 10 })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateProfileDto) => updateProfile(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (dto: ChangePasswordDto) => changePassword(dto) })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  })
}

export function useSecurityInfo() {
  return useQuery({ queryKey: profileKeys.security, queryFn: getSecurityInfo, staleTime: 1000 * 60 * 5 })
}

export function useToggle2FA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enable: boolean) => enable ? enableTwoFactor() : disableTwoFactor(),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.security }),
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.security }),
  })
}

export function useRevokeAllOtherSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => revokeAllOtherSessions(),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.security }),
  })
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: profileKeys.notifications,
    queryFn: getNotificationPreferences,
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Partial<NotificationPreferences>) => updateNotificationPreferences(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.notifications }),
  })
}
