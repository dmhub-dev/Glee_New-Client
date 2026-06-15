export function canReviewEventByDate(value?: string | null, now: Date = new Date()) {
  if (!value) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date.getTime() < now.getTime()
}

export function canReviewReservationByStatus(status?: string | null) {
  return status === 'COMPLETED'
}

export function eventFeedbackTargetId(eventId: string, attendeeId = 'me') {
  return `event:${eventId}:attendee:${attendeeId || 'me'}`
}

export function reservationFeedbackTargetId(reservationId: string) {
  return `reservation:${reservationId}`
}

export function publicTicketFeedbackTargetId(token: string) {
  return `public-ticket:${token}`
}

export function publicReservationFeedbackTargetId(token: string) {
  return `public-reservation:${token}`
}
