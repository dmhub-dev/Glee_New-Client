interface EventTicketFeedbackIdentity {
  userId?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  attendeeEmail?: string | null
  attendeePhone?: string | null
  ticketRef?: string | null
  publicAccessToken?: string | null
  user?: {
    id?: string | null
    email?: string | null
    phone?: string | null
  } | null
}

function parseEventReviewCutoff(value?: string | null) {
  if (!value) return null
  const text = value.trim()
  if (!text) return null

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text)
  const date = new Date(dateOnly ? `${text}T23:59:59.999` : text)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeFeedbackIdentity(value?: string | null) {
  const text = value?.trim()
  return text || null
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

export function canReviewEventByDate(
  startDate?: string | null,
  endDateOrNow?: string | null | Date,
  now: Date = new Date(),
) {
  const endDate = endDateOrNow instanceof Date ? null : endDateOrNow
  const comparisonDate = endDateOrNow instanceof Date ? endDateOrNow : now
  const cutoff = parseEventReviewCutoff(endDate ?? startDate)
  return Boolean(cutoff && cutoff.getTime() < comparisonDate.getTime())
}

export function canReviewReservationByStatus(status?: string | null) {
  return status === 'COMPLETED'
}

export function eventFeedbackTargetId(eventId: string, attendeeId = 'me') {
  return `event:${eventId}:attendee:${attendeeId || 'me'}`
}

export function eventTicketFeedbackTargetIds(eventId: string, identity: EventTicketFeedbackIdentity = {}) {
  const attendeeIds = [
    identity.userId,
    identity.user?.id,
    identity.ticketRef,
    identity.guestEmail,
    identity.attendeeEmail,
    identity.user?.email,
    identity.guestPhone,
    identity.attendeePhone,
    identity.user?.phone,
  ]
    .map(normalizeFeedbackIdentity)
    .filter((value): value is string => Boolean(value))

  const targets = unique(attendeeIds.map(attendeeId => eventFeedbackTargetId(eventId, attendeeId)))
  if (targets.length === 0) targets.push(eventFeedbackTargetId(eventId))

  const publicToken = normalizeFeedbackIdentity(identity.publicAccessToken)
  if (publicToken) targets.push(publicTicketFeedbackTargetId(publicToken))

  return unique(targets)
}

export function eventTicketFeedbackTargetId(eventId: string, identity: EventTicketFeedbackIdentity = {}) {
  return eventTicketFeedbackTargetIds(eventId, identity)[0] ?? eventFeedbackTargetId(eventId)
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
