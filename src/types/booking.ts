export type BookingStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type ReservationType =
  | 'standard_table'
  | 'vip_table'
  | 'bottle_only'
  | 'full_package'

export interface Booking {
  id: string
  venueId: string
  userId: string
  reservationType: ReservationType
  status: BookingStatus
  tableCategory: string
  minimumSpend: number
  depositPaid: boolean
  fullPaymentPaid: boolean
  guestCount: number
  notes?: string
  createdAt: string
  updatedAt: string
  actingUserId: string
}
