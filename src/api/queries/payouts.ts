import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../client'

export type CommissionType = 'PERCENTAGE' | 'FIXED_PER_TICKET' | 'FIXED_PER_EVENT'
export type PayoutTimingType = 'BEFORE_EVENT' | 'AFTER_EVENT' | 'MANUAL_ONLY'
export type PayoutMethod = 'BANK_TRANSFER' | 'MOBILE_MONEY'
export type PayoutProfileStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED'
export type PayoutRequestStatus = 'REQUESTED' | 'PENDING_ELIGIBILITY' | 'ELIGIBLE' | 'APPROVED' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'FAILED'

export interface VendorPayoutProfile {
  id?: string
  vendorId: string
  method: PayoutMethod
  accountName: string
  bankName?: string | null
  bankCode?: string | null
  accountNumber?: string | null
  mobileMoneyProvider?: string | null
  mobileMoneyNumber?: string | null
  currency: 'KES'
  status: PayoutProfileStatus
  rejectionReason?: string | null
  verifiedAt?: string | null
  updatedAt?: string
}

export interface UpdatePayoutProfilePayload {
  method: PayoutMethod
  accountName: string
  bankName?: string
  bankCode?: string
  accountNumber?: string
  mobileMoneyProvider?: string
  mobileMoneyNumber?: string
  currency?: 'KES'
}

export interface VendorPayoutTerms {
  eventId: string
  commissionType: CommissionType | null
  commissionValue: number | null
  commissionCurrency: 'KES'
  commissionSnapshotAt?: string | null
  commissionLockedAt?: string | null
  payoutTimingType: PayoutTimingType
  payoutTimingDays: number
}

export interface VendorAdjustment {
  id: string
  amount: number
  reason: string
  createdAt?: string
}

export interface VendorEventEarnings {
  eventId: string
  currency: 'KES'
  ticketsSold: number
  grossTicketBaseSales: number
  vendorNetPayable: number
  paidOutAmount: number
  pendingPayoutAmount: number
  availableForPayout: number
  adjustments: VendorAdjustment[]
}

export interface AdminPayoutAdjustment extends VendorAdjustment {
  vendorId: string
  eventId: string
  currency: 'KES'
  vendorVisible: boolean
  adminNote?: string | null
  sourceType?: string | null
  sourceId?: string | null
}

export interface VendorPayoutRequest {
  id: string
  vendorId: string
  eventId: string
  requestedAmount: number
  approvedAmount: number | null
  paidAmount: number | null
  currency: 'KES'
  status: PayoutRequestStatus
  eligibilityOpensAt?: string | null
  rejectionReason?: string | null
  cancellationReason?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AdminPayoutRequest extends VendorPayoutRequest {
  paidAt?: string | null
  payoutMethod?: PayoutMethod | null
  transactionReference?: string | null
  receiptUrl?: string | null
  adminNote?: string | null
}

export interface AdminEventEarnings extends Omit<VendorEventEarnings, 'adjustments'> {
  ticketCommission: number
  fixedEventCommission: number
  gleeCommission: number
  platformRevenue: number
  rawVendorNet: number
  adjustmentTotal: number
  adjustments: AdminPayoutAdjustment[]
  payoutRequests: AdminPayoutRequest[]
}

export interface CommissionPayload {
  type: CommissionType
  value: number
  currency?: 'KES'
  payoutTimingType?: PayoutTimingType
  payoutTimingDays?: number
}

export interface VerifyPayoutProfilePayload {
  status: Extract<PayoutProfileStatus, 'VERIFIED' | 'REJECTED'>
  rejectionReason?: string
}

export interface CreatePayoutRequestPayload {
  amount: number
}

export interface CancelPayoutRequestPayload {
  reason?: string
}

export interface ApprovePayoutRequestPayload {
  approvedAmount?: number
  adminNote?: string
}

export interface RejectPayoutRequestPayload {
  reason: string
}

export interface MarkPayoutPaidPayload {
  paidAmount: number
  paidAt: string
  payoutMethod: PayoutMethod
  transactionReference: string
  receiptUrl?: string
  adminNote?: string
}

export interface CreatePayoutAdjustmentPayload {
  eventId: string
  amount: number
  reason: string
  vendorVisible?: boolean
  adminNote?: string
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

function numberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0
}

function unwrap<T>(res: ApiEnvelope<T> | T): T {
  return res && typeof res === 'object' && 'data' in res ? (res as ApiEnvelope<T>).data : res as T
}

function sanitizeVendorEarnings(raw: any): VendorEventEarnings {
  return {
    eventId: String(raw.eventId),
    currency: 'KES',
    ticketsSold: numberOrZero(raw.ticketsSold),
    grossTicketBaseSales: numberOrZero(raw.grossTicketBaseSales),
    vendorNetPayable: numberOrZero(raw.vendorNetPayable),
    paidOutAmount: numberOrZero(raw.paidOutAmount),
    pendingPayoutAmount: numberOrZero(raw.pendingPayoutAmount),
    availableForPayout: numberOrZero(raw.availableForPayout),
    adjustments: Array.isArray(raw.adjustments)
      ? raw.adjustments.map((adjustment: any) => ({
          id: String(adjustment.id),
          amount: numberOrZero(adjustment.amount),
          reason: String(adjustment.reason ?? ''),
          createdAt: String(adjustment.createdAt ?? ''),
        }))
      : [],
  }
}

function normalizeVendorTerms(raw: any): VendorPayoutTerms {
  return {
    eventId: String(raw.eventId ?? raw.id),
    commissionType: raw.commissionType ?? null,
    commissionValue: numberOrNull(raw.commissionValue),
    commissionCurrency: 'KES',
    commissionSnapshotAt: raw.commissionSnapshotAt ?? null,
    commissionLockedAt: raw.commissionLockedAt ?? null,
    payoutTimingType: raw.payoutTimingType ?? 'BEFORE_EVENT',
    payoutTimingDays: numberOrZero(raw.payoutTimingDays ?? 5),
  }
}

function normalizeVendorPayoutRequest(raw: any): VendorPayoutRequest {
  return {
    id: String(raw.id),
    vendorId: String(raw.vendorId ?? ''),
    eventId: String(raw.eventId),
    requestedAmount: numberOrZero(raw.requestedAmount),
    approvedAmount: numberOrNull(raw.approvedAmount),
    paidAmount: numberOrNull(raw.paidAmount),
    currency: 'KES',
    status: raw.status,
    eligibilityOpensAt: raw.eligibilityOpensAt ?? null,
    rejectionReason: raw.rejectionReason ?? null,
    cancellationReason: raw.cancellationReason ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

function normalizeAdminPayoutRequest(raw: any): AdminPayoutRequest {
  return {
    ...normalizeVendorPayoutRequest(raw),
    paidAt: raw.paidAt ?? null,
    payoutMethod: raw.payoutMethod ?? null,
    transactionReference: raw.transactionReference ?? null,
    receiptUrl: raw.receiptUrl ?? null,
    adminNote: raw.adminNote ?? null,
  }
}

function normalizeAdminAdjustment(raw: any): AdminPayoutAdjustment {
  return {
    id: String(raw.id),
    vendorId: String(raw.vendorId ?? ''),
    eventId: String(raw.eventId),
    amount: numberOrZero(raw.amount),
    currency: 'KES',
    reason: String(raw.reason ?? ''),
    vendorVisible: Boolean(raw.vendorVisible),
    adminNote: raw.adminNote ?? null,
    sourceType: raw.sourceType ?? null,
    sourceId: raw.sourceId ?? null,
    createdAt: String(raw.createdAt ?? ''),
  }
}

export const payoutKeys = {
  all: ['payouts'] as const,
  vendorProfile: () => ['payouts', 'vendor', 'profile'] as const,
  vendorRequests: () => ['payouts', 'vendor', 'requests'] as const,
  vendorRequest: (id: string) => ['payouts', 'vendor', 'requests', id] as const,
  vendorEventEarnings: (eventId: string) => ['payouts', 'vendor', 'events', eventId, 'earnings'] as const,
  vendorEventTerms: (eventId: string) => ['payouts', 'vendor', 'events', eventId, 'terms'] as const,
  adminRequests: () => ['payouts', 'admin', 'requests'] as const,
  adminRequest: (id: string) => ['payouts', 'admin', 'requests', id] as const,
  adminEventEarnings: (eventId: string) => ['payouts', 'admin', 'events', eventId, 'earnings'] as const,
  adminEventCommission: (eventId: string) => ['payouts', 'admin', 'events', eventId, 'commission'] as const,
  adminVendorCommission: (vendorId: string) => ['payouts', 'admin', 'vendors', vendorId, 'commission'] as const,
}

export async function getVendorPayoutProfile() {
  return apiFetch<ApiEnvelope<VendorPayoutProfile>>('/api/v1/vendor/payout-profile').then(unwrap)
}

export async function updateVendorPayoutProfile(payload: UpdatePayoutProfilePayload) {
  return apiFetch<ApiEnvelope<VendorPayoutProfile>>('/api/v1/vendor/payout-profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(unwrap)
}

export async function getVendorEventEarnings(eventId: string) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/vendor/events/${eventId}/earnings`).then(res => sanitizeVendorEarnings(unwrap(res)))
}

export async function getVendorEventPayoutTerms(eventId: string) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/vendor/events/${eventId}/payout-terms`).then(res => normalizeVendorTerms(unwrap(res)))
}

export async function createVendorPayoutRequest(eventId: string, payload: CreatePayoutRequestPayload) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/vendor/events/${eventId}/payout-requests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => normalizeVendorPayoutRequest(unwrap(res)))
}

export async function listVendorPayoutRequests() {
  return apiFetch<ApiEnvelope<any[]>>('/api/v1/vendor/payout-requests').then(res => unwrap(res).map(normalizeVendorPayoutRequest))
}

export async function getVendorPayoutRequest(id: string) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/vendor/payout-requests/${id}`).then(res => normalizeVendorPayoutRequest(unwrap(res)))
}

export async function cancelVendorPayoutRequest(id: string, payload: CancelPayoutRequestPayload = {}) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/vendor/payout-requests/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => normalizeVendorPayoutRequest(unwrap(res)))
}

export async function upsertVendorCommission(vendorId: string, payload: CommissionPayload) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/vendors/${vendorId}/commission`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(unwrap)
}

export async function updateVendorCommission(vendorId: string, payload: CommissionPayload) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/vendors/${vendorId}/commission`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(unwrap)
}

export async function getVendorCommission(vendorId: string) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/vendors/${vendorId}/commission`).then(unwrap)
}

export async function getAdminEventCommission(eventId: string) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/events/${eventId}/commission`).then(res => normalizeVendorTerms(unwrap(res)))
}

export async function updateEventCommission(eventId: string, payload: CommissionPayload) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/events/${eventId}/commission`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(unwrap)
}

export async function getAdminEventEarnings(eventId: string): Promise<AdminEventEarnings> {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/events/${eventId}/earnings`).then(res => {
    const raw = unwrap(res)
    return {
      ...sanitizeVendorEarnings(raw),
      ticketCommission: numberOrZero(raw.ticketCommission),
      fixedEventCommission: numberOrZero(raw.fixedEventCommission),
      gleeCommission: numberOrZero(raw.gleeCommission),
      platformRevenue: numberOrZero(raw.platformRevenue),
      rawVendorNet: numberOrZero(raw.rawVendorNet),
      adjustmentTotal: numberOrZero(raw.adjustmentTotal),
      adjustments: Array.isArray(raw.adjustments) ? raw.adjustments.map(normalizeAdminAdjustment) : [],
      payoutRequests: Array.isArray(raw.payoutRequests) ? raw.payoutRequests.map(normalizeAdminPayoutRequest) : [],
    }
  })
}

export async function verifyVendorPayoutProfile(vendorId: string, payload: VerifyPayoutProfilePayload) {
  return apiFetch<ApiEnvelope<VendorPayoutProfile>>(`/api/v1/admin/vendors/${vendorId}/payout-profile/verify`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(unwrap)
}

export async function listAdminPayoutRequests() {
  return apiFetch<ApiEnvelope<any[]>>('/api/v1/admin/payout-requests').then(res => unwrap(res).map(normalizeAdminPayoutRequest))
}

export async function getAdminPayoutRequest(id: string) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/payout-requests/${id}`).then(res => normalizeAdminPayoutRequest(unwrap(res)))
}

export async function approvePayoutRequest(id: string, payload: ApprovePayoutRequestPayload = {}) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/payout-requests/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => normalizeAdminPayoutRequest(unwrap(res)))
}

export async function rejectPayoutRequest(id: string, payload: RejectPayoutRequestPayload) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/payout-requests/${id}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => normalizeAdminPayoutRequest(unwrap(res)))
}

export async function cancelAdminPayoutRequest(id: string, payload: CancelPayoutRequestPayload = {}) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/payout-requests/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => normalizeAdminPayoutRequest(unwrap(res)))
}

export async function markPayoutRequestPaid(id: string, payload: MarkPayoutPaidPayload) {
  return apiFetch<ApiEnvelope<any>>(`/api/v1/admin/payout-requests/${id}/mark-paid`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then(res => normalizeAdminPayoutRequest(unwrap(res)))
}

export async function createPayoutAdjustment(payload: CreatePayoutAdjustmentPayload) {
  return apiFetch<ApiEnvelope<any>>('/api/v1/admin/payout-adjustments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => normalizeAdminAdjustment(unwrap(res)))
}

export function useVendorPayoutProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: payoutKeys.vendorProfile(),
    queryFn: getVendorPayoutProfile,
    enabled: options?.enabled ?? true,
    retry: false,
  })
}

export function useUpdateVendorPayoutProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateVendorPayoutProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useVendorEventEarnings(eventId: string, enabled = true) {
  return useQuery({
    queryKey: payoutKeys.vendorEventEarnings(eventId),
    queryFn: () => getVendorEventEarnings(eventId),
    enabled: enabled && Boolean(eventId),
  })
}

export function useVendorEventPayoutTerms(eventId: string, enabled = true) {
  return useQuery({
    queryKey: payoutKeys.vendorEventTerms(eventId),
    queryFn: () => getVendorEventPayoutTerms(eventId),
    enabled: enabled && Boolean(eventId),
  })
}

export function useVendorPayoutRequests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: payoutKeys.vendorRequests(),
    queryFn: listVendorPayoutRequests,
    enabled: options?.enabled ?? true,
  })
}

export function useCreateVendorPayoutRequest(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePayoutRequestPayload) => createVendorPayoutRequest(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payoutKeys.vendorRequests() })
      queryClient.invalidateQueries({ queryKey: payoutKeys.vendorEventEarnings(eventId) })
    },
  })
}

export function useCancelVendorPayoutRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelVendorPayoutRequest(id, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useAdminPayoutRequests(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: payoutKeys.adminRequests(),
    queryFn: listAdminPayoutRequests,
    enabled: options?.enabled ?? true,
  })
}

export function useAdminEventEarnings(eventId: string, enabled = true) {
  return useQuery({
    queryKey: payoutKeys.adminEventEarnings(eventId),
    queryFn: () => getAdminEventEarnings(eventId),
    enabled: enabled && Boolean(eventId),
  })
}

export function useAdminEventCommission(eventId: string, enabled = true) {
  return useQuery({
    queryKey: payoutKeys.adminEventCommission(eventId),
    queryFn: () => getAdminEventCommission(eventId),
    enabled: enabled && Boolean(eventId),
  })
}

export function useUpsertVendorCommission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, payload }: { vendorId: string; payload: CommissionPayload }) => upsertVendorCommission(vendorId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useUpdateEventCommission(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CommissionPayload) => updateEventCommission(eventId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useVerifyVendorPayoutProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ vendorId, payload }: { vendorId: string; payload: VerifyPayoutProfilePayload }) => verifyVendorPayoutProfile(vendorId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useApprovePayoutRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: ApprovePayoutRequestPayload }) => approvePayoutRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useRejectPayoutRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectPayoutRequestPayload }) => rejectPayoutRequest(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useCancelAdminPayoutRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelAdminPayoutRequest(id, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useMarkPayoutRequestPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkPayoutPaidPayload }) => markPayoutRequestPaid(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}

export function useCreatePayoutAdjustment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPayoutAdjustment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: payoutKeys.all }),
  })
}
