import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listUsers,
  listPendingInvites,
  inviteUser,
  revokeInvite,
  setUserStatus,
  deleteUser,
  type UserStatus,
} from '../api/users'
import type { UserRole } from '@glee/types'

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  invites: ['admin', 'users', 'invites'] as const,
}

export function useUsers() {
  return useQuery({ queryKey: adminUserKeys.all, queryFn: listUsers })
}

export function usePendingInvites() {
  return useQuery({ queryKey: adminUserKeys.invites, queryFn: listPendingInvites })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: UserRole }) =>
      inviteUser(email, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUserKeys.invites }),
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUserKeys.invites }),
  })
}

export function useSetUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
      setUserStatus(userId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUserKeys.all }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminUserKeys.all }),
  })
}
