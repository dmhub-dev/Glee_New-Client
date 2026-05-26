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

interface BackendMeUser {
  id: string
  name: string
  email: string
  phone?: string | null
  profileImage?: string | null
  role: string | { name: string } | null
  twoFactorEnabled?: boolean
  lastLoginAt?: string | null
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
  return apiFetch<{ success: boolean; data: BackendMeUser }>('/api/v1/me').then(r => {
    const [firstName = '', ...rest] = (r.data.name ?? '').split(' ')
    const role = typeof r.data.role === 'string' ? r.data.role : r.data.role?.name
    return {
      id: r.data.id,
      firstName,
      lastName: rest.join(' '),
      email: r.data.email,
      phone: r.data.phone ?? '',
      role: (role ?? '').toLowerCase() as UserRole,
      avatarUrl: r.data.profileImage ?? null,
    }
  })
}

export function updateProfile(dto: UpdateProfileDto): Promise<ProfileData> {
  return apiFetch<{ success: boolean; data: BackendMeUser }>('/api/v1/me', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  }).then(() => getProfile())
}

export function changePassword(dto: ChangePasswordDto): Promise<void> {
  return apiFetch<void>('/api/v1/me/password', {
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
  return apiFetch<{ success: boolean; data: BackendMeUser }>('/api/v1/me').then(r => ({
    twoFactorEnabled: r.data.twoFactorEnabled ?? false,
    lastLoginAt: r.data.lastLoginAt ?? null,
    lastLoginIp: null,
    activeSessions: [],
  }))
}

export function enableTwoFactor(): Promise<void> {
  return apiFetch<void>('/api/v1/me/2fa', {
    method: 'PATCH',
    body: JSON.stringify({ enabled: true }),
  })
}

export function disableTwoFactor(): Promise<void> {
  return apiFetch<void>('/api/v1/me/2fa', {
    method: 'PATCH',
    body: JSON.stringify({ enabled: false }),
  })
}

export function revokeSession(sessionId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/profile/me/security/sessions/${sessionId}`, { method: 'DELETE' })
}

export function revokeAllOtherSessions(): Promise<void> {
  return apiFetch<void>('/api/v1/profile/me/security/sessions', { method: 'DELETE' })
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return Promise.resolve({
    bookingAlerts: true,
    eventAlerts: true,
    systemAlerts: true,
    weeklyReport: false,
  })
}

export function updateNotificationPreferences(dto: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  return getNotificationPreferences().then(current => ({ ...current, ...dto }))
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
