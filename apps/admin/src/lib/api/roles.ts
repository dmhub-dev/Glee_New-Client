import type { UserRole } from '@glee/types'
import { apiFetch } from './client'

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

interface RolePermissionsResponse {
  success: boolean
  data: RolePermissions
}

export function getRolePermissions(role: UserRole): Promise<RolePermissions> {
  return apiFetch<RolePermissionsResponse>(`/api/v1/roles/${role}/permissions`).then(r => r.data)
}

export function setRolePermissions(role: UserRole, permissions: RolePermissions): Promise<void> {
  return apiFetch(`/api/v1/roles/${role}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  })
}

export function reassignUserRole(userId: string, role: UserRole): Promise<void> {
  return apiFetch(`/api/v1/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}
