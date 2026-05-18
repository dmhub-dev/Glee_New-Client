import type { Booking, BookingStatus } from '@glee/types'

export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => ['bookings', 'list'] as const,
  list: (filters: { venueId?: string; status?: BookingStatus; date?: string; tableCategory?: string }) =>
    ['bookings', 'list', filters] as const,
  byVenue: (venueId: string) => ['bookings', 'venue', venueId] as const,
  byId: (id: string) => ['bookings', id] as const,
}

export async function fetchBookings(filters: {
  venueId?: string
  status?: BookingStatus
  date?: string
  tableCategory?: string
  page?: number
  limit?: number
}): Promise<{ data: Booking[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  throw new Error('Not implemented')
}

export async function fetchBookingById(id: string): Promise<{ data: Booking }> {
  throw new Error('Not implemented')
}

export async function createBooking(_body: {
  venueId: string
  reservationType: Booking['reservationType']
  tableCategory: string
  guestCount: number
  notes?: string
}): Promise<{ data: Booking }> {
  throw new Error('Not implemented')
}

export async function updateBookingStatus(
  _id: string,
  _body: { status: BookingStatus; reason?: string },
): Promise<{ data: Booking }> {
  throw new Error('Not implemented')
}

export async function overrideBooking(
  _id: string,
  _body: {
    status?: BookingStatus
    minimumSpend?: number
    depositPaid?: boolean
    fullPaymentPaid?: boolean
    reason: string
  },
): Promise<{ data: Booking }> {
  throw new Error('Not implemented')
}
