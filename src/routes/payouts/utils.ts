import type { UserRole } from '@glee/types'
import type { PayoutProfileStatus, PayoutRequestStatus } from '@glee/api'

export function formatKes(value: number | null | undefined) {
  return `KSh ${Math.max(0, Number(value ?? 0)).toLocaleString()}`
}

export function formatSignedKes(value: number | null | undefined) {
  const numeric = Number(value ?? 0)
  const prefix = numeric < 0 ? '-' : ''
  return `${prefix}KSh ${Math.abs(numeric).toLocaleString()}`
}

export function formatDateTime(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function canManageVendorPayouts(role: UserRole) {
  return role === 'vendor'
}

export function canViewVendorPayouts(role: UserRole) {
  return role === 'vendor' || role === 'vendor_staff'
}

export function canViewAdminPayouts(role: UserRole) {
  return role === 'super_admin' || role === 'admin' || role === 'finance'
}

export function canViewPayoutEarnings(role: UserRole) {
  return canViewAdminPayouts(role) || canViewVendorPayouts(role)
}

export function canManageAdminPayouts(role: UserRole) {
  return role === 'super_admin' || role === 'admin' || role === 'finance'
}

export function profileStatusLabel(status?: PayoutProfileStatus | null) {
  if (status === 'VERIFIED') return 'Verified'
  if (status === 'REJECTED') return 'Rejected'
  return 'Pending Verification'
}

export function requestStatusLabel(status: PayoutRequestStatus) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

export function isVendorCancellableStatus(status: PayoutRequestStatus) {
  return status === 'REQUESTED' || status === 'PENDING_ELIGIBILITY' || status === 'ELIGIBLE'
}
