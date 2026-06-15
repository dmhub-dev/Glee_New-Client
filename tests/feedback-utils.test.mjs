import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadFeedbackUtils() {
  const source = await readFile(new URL('../src/components/feedback/feedbackUtils.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })

  const module = { exports: {} }
  const evaluate = new Function('exports', 'module', outputText)
  evaluate(module.exports, module)
  return module.exports
}

test('event feedback opens only after the event has ended', async () => {
  const { canReviewEventByDate } = await loadFeedbackUtils()
  const now = new Date('2026-06-15T12:00:00.000Z')

  assert.equal(canReviewEventByDate('2026-06-14T20:00:00.000Z', '2026-06-15T20:00:00.000Z', now), false)
  assert.equal(canReviewEventByDate('2026-06-14T20:00:00.000Z', '2026-06-15T10:00:00.000Z', now), true)
  assert.equal(canReviewEventByDate('2026-06-14T20:00:00.000Z', null, now), true)
  assert.equal(canReviewEventByDate(null, null, now), false)
})

test('date-only event feedback opens after the full calendar end date', async () => {
  const { canReviewEventByDate } = await loadFeedbackUtils()

  assert.equal(canReviewEventByDate('2026-06-14', '2026-06-15', new Date('2026-06-15T12:00:00.000Z')), false)
  assert.equal(canReviewEventByDate('2026-06-14', '2026-06-15', new Date('2026-06-16T22:00:00.000Z')), true)
})

test('reservation feedback opens only when completed', async () => {
  const { canReviewReservationByStatus } = await loadFeedbackUtils()

  assert.equal(canReviewReservationByStatus('COMPLETED'), true)
  assert.equal(canReviewReservationByStatus('SEATED'), false)
  assert.equal(canReviewReservationByStatus('CONFIRMED'), false)
})

test('feedback target ids are deterministic across customer and admin contexts', async () => {
  const { eventFeedbackTargetId, publicReservationFeedbackTargetId, publicTicketFeedbackTargetId, reservationFeedbackTargetId } = await loadFeedbackUtils()

  assert.equal(eventFeedbackTargetId('event-1', 'user-1'), 'event:event-1:attendee:user-1')
  assert.equal(eventFeedbackTargetId('event-1'), 'event:event-1:attendee:me')
  assert.equal(reservationFeedbackTargetId('reservation-1'), 'reservation:reservation-1')
  assert.equal(publicTicketFeedbackTargetId('ticket-token'), 'public-ticket:ticket-token')
  assert.equal(publicReservationFeedbackTargetId('reservation-token'), 'public-reservation:reservation-token')
})

test('event ticket feedback target helpers line up public, customer, and admin identities', async () => {
  const { eventTicketFeedbackTargetId, eventTicketFeedbackTargetIds, publicTicketFeedbackTargetId } = await loadFeedbackUtils()

  assert.equal(
    eventTicketFeedbackTargetId('event-1', {
      userId: 'user-1',
      user: { id: 'user-1', email: 'amina@example.com', phone: '+254700000000' },
    }),
    'event:event-1:attendee:user-1',
  )

  assert.equal(
    eventTicketFeedbackTargetId('event-1', {
      attendeeEmail: 'guest@example.com',
      attendeePhone: '+254711111111',
      ticketRef: 'TICKET-1',
      publicAccessToken: 'public-token',
    }),
    'event:event-1:attendee:TICKET-1',
  )

  assert.deepEqual(
    eventTicketFeedbackTargetIds('event-1', {
      userId: 'user-1',
      user: { id: 'user-1', email: 'amina@example.com', phone: '+254700000000' },
      guestEmail: 'guest@example.com',
      guestPhone: '+254711111111',
      ticketRef: 'TICKET-1',
      publicAccessToken: 'public-token',
    }),
    [
      'event:event-1:attendee:user-1',
      'event:event-1:attendee:TICKET-1',
      'event:event-1:attendee:guest@example.com',
      'event:event-1:attendee:amina@example.com',
      'event:event-1:attendee:+254711111111',
      'event:event-1:attendee:+254700000000',
      publicTicketFeedbackTargetId('public-token'),
    ],
  )
})
