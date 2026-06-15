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

test('event feedback opens only after the event date has passed', async () => {
  const { canReviewEventByDate } = await loadFeedbackUtils()
  const now = new Date('2026-06-15T12:00:00.000Z')

  assert.equal(canReviewEventByDate('2026-06-14T20:00:00.000Z', now), true)
  assert.equal(canReviewEventByDate('2026-06-16T20:00:00.000Z', now), false)
  assert.equal(canReviewEventByDate(null, now), false)
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
