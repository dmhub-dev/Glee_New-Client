import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listUsers,
  listPendingInvites,
  inviteUser,
  revokeInvite,
  setUserStatus,
  deleteUser,
} from '../api/users'
import type { UserRole } from '@glee/types'

export const userKeys = {
  all: ['users'] as const,
  invites: ['users', 'invites'] as const,
}

export function useUsers() {
  return useQuery({ queryKey: userKeys.all, queryFn: listUsers })
}

export function usePendingInvites() {
  return useQuery({ queryKey: userKeys.invites, queryFn: listPendingInvites })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: UserRole }) =>
      inviteUser(email, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.invites }),
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.invites }),
  })
}

export function useSetUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'active' | 'inactive' }) =>
      setUserStatus(userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}
