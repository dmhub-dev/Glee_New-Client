// apps/admin/src/lib/queries/profile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  getSecurityInfo,
  enableTwoFactor,
  disableTwoFactor,
  revokeSession,
  revokeAllOtherSessions,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../api/profile'
import type { UpdateProfileDto, ChangePasswordDto, NotificationPreferences } from '../api/profile'

export const profileKeys = {
  me:            ['profile', 'me'] as const,
  security:      ['profile', 'security'] as const,
  notifications: ['profile', 'notifications'] as const,
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: getProfile,
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateProfileDto) => updateProfile(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  })
}

// Error handling intentionally delegated to callers via try/catch — no cache to invalidate.
export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => changePassword(dto),
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: profileKeys.me }),
  })
}

// ── Security ──────────────────────────────────────────────────────────────────

export function useSecurityInfo() {
  return useQuery({
    queryKey: profileKeys.security,
    queryFn:  getSecurityInfo,
    staleTime: 1000 * 60 * 5,
  })
}

export function useToggle2FA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enable: boolean) => enable ? enableTwoFactor() : disableTwoFactor(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: profileKeys.security }),
  })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: profileKeys.security }),
  })
}

export function useRevokeAllOtherSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => revokeAllOtherSessions(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: profileKeys.security }),
  })
}

// ── Notifications ─────────────────────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: profileKeys.notifications,
    queryFn:  getNotificationPreferences,
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: Partial<NotificationPreferences>) => updateNotificationPreferences(dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: profileKeys.notifications }),
  })
}
