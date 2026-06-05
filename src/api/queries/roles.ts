import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserRole } from '../../types'
import { apiFetch } from '../client'
import { userKeys } from './users'

export const FEATURE_KEYS = [
  'view_financials',
  'export_reports',
  'manage_events',
  'manage_bookings',
  'override_bookings',
  'manage_venues',
  'approve_vendors',
  'manage_menus',
  'check_in_customers',
  'view_user_profiles',
  'manage_discounts',
  'access_admin_settings',
] as const

export type FeatureKey = typeof FEATURE_KEYS[number]

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  view_financials:       'View Financials',
  export_reports:        'Export Reports',
  manage_events:         'Manage Events',
  manage_bookings:       'View Bookings',
  override_bookings:     'Override Bookings',
  manage_venues:         'Manage Venues',
  approve_vendors:       'Approve / Reject Vendors',
  manage_menus:          'Manage Menus',
  check_in_customers:    'Check In Customers',
  view_user_profiles:    'View User Profiles',
  manage_discounts:      'Manage Discounts & Campaigns',
  access_admin_settings: 'Access Admin Settings',
}

export type RolePermissions = Record<FeatureKey, boolean>

export interface RoleSecurityPolicy {
  twoFactorRequired: boolean
}

interface BackendPermission {
  name: string
}

interface BackendRole {
  name: string
  permissions: BackendPermission[]
  twoFactorRequired?: boolean
}

const FEATURE_TO_PERMISSION: Record<FeatureKey, string> = {
  view_financials:       'payments:read',
  export_reports:        'payments:export',
  manage_events:         'events:update',
  manage_bookings:       'bookings:read',
  override_bookings:     'bookings:override',
  manage_venues:         'location:update',
  approve_vendors:       'vendors:approve',
  manage_menus:          'services:update',
  check_in_customers:    'bookings:update',
  view_user_profiles:    'users:read',
  manage_discounts:      'pricing:edit',
  access_admin_settings: 'settings:manage',
}

export const roleKeys = {
  permissions: (role: UserRole) => ['admin', 'roles', role, 'permissions'] as const,
  securityPolicy: (role: UserRole) => ['admin', 'roles', role, 'security-policy'] as const,
}

export function getRolePermissions(role: UserRole): Promise<RolePermissions> {
  return apiFetch<{ success: boolean; data: BackendRole[] }>('/api/v1/roles').then(r => {
    const backendRole = (r.data ?? []).find(item => item.name.toLowerCase() === role)
    const names = new Set((backendRole?.permissions ?? []).map(permission => permission.name))
    return FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = names.has(FEATURE_TO_PERMISSION[key])
      return acc
    }, {} as RolePermissions)
  })
}

export function getRoleSecurityPolicy(role: UserRole): Promise<RoleSecurityPolicy> {
  return apiFetch<{ success: boolean; data: BackendRole[] }>('/api/v1/roles').then(r => {
    const backendRole = (r.data ?? []).find(item => item.name.toLowerCase() === role)
    return { twoFactorRequired: Boolean(backendRole?.twoFactorRequired) }
  })
}

export function setRolePermissions(role: UserRole, permissions: RolePermissions): Promise<void> {
  const selected = FEATURE_KEYS
    .filter(key => permissions[key])
    .map(key => FEATURE_TO_PERMISSION[key])
  return apiFetch(`/api/v1/roles/${role.toUpperCase()}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions: selected }),
  })
}

export function setRoleTwoFactorPolicy(role: UserRole, required: boolean): Promise<void> {
  return apiFetch(`/api/v1/roles/${role.toUpperCase()}/2fa-policy`, {
    method: 'PATCH',
    body: JSON.stringify({ required }),
  })
}

export function reassignUserRole(userId: string, role: UserRole): Promise<void> {
  return apiFetch(`/api/v1/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role: role.toUpperCase() }),
  })
}

export function useRolePermissions(role: UserRole) {
  return useQuery({
    queryKey: roleKeys.permissions(role),
    queryFn: () => getRolePermissions(role),
  })
}

export function useRoleSecurityPolicy(role: UserRole) {
  return useQuery({
    queryKey: roleKeys.securityPolicy(role),
    queryFn: () => getRoleSecurityPolicy(role),
  })
}

export function useSetRolePermissions(role: UserRole) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (permissions: RolePermissions) => setRolePermissions(role, permissions),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.permissions(role) }),
  })
}

export function useSetRoleTwoFactorPolicy(role: UserRole) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (required: boolean) => setRoleTwoFactorPolicy(role, required),
    onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.securityPolicy(role) }),
  })
}

export function useReassignUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => reassignUserRole(userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}
