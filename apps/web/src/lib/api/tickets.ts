const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export interface InitiateGuestPurchaseParams {
  eventId: string
  ticketCategoryId?: string
  noOfTickets: number
  guestName: string
  guestEmail: string
  guestPhone: string
}

export interface InitiateGuestPurchaseResult {
  access_code: string
  reference: string
  authorization_url: string
}

export async function initiateGuestPurchase(
  params: InitiateGuestPurchaseParams,
): Promise<InitiateGuestPurchaseResult> {
  const res = await fetch(`${BASE}/api/v1/event/tickets/initiate-guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string }
    throw new Error(body.message ?? 'Failed to initiate payment')
  }

  const data = await res.json() as { success: boolean; data: InitiateGuestPurchaseResult }
  return data.data
}
