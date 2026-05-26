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

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  vendorId?: string
  createdAt: string
}
