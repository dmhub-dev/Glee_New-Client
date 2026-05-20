export const MOCK_DASHBOARD_STATS = {
  upcomingEvents: 12,
  upcomingEventsDelta: 18,
  totalBookings: 1798,
  totalBookingsDelta: 5,
  ticketsSold: 1250,
  ticketsSoldDelta: -3,
}

export const MOCK_REVENUE_CHART = [
  { month: 'Jan', revenue: 28000, profit: 12000 },
  { month: 'Feb', revenue: 35000, profit: 18000 },
  { month: 'Mar', revenue: 42000, profit: 21000 },
  { month: 'Apr', revenue: 56000, profit: 28000 },
  { month: 'May', revenue: 48000, profit: 22000 },
  { month: 'Jun', revenue: 61000, profit: 31000 },
  { month: 'Jul', revenue: 55000, profit: 27000 },
  { month: 'Aug', revenue: 72000, profit: 38000 },
]

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled'

export interface MockBooking {
  id: string
  date: string
  customerName: string
  event: string
  qty: number
  amount: number
  status: BookingStatus
}

export const MOCK_RECENT_BOOKINGS: MockBooking[] = [
  { id: 'INV10011', date: '2026-05-15T10:30:00', customerName: 'Jackson Moore', event: 'Neon Nights', qty: 2, amount: 4000, status: 'confirmed' },
  { id: 'INV10012', date: '2026-05-15T14:20:00', customerName: 'Alicia Smithson', event: 'Red & Black Ball', qty: 1, amount: 2500, status: 'pending' },
  { id: 'INV10013', date: '2026-05-16T09:15:00', customerName: 'Marcus Rawless', event: 'AfroFusion Saturdays', qty: 3, amount: 7500, status: 'confirmed' },
  { id: 'INV10014', date: '2026-05-17T11:00:00', customerName: 'Patrick Cooper', event: 'House Nation', qty: 4, amount: 6000, status: 'cancelled' },
  { id: 'INV10015', date: '2026-05-18T16:45:00', customerName: 'Gilda Ramos', event: 'Neon Nights', qty: 2, amount: 3000, status: 'confirmed' },
]

export type ActivityType = 'approved_event' | 'updated_tickets' | 'confirmed_booking' | 'cancelled_booking' | 'created_event'

export interface MockActivity {
  id: string
  type: ActivityType
  description: string
  timestamp: string
}

export const MOCK_ACTIVITY: MockActivity[] = [
  { id: '1', type: 'approved_event', description: 'Approved "Red & Black Ball"', timestamp: '2026-05-20T08:30:00' },
  { id: '2', type: 'updated_tickets', description: 'Ticket prices updated for "AfroFusion Saturdays"', timestamp: '2026-05-20T07:45:00' },
  { id: '3', type: 'confirmed_booking', description: 'Booking INV10013 confirmed via Paystack', timestamp: '2026-05-20T06:00:00' },
  { id: '4', type: 'cancelled_booking', description: 'Booking INV10014 cancelled by customer', timestamp: '2026-05-19T11:00:00' },
  { id: '5', type: 'created_event', description: 'New event "Latin Night" submitted for approval', timestamp: '2026-05-19T09:30:00' },
]
