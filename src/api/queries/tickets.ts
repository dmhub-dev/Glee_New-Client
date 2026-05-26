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

export function confirmTicketPurchase(verificationToken: string): Promise<void> {
  return apiFetch<void>('/api/v1/event/tickets/confirm-purchase', {
    method: 'POST',
    body: JSON.stringify({ verificationToken }),
    skipAuth: true,
  })
}

export interface AdminEventTicket {
  id: string
  eventId: string
  userId: string | null
  quantity: number
  totalPrice: string | number
  createdAt: string
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
    metadata?: unknown
  } | null
  ticketCategory?: {
    id: string
    name: string
    price: string | number
  } | null
  checkedInAt?: string | null
}

export interface AdminEventTicketsResult {
  tickets: AdminEventTicket[]
  totalPages: number
  page: number
}

export function getAdminEventTickets(eventId: string): Promise<AdminEventTicketsResult> {
  const params = new URLSearchParams({ eventId, page: '1', limit: '100' })
  return apiFetch<{ success: boolean; data: AdminEventTicket[]; totalPages?: number; page?: number }>(
    `/api/v1/admin/event-ticket?${params.toString()}`,
  ).then(r => ({
    tickets: r.success === false ? [] : (r.data ?? []),
    totalPages: r.totalPages ?? 1,
    page: r.page ?? 1,
  }))
}

export function useAdminEventTickets(eventId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'event-tickets', eventId],
    queryFn: () => getAdminEventTickets(eventId as string),
    enabled: Boolean(eventId),
  })
}

export function checkInTicket(ticketId: string): Promise<void> {
  return apiFetch(`/api/v1/admin/event-ticket/${ticketId}/check-in`, { method: 'PATCH' })
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

export function useRevertTicketCheckIn(eventId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ticketId: string) => revertTicketCheckIn(ticketId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'event-tickets', eventId] }),
  })
}
