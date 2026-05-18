import type { UserRole } from '@glee/types'

export type Permission = string

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ['*'],
  admin: [],
  operations_manager: [],
  commercial_manager: [],
  finance: [],
  vendor: [],
  vendor_staff: [],
  customer_support: [],
  content_manager: [],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role]
  return perms.includes('*') || perms.includes(permission)
}
