import type { UserRole } from '@glee/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  operations_manager: 'Operations Manager',
  commercial_manager: 'Commercial Manager',
  finance: 'Finance',
  vendor: 'Vendor',
  vendor_staff: 'Vendor Staff',
  customer_support: 'Customer Support',
  content_manager: 'Content Manager',
}

export function roleBadgeClass(role: UserRole): string {
  const map: Partial<Record<UserRole, string>> = {
    admin: 'bg-neon-pink/10 text-neon-pink border-neon-pink/30',
    super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    vendor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    finance: 'bg-green-500/10 text-green-400 border-green-500/30',
  }
  return map[role] ?? 'bg-admin-overlay text-admin-60 border-admin'
}
