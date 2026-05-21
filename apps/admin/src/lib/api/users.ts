import type { UserRole } from '@glee/types'
import { apiFetch } from './client'

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

interface ListUsersResponse {
  success: boolean
  data: AdminUserRecord[]
}

interface ListInvitesResponse {
  success: boolean
  data: PendingInvite[]
}

export function listUsers(): Promise<AdminUserRecord[]> {
  return apiFetch<ListUsersResponse>('/api/v1/users').then(r => r.data ?? [])
}

export function listPendingInvites(): Promise<PendingInvite[]> {
  return apiFetch<ListInvitesResponse>('/api/v1/users/invites').then(r => r.data ?? [])
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
