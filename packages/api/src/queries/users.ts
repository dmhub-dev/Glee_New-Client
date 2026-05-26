import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '@glee/types'
import { apiFetch } from '../client'

export type UserStatus = 'active' | 'inactive'

export interface AdminUserRecord {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

export interface PendingInvite {
  id: string
  email: string
  role: UserRole
  invitedAt: string
}

export const ASSIGNABLE_ROLES: UserRole[] = [
  'admin',
  'operations_manager',
  'commercial_manager',
  'finance',
  'vendor',
  'vendor_staff',
  'customer_support',
  'content_manager',
]

export const userKeys = {
  all:     ['admin', 'users']          as const,
  invites: ['admin', 'users', 'invites'] as const,
  byId:    (id: string) => ['admin', 'users', id] as const,
  me:      () => ['users', 'me']       as const,
}

export function listUsers(): Promise<AdminUserRecord[]> {
  return apiFetch<{ success: boolean; data: AdminUserRecord[] }>('/api/v1/users').then(r => r.data ?? [])
}

export function listPendingInvites(): Promise<PendingInvite[]> {
  return apiFetch<{ success: boolean; data: PendingInvite[] }>('/api/v1/users/invites').then(r => r.data ?? [])
}

export function inviteUser(email: string, role: UserRole): Promise<void> {
  return apiFetch('/api/v1/users/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  })
}

export function revokeInvite(inviteId: string): Promise<void> {
  return apiFetch(`/api/v1/users/invites/${inviteId}`, { method: 'DELETE' })
}

export function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  return apiFetch(`/api/v1/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function deleteUser(userId: string): Promise<void> {
  return apiFetch(`/api/v1/users/${userId}`, { method: 'DELETE' })
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
    mutationFn: ({ email, role }: { email: string; role: UserRole }) => inviteUser(email, role),
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
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) => setUserStatus(userId, status),
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
