import { apiFetch } from '../client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface InitiateGuestPurchaseParams {
  eventId: string
  ticketCategoryId?: string
  noOfTickets: number
  guestName: string
  guestEmail: string
  guestPhone: string
  menuItems?: { id: string; quantity: number }[]
  callbackUrl?: string
}

export interface InitiateGuestPurchaseResult {
  access_code: string
  reference: string
  authorization_url: string
  verificationToken: string
}

export function initiateGuestPurchase(
  params: InitiateGuestPurchaseParams,
): Promise<InitiateGuestPurchaseResult> {
  return apiFetch<{ success: boolean; data: InitiateGuestPurchaseResult }>(
    '/api/v1/event/tickets/initiate-guest',
    { method: 'POST', body: JSON.stringify(params), skipAuth: true },
  ).then(r => r.data)
}

export function confirmTicketPurchase(input: string | { verificationToken?: string; reference?: string }): Promise<void> {
  const payload = typeof input === 'string'
    ? { verificationToken: input }
    : input
  return apiFetch<void>('/api/v1/event/tickets/confirm-purchase', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  })
}

export interface PurchaseTicketParams {
  eventId: string
  ticketCategoryId?: string
  noOfTickets: number
  preOrderMenu?: { id: string; quantity: number }[]
  useWallet?: boolean
  walletPaymentType?: 'FULL' | 'INSTALLMENT'
  installmentCount?: number
  callbackUrl?: string
}

export interface PurchaseTicketResult {
  reference?: string
  authorization_url?: string
  access_code?: string
  verificationToken?: string
}

export function purchaseTicket(params: PurchaseTicketParams): Promise<PurchaseTicketResult> {
  return apiFetch<{ success: boolean; data?: PurchaseTicketResult }>('/api/v1/event/tickets/purchase', {
    method: 'POST',
    body: JSON.stringify(params),
  }).then(r => r.data ?? {})
}

export function ticketVerificationStorageKey(reference: string) {
  return `glee:event-ticket-verification:${reference}`
}

export function ticketCheckoutContextStorageKey(reference: string) {
  return `glee:event-ticket-context:${reference}`
}

export interface AdminEventTicket {
  id: string
  eventId: string
  userId: string | null
  purchaseGroupId?: string | null
  ticketRef?: string | null
  publicAccessToken?: string | null
  publicUrl?: string | null
  ticketNumber?: number | null
  status?: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | string
  quantity: number
  totalPrice: string | number
  amountPaid?: string | number
  outstandingAmount?: string | number
  paymentDueDate?: string | null
  paymentPlan?: unknown
  createdAt: string
  checkedInAt?: string | null
  guestName?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  user: {
    id?: string
    name?: string | null
    email?: string | null
    phone?: string | null
  } | null
  payment?: {
    amount?: string | number | null
    totalPrice?: string | number | null
    noOfItems?: number | null
    paymentMethod?: string | null
    paymentStatus?: string | null
    isPaid?: boolean | null
    metadata?: unknown
  } | null
  ticketCategory?: {
    id: string
    name: string
    price: string | number
  } | null
  ticketCheckIns?: Array<{
    id: string
    ticketRef: string
    ticketNumber: number
    checkedInAt: string
    checkedInBy?: {
      id?: string
      name?: string | null
      email?: string | null
    } | null
  }>
}

export interface PublicTicketPass {
  ticket: {
    id: string
    ticketRef: string
    ticketNumber: number
    status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | string
    qrEnabled: boolean
    checkedInAt?: string | null
    createdAt?: string | null
    publicUrl?: string | null
    ticketType?: string | null
    ticketCategory?: { id: string; name: string; price: number } | null
    payment?: {
      method?: string | null
      status?: string | null
      isPaid?: boolean | null
      totalPrice?: number | null
      amountPaid?: number | null
      outstandingAmount?: number | null
    } | null
    menuItems?: Array<{ id?: string | null; name: string; price: number; quantity: number }>
  }
  attendee: {
    name?: string | null
    email?: string | null
    phone?: string | null
  }
  event: {
    id: string
    name: string
    description?: string | null
    startDate?: string | null
    endDate?: string | null
    photos?: string[]
    location?: { id?: string; name?: string | null; address?: string | null } | null
    category?: { id?: string; name?: string | null } | null
    schedules?: Array<{
      id: string
      name: string
      description?: string | null
      startDate: string
      endDate: string
    }>
  }
}

export function getPublicTicketPass(token: string): Promise<PublicTicketPass> {
  return apiFetch<{ success: boolean; data: PublicTicketPass }>(
    `/api/v1/event/tickets/public/${encodeURIComponent(token)}`,
    { skipAuth: true },
  ).then(r => r.data)
}

export function usePublicTicketPass(token: string | undefined) {
  return useQuery({
    queryKey: ['public-ticket-pass', token],
    queryFn: () => getPublicTicketPass(token as string),
    enabled: Boolean(token),
    retry: false,
  })
}

export interface AdminEventTicketsResult {
  tickets: AdminEventTicket[]
  totalPages: number
  page: number
}

export function getAdminEventTickets(eventId: string, page = 1, limit = 100): Promise<AdminEventTicketsResult> {
  const params = new URLSearchParams({ eventId, page: String(page), limit: String(limit) })
  return apiFetch<{ success: boolean; data: AdminEventTicket[]; totalPages?: number; page?: number }>(
    `/api/v1/admin/event-ticket?${params.toString()}`,
  ).then(r => ({
    tickets: r.success === false ? [] : (r.data ?? []),
    totalPages: r.totalPages ?? 1,
    page: r.page ?? 1,
  }))
}

export function useAdminEventTickets(eventId: string | undefined, page = 1, limit = 100) {
  return useQuery({
    queryKey: ['admin', 'event-tickets', eventId, page, limit],
    queryFn: () => getAdminEventTickets(eventId as string, page, limit),
    enabled: Boolean(eventId),
  })
}

export function checkInTicket(ticketId: string): Promise<void> {
  return apiFetch(`/api/v1/admin/event-ticket/${ticketId}/check-in`, { method: 'PATCH' })
}

export interface CheckInTicketByQrParams {
  eventId: string
  ticketRef: string
}

export interface CheckInTicketByQrResult {
  ticket: AdminEventTicket
  checkIn: {
    id: string
    ticketRef: string
    ticketNumber: number
    checkedInAt: string
  }
  ticketRef: string
  ticketNumber: number
  checkedInCount: number
  remainingCount: number
}

export function checkInTicketByQr(params: CheckInTicketByQrParams): Promise<CheckInTicketByQrResult> {
  return apiFetch<{ success: boolean; data: CheckInTicketByQrResult }>('/api/v1/admin/event-ticket/check-in/qr', {
    method: 'POST',
    body: JSON.stringify(params),
  }).then(r => r.data)
}

export function revertTicketCheckIn(ticketId: string): Promise<void> {
  return apiFetch(`/api/v1/admin/event-ticket/${ticketId}/check-in/revert`, { method: 'PATCH' })
}

export function useCheckInTicket(eventId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticketId: string) => checkInTicket(ticketId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'event-tickets', eventId] }),
  })
}

export function useCheckInTicketByQr(eventId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: CheckInTicketByQrParams) => checkInTicketByQr(params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'event-tickets', eventId] }),
  })
}

export function useRevertTicketCheckIn(eventId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticketId: string) => revertTicketCheckIn(ticketId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'event-tickets', eventId] }),
  })
}

export interface IssueComplimentaryTicketParams {
  eventId: string
  ticketCategoryId: string
  quantity: number
  recipientName: string
  recipientEmail: string
  recipientPhone?: string
  note?: string
  checkInNow?: boolean
}

export function issueComplimentaryTicket(params: IssueComplimentaryTicketParams): Promise<AdminEventTicket> {
  return apiFetch<{ success: boolean; data: AdminEventTicket }>('/api/v1/admin/event-ticket/complimentary', {
    method: 'POST',
    body: JSON.stringify(params),
  }).then(r => r.data)
}

export function useIssueComplimentaryTicket(eventId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: issueComplimentaryTicket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'event-tickets', eventId] })
      qc.invalidateQueries({ queryKey: ['admin', 'events'] })
    },
  })
}

export interface TicketAttendant {
  id: string
  eventId: string
  name: string
  email: string
  status: 'INVITED' | 'ACTIVE' | 'REVOKED' | 'EXPIRED' | string
  sessionActive: boolean
  lastLoginAt?: string | null
  revokedAt?: string | null
  createdAt?: string
  checkedInCount?: number
  attemptCount?: number
  pin?: string
  inviteUrl?: string
}

export interface TicketAttendantStats {
  id: string
  name: string
  email: string
  status: string
  success: number
  duplicate: number
  invalid: number
  attempts: number
}

export interface AttendantDeskEvent {
  id: string
  name: string
  status: string
  startDate?: string | null
  endDate?: string | null
}

export interface AttendantDeskTicket {
  id: string
  ticketRef?: string
  ticketRefDisplay?: string | null
  ticketNumber?: number | null
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED' | string
  checkedInAt?: string | null
  attendee: {
    name: string
    email?: string | null
    phone?: string | null
  }
  ticketTier?: string | null
  menu?: unknown
  checkedInBy?: { id: string; name: string } | null
}

export interface TicketAttendantAccessResult {
  token: string
  expiresAt: string
  attendant: Pick<TicketAttendant, 'id' | 'name' | 'email' | 'status'>
  event: AttendantDeskEvent
}

export interface TicketAttendantDeskResult {
  attendant: Pick<TicketAttendant, 'id' | 'name' | 'email' | 'status'>
  event: AttendantDeskEvent
  canCheckIn: boolean
}

export function getTicketAttendants(eventId: string): Promise<TicketAttendant[]> {
  return apiFetch<{ success: boolean; data: TicketAttendant[] }>(
    `/api/v1/admin/events/${eventId}/ticket-attendants`,
  ).then(r => r.data ?? [])
}

export function getTicketAttendantStats(eventId: string): Promise<TicketAttendantStats[]> {
  return apiFetch<{ success: boolean; data: TicketAttendantStats[] }>(
    `/api/v1/admin/events/${eventId}/ticket-attendants/stats`,
  ).then(r => r.data ?? [])
}

export function createTicketAttendant(params: { eventId: string; name: string; email: string }): Promise<TicketAttendant> {
  return apiFetch<{ success: boolean; data: TicketAttendant }>(
    `/api/v1/admin/events/${params.eventId}/ticket-attendants`,
    {
      method: 'POST',
      body: JSON.stringify({ name: params.name, email: params.email }),
    },
  ).then(r => r.data)
}

export function resetTicketAttendantSession(params: { eventId: string; id: string }): Promise<void> {
  return apiFetch(`/api/v1/admin/events/${params.eventId}/ticket-attendants/${params.id}/reset-session`, {
    method: 'PATCH',
  })
}

export function revokeTicketAttendant(params: { eventId: string; id: string }): Promise<void> {
  return apiFetch(`/api/v1/admin/events/${params.eventId}/ticket-attendants/${params.id}/revoke`, {
    method: 'PATCH',
  })
}

export function useTicketAttendants(eventId?: string) {
  return useQuery({
    queryKey: ['admin', 'ticket-attendants', eventId],
    queryFn: () => getTicketAttendants(eventId as string),
    enabled: Boolean(eventId),
  })
}

export function useTicketAttendantStats(eventId?: string) {
  return useQuery({
    queryKey: ['admin', 'ticket-attendant-stats', eventId],
    queryFn: () => getTicketAttendantStats(eventId as string),
    enabled: Boolean(eventId),
  })
}

export function useCreateTicketAttendant(eventId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTicketAttendant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ticket-attendants', eventId] })
      qc.invalidateQueries({ queryKey: ['admin', 'ticket-attendant-stats', eventId] })
    },
  })
}

export function useResetTicketAttendantSession(eventId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: resetTicketAttendantSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'ticket-attendants', eventId] }),
  })
}

export function useRevokeTicketAttendant(eventId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: revokeTicketAttendant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ticket-attendants', eventId] })
      qc.invalidateQueries({ queryKey: ['admin', 'ticket-attendant-stats', eventId] })
    },
  })
}

export function accessTicketAttendantDesk(params: {
  token: string
  name: string
  email: string
  pin: string
}): Promise<TicketAttendantAccessResult> {
  return apiFetch<{ success: boolean; data: TicketAttendantAccessResult }>('/api/v1/ticket-attendants/access', {
    method: 'POST',
    body: JSON.stringify(params),
    skipAuth: true,
  }).then(r => r.data)
}

export function getTicketAttendantDesk(sessionToken: string): Promise<TicketAttendantDeskResult> {
  return apiFetch<{ success: boolean; data: TicketAttendantDeskResult }>('/api/v1/ticket-attendants/me', {
    skipAuth: true,
    headers: { 'x-attendant-token': sessionToken },
  }).then(r => r.data)
}

export function getTicketAttendantAttendees(sessionToken: string): Promise<AttendantDeskTicket[]> {
  return apiFetch<{ success: boolean; data: AttendantDeskTicket[] }>('/api/v1/ticket-attendants/attendees', {
    skipAuth: true,
    headers: { 'x-attendant-token': sessionToken },
  }).then(r => r.data ?? [])
}

export function attendantCheckIn(params: {
  sessionToken: string
  ticketRef: string
  source?: 'QR' | 'MANUAL'
}): Promise<AttendantDeskTicket> {
  return apiFetch<{ success: boolean; data: AttendantDeskTicket }>('/api/v1/ticket-attendants/check-in', {
    method: 'POST',
    body: JSON.stringify({ ticketRef: params.ticketRef, source: params.source ?? 'QR' }),
    skipAuth: true,
    headers: { 'x-attendant-token': params.sessionToken },
  }).then(r => r.data)
}

export function attendantLogout(sessionToken: string): Promise<void> {
  return apiFetch('/api/v1/ticket-attendants/logout', {
    method: 'POST',
    skipAuth: true,
    headers: { 'x-attendant-token': sessionToken },
  })
}

export interface MyTicketGroup {
  event: {
    id: string
    name: string
    description?: string | null
    photos?: string[]
    startDate?: string | null
    endDate?: string | null
    status?: string
    category?: { id: string; name: string } | null
    location?: { id?: string; name?: string | null; address?: string | null } | null
  }
  tickets: AdminEventTicket[]
  noOfTicketsPurchased: number
  totalPrice: number
  count: number
  lastTicketPurchasedOn?: string
}

export function getMyTickets(): Promise<MyTicketGroup[]> {
  return apiFetch<{ success: boolean; data: MyTicketGroup[] }>('/api/v1/event/tickets/my?page=1&limit=100')
    .then(r => r.data ?? [])
}

export function useMyTickets() {
  return useQuery({ queryKey: ['me', 'tickets'], queryFn: getMyTickets })
}

export function usePurchaseTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: PurchaseTicketParams) => purchaseTicket(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'tickets'] })
      qc.invalidateQueries({ queryKey: ['wallet'] })
    },
  })
}
