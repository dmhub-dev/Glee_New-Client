import { apiFetch } from '../client'

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
