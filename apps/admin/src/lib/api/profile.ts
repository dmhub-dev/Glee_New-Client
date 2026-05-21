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
