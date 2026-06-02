import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '@glee/types'
export { ASSIGNABLE_ROLES } from '@glee/types'
import { apiFetch } from '../client'

export type UserStatus = 'active' | 'inactive'

export interface AdminUserRecord {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  profileImage: string | null
  role: UserRole
  status: UserStatus
  invitedAt: string | null
  invitedBy: { id: string; name: string; email: string } | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PendingInvite {
  id: string
  email: string
  role: UserRole
  status: string
  invitedAt: string
  expiresAt: string | null
  invitedBy: { id: string; name: string; email: string } | null
}

interface BackendUserRecord {
  id: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  profileImage?: string | null
  role: string | { name: string } | null
  isActive: 'ACTIVE' | 'INACTIVE'
  invitedAt?: string | null
  invitedBy?: { id: string; name: string; email: string } | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt?: string
}

interface BackendInvite {
  id: string
  email: string
  role: string | { name: string } | null
  status?: string | null
  expiresAt?: string | null
  invitedBy?: { id: string; name: string; email: string } | null
  createdAt: string
}

export const userKeys = {
  all:     ['admin', 'users']          as const,
  invites: ['admin', 'users', 'invites'] as const,
  byId:    (id: string) => ['admin', 'users', id] as const,
  me:      () => ['users', 'me']       as const,
}

function toBackendRole(role: UserRole): string {
  return role.toUpperCase()
}

function fromBackendRole(role: string | { name: string } | null): UserRole {
  const value = typeof role === 'string' ? role : role?.name
  return (value ?? '').toLowerCase() as UserRole
}

export function listUsers(): Promise<AdminUserRecord[]> {
  return apiFetch<{ success: boolean; data: { items: BackendUserRecord[] } }>('/api/v1/users?limit=100').then(r =>
    (r.data?.items ?? []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      address: u.address ?? null,
      profileImage: u.profileImage ?? null,
      role: fromBackendRole(u.role),
      status: u.isActive === 'ACTIVE' ? 'active' : 'inactive',
      invitedAt: u.invitedAt ?? null,
      invitedBy: u.invitedBy ?? null,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt ?? u.createdAt,
    })),
  )
}

export function getUser(userId: string): Promise<AdminUserRecord> {
  return apiFetch<{ success: boolean; data: BackendUserRecord }>(`/api/v1/users/${userId}`).then(r => {
    const u = r.data
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone ?? null,
      address: u.address ?? null,
      profileImage: u.profileImage ?? null,
      role: fromBackendRole(u.role),
      status: u.isActive === 'ACTIVE' ? 'active' : 'inactive',
      invitedAt: u.invitedAt ?? null,
      invitedBy: u.invitedBy ?? null,
      lastLoginAt: u.lastLoginAt ?? null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt ?? u.createdAt,
    }
  })
}

export function listPendingInvites(): Promise<PendingInvite[]> {
  return apiFetch<{ success: boolean; data: BackendInvite[] }>('/api/v1/invitations').then(r =>
    (r.data ?? [])
      .filter(inv => (inv.status ?? 'PENDING') === 'PENDING')
      .map(inv => ({
        id: inv.id,
        email: inv.email,
        role: fromBackendRole(inv.role),
        status: inv.status ?? 'PENDING',
        invitedAt: inv.createdAt,
        expiresAt: inv.expiresAt ?? null,
        invitedBy: inv.invitedBy ?? null,
      })),
  )
}

export function inviteUser(email: string, role: UserRole): Promise<void> {
  return apiFetch('/api/v1/invitations', {
    method: 'POST',
    body: JSON.stringify({ email, name: email.split('@')[0], role: toBackendRole(role) }),
  })
}

export function revokeInvite(inviteId: string): Promise<void> {
  return apiFetch(`/api/v1/invitations/${inviteId}/revoke`, { method: 'POST' })
}

export function setUserStatus(userId: string, status: UserStatus): Promise<void> {
  return apiFetch(`/api/v1/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: status === 'active' ? 'ACTIVE' : 'INACTIVE' }),
  })
}

export function deleteUser(userId: string): Promise<void> {
  return apiFetch(`/api/v1/users/${userId}`, { method: 'DELETE' })
}

export function useUsers(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: userKeys.all, queryFn: listUsers, enabled: options?.enabled ?? true })
}

export function useUser(userId: string | null) {
  return useQuery({
    queryKey: userKeys.byId(userId ?? 'none'),
    queryFn: () => getUser(userId as string),
    enabled: Boolean(userId),
  })
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
