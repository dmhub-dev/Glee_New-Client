import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '../../types'
import { ApiError, apiFetch } from '../client'

export interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: UserRole
  avatarUrl: string | null
  address?: string
  profileStatus?: boolean
  passwordChangeRequired?: boolean
  passwordRotationDays?: number
  passwordChangedAt?: string | null
  passwordExpiresAt?: string | null
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
  address?: string | null
  profileStatus?: boolean
  passwordChangeRequired?: boolean
  passwordRotationDays?: number
  passwordChangedAt?: string | null
  passwordExpiresAt?: string | null
}

export interface UpdateProfileDto {
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
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
  passwordChangeRequired: boolean
  passwordRotationDays: number
  passwordChangedAt: string | null
  passwordExpiresAt: string | null
}

export interface NotificationPreferences {
  bookingAlerts: boolean
  eventAlerts: boolean
  systemAlerts: boolean
  weeklyReport: boolean
}

const NOTIFICATION_PREFS_KEY = 'glee-notification-preferences'
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  bookingAlerts: true,
  eventAlerts: true,
  systemAlerts: true,
  weeklyReport: false,
}

export const profileKeys = {
  me:            ['profile', 'me']            as const,
  security:      ['profile', 'security']      as const,
  notifications: ['profile', 'notifications'] as const,
}

function isMissingEndpoint(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

function normalizeNotificationPreferences(value?: Partial<NotificationPreferences> | null): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(value ?? {}),
  }
}

function readLocalNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES
    return normalizeNotificationPreferences(JSON.parse(raw) as Partial<NotificationPreferences>)
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

function writeLocalNotificationPreferences(value: NotificationPreferences) {
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(value))
  } catch {
    // Preferences still update in memory through the query cache even if storage is unavailable.
  }
}

function unwrapData<T>(value: T | { data?: T }): T {
  if (value && typeof value === 'object' && 'data' in value && value.data !== undefined) {
    return value.data as T
  }
  return value as T
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
      address: r.data.address ?? '',
      profileStatus: r.data.profileStatus ?? true,
      passwordChangeRequired: r.data.passwordChangeRequired ?? false,
      passwordRotationDays: r.data.passwordRotationDays ?? 30,
      passwordChangedAt: r.data.passwordChangedAt ?? null,
      passwordExpiresAt: r.data.passwordExpiresAt ?? null,
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
  return apiFetch<{ success: boolean; data: Partial<SecurityInfo> }>('/api/v1/profile/me/security')
    .then(r => ({
      twoFactorEnabled: r.data.twoFactorEnabled ?? false,
      lastLoginAt: r.data.lastLoginAt ?? null,
      lastLoginIp: r.data.lastLoginIp ?? null,
      activeSessions: r.data.activeSessions ?? [],
      passwordChangeRequired: r.data.passwordChangeRequired ?? false,
      passwordRotationDays: r.data.passwordRotationDays ?? 30,
      passwordChangedAt: r.data.passwordChangedAt ?? null,
      passwordExpiresAt: r.data.passwordExpiresAt ?? null,
    }))
    .catch(error => {
      if (!isMissingEndpoint(error)) throw error
      return apiFetch<{ success: boolean; data: BackendMeUser }>('/api/v1/me').then(r => ({
        twoFactorEnabled: r.data.twoFactorEnabled ?? false,
        lastLoginAt: r.data.lastLoginAt ?? null,
        lastLoginIp: null,
        activeSessions: [],
        passwordChangeRequired: r.data.passwordChangeRequired ?? false,
        passwordRotationDays: r.data.passwordRotationDays ?? 30,
        passwordChangedAt: r.data.passwordChangedAt ?? null,
        passwordExpiresAt: r.data.passwordExpiresAt ?? null,
      }))
    })
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

export function updatePasswordRotationDays(days: number): Promise<SecurityInfo> {
  return apiFetch<{ success: boolean; data: BackendMeUser }>('/api/v1/me/password-rotation', {
    method: 'PATCH',
    body: JSON.stringify({ days }),
  }).then(() => getSecurityInfo())
}

export function revokeSession(sessionId: string): Promise<void> {
  return apiFetch<void>(`/api/v1/profile/me/security/sessions/${sessionId}`, { method: 'DELETE' })
}

export function revokeAllOtherSessions(): Promise<void> {
  return apiFetch<void>('/api/v1/profile/me/security/sessions', { method: 'DELETE' })
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiFetch<{ success?: boolean; data?: Partial<NotificationPreferences> } | Partial<NotificationPreferences>>('/api/v1/profile/me/notifications')
    .then(raw => normalizeNotificationPreferences(unwrapData(raw)))
    .catch(error => {
      if (!isMissingEndpoint(error)) throw error
      return readLocalNotificationPreferences()
    })
}

export function updateNotificationPreferences(dto: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  return apiFetch<{ success?: boolean; data?: Partial<NotificationPreferences> } | Partial<NotificationPreferences>>('/api/v1/profile/me/notifications', {
    method: 'PATCH',
    body: JSON.stringify(dto),
  })
    .then(raw => {
      if (raw == null) {
        return getNotificationPreferences().then(current => normalizeNotificationPreferences({ ...current, ...dto }))
      }
      return normalizeNotificationPreferences(unwrapData(raw))
    })
    .catch(error => {
      if (!isMissingEndpoint(error)) throw error
      const next = normalizeNotificationPreferences({ ...readLocalNotificationPreferences(), ...dto })
      writeLocalNotificationPreferences(next)
      return next
    })
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

export function useUpdatePasswordRotationDays() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days: number) => updatePasswordRotationDays(days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.security })
      qc.invalidateQueries({ queryKey: profileKeys.me })
    },
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
