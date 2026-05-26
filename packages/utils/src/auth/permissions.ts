import type { UserRole } from '@glee/types'

export type Permission =
  | 'events:read'
  | 'events:create'
  | 'events:edit_own'
  | 'events:edit_any'
  | 'events:approve'
  | 'events:delete'
  | 'venues:read'
  | 'venues:create'
  | 'venues:edit_own'
  | 'venues:edit_any'
  | 'venues:approve'
  | 'bookings:read_own'
  | 'bookings:read_all'
  | 'bookings:create'
  | 'bookings:manage'
  | 'bookings:override'
  | 'menus:read'
  | 'menus:edit_own'
  | 'menus:edit_any'
  | 'menus:approve'
  | 'users:read'
  | 'users:manage'
  | 'finance:read'
  | 'finance:export'
  | 'reports:read'
  | 'media:upload'
  | 'media:manage'
  | 'system:admin'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[] | ['*']> = {
  super_admin: ['*'],

  admin: [
    'events:read',
    'events:edit_any',
    'events:approve',
    'events:delete',
    'venues:read',
    'venues:edit_any',
    'venues:approve',
    'bookings:read_all',
    'bookings:manage',
    'bookings:override',
    'menus:read',
    'menus:edit_any',
    'menus:approve',
    'users:read',
    'users:manage',
    'finance:read',
    'reports:read',
    'media:upload',
    'media:manage',
  ],

  operations_manager: [
    'events:read',
    'venues:read',
    'bookings:read_all',
    'bookings:manage',
    'bookings:override',
    'menus:read',
    'reports:read',
  ],

  commercial_manager: [
    'events:read',
    'venues:read',
    'venues:create',
    'bookings:read_all',
    'menus:read',
    'finance:read',
    'reports:read',
    'users:read',
  ],

  finance: [
    'finance:read',
    'finance:export',
    'reports:read',
    'bookings:read_all',
  ],

  vendor: [
    'events:read',
    'events:create',
    'events:edit_own',
    'venues:read',
    'venues:create',
    'venues:edit_own',
    'bookings:read_own',
    'bookings:manage',
    'menus:read',
    'menus:edit_own',
    'media:upload',
  ],

  vendor_staff: [
    'events:read',
    'venues:read',
    'bookings:read_own',
    'bookings:manage',
    'menus:read',
    'menus:edit_own',
    'media:upload',
  ],

  customer_support: [
    'events:read',
    'venues:read',
    'bookings:read_all',
    'users:read',
  ],

  content_manager: [
    'events:read',
    'events:edit_any',
    'venues:read',
    'menus:read',
    'media:upload',
    'media:manage',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role]
  return perms.includes('*' as Permission) || (perms as Permission[]).includes(permission)
}
