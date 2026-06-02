export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'operations_manager'
  | 'commercial_manager'
  | 'finance'
  | 'vendor'
  | 'vendor_staff'
  | 'customer_support'
  | 'content_manager'
  | 'user'

export const ALL_USER_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'operations_manager',
  'commercial_manager',
  'finance',
  'vendor',
  'vendor_staff',
  'customer_support',
  'content_manager',
  'user',
]

export const DASHBOARD_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'operations_manager',
  'commercial_manager',
  'finance',
  'vendor',
  'vendor_staff',
  'customer_support',
  'content_manager',
]

export const CUSTOMER_ROLES: UserRole[] = ['user']

export const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin']

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

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  vendorId?: string
  createdAt: string
}
