// apps/admin/src/lib/queries/profile.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
} from '../api/profile'
import type { UpdateProfileDto, ChangePasswordDto } from '../api/profile'

export const profileKeys = {
  me: ['profile', 'me'] as const,
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
