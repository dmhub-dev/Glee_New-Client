import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadFeedbackStorage() {
  const source = await readFile(new URL('../src/api/queries/feedbackStorage.ts', import.meta.url), 'utf8')
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

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

test('upsertFeedback stores one editable review per target', async () => {
  const { getAllFeedbackFromStorage, getFeedbackForTargetFromStorage, upsertFeedbackInStorage } = await loadFeedbackStorage()
  const storage = memoryStorage()
  const firstNow = () => new Date('2026-06-15T10:00:00.000Z')
  const secondNow = () => new Date('2026-06-15T11:00:00.000Z')

  const first = upsertFeedbackInStorage(storage, {
    targetType: 'EVENT_TICKET',
    targetId: 'event:event-1:attendee:user-1',
    rating: 4,
    comment: ' Great night ',
    authorName: 'Amina',
  }, firstNow)

  const second = upsertFeedbackInStorage(storage, {
    targetType: 'EVENT_TICKET',
    targetId: 'event:event-1:attendee:user-1',
    rating: 5,
    comment: 'Even better after thinking about it',
    authorName: 'Amina',
  }, secondNow)

  assert.equal(second.id, first.id)
  assert.equal(second.submittedAt, '2026-06-15T10:00:00.000Z')
  assert.equal(second.updatedAt, '2026-06-15T11:00:00.000Z')
  assert.equal(second.rating, 5)
  assert.equal(second.comment, 'Even better after thinking about it')
  assert.equal(getAllFeedbackFromStorage(storage).length, 1)
  assert.deepEqual(getAllFeedbackFromStorage(storage)[0], second)
  assert.deepEqual(getFeedbackForTargetFromStorage(storage, 'EVENT_TICKET', 'event:event-1:attendee:user-1'), second)
})

test('upsertFeedback trims empty comments and rejects invalid ratings', async () => {
  const { getAllFeedbackFromStorage, upsertFeedbackInStorage } = await loadFeedbackStorage()
  const storage = memoryStorage()

  const feedback = upsertFeedbackInStorage(storage, {
    targetType: 'RESERVATION',
    targetId: 'reservation-1',
    rating: 3,
    comment: '   ',
  }, () => new Date('2026-06-15T10:00:00.000Z'))

  assert.equal(feedback.comment, undefined)
  assert.equal(getAllFeedbackFromStorage(storage).length, 1)
  assert.throws(() => {
    upsertFeedbackInStorage(storage, {
      targetType: 'RESERVATION',
      targetId: 'reservation-1',
      rating: 6,
    })
  }, /Rating must be between 1 and 5/)
})

test('upsertFeedback trims target IDs before storing and lookup keying', async () => {
  const { getAllFeedbackFromStorage, getFeedbackForTargetFromStorage, upsertFeedbackInStorage } = await loadFeedbackStorage()
  const storage = memoryStorage()

  const feedback = upsertFeedbackInStorage(storage, {
    targetType: 'RESERVATION',
    targetId: 'reservation-1 ',
    rating: 4,
  }, () => new Date('2026-06-15T10:00:00.000Z'))

  assert.equal(feedback.targetId, 'reservation-1')
  const stored = getFeedbackForTargetFromStorage(storage, 'RESERVATION', 'reservation-1')
  assert.equal(stored?.id, feedback.id)
  assert.equal(stored?.targetId, 'reservation-1')
  assert.equal(stored?.rating, 4)
  const allFeedback = getAllFeedbackFromStorage(storage)
  assert.equal(allFeedback.length, 1)
  assert.equal(allFeedback[0].id, feedback.id)
  assert.equal(allFeedback[0].targetId, 'reservation-1')
})

test('feedback storage recovers from malformed JSON on next write', async () => {
  const { FEEDBACK_STORAGE_KEY, getAllFeedbackFromStorage, upsertFeedbackInStorage } = await loadFeedbackStorage()
  const storage = memoryStorage()

  storage.setItem(FEEDBACK_STORAGE_KEY, '{not valid json')

  assert.deepEqual(getAllFeedbackFromStorage(storage), [])

  const feedback = upsertFeedbackInStorage(storage, {
    targetType: 'RESERVATION',
    targetId: 'reservation-1',
    rating: 5,
  }, () => new Date('2026-06-15T10:00:00.000Z'))

  const stored = getAllFeedbackFromStorage(storage)
  assert.equal(stored.length, 1)
  assert.equal(stored[0].id, feedback.id)
  assert.equal(stored[0].targetId, 'reservation-1')
  assert.equal(stored[0].rating, 5)
})

test('feedback storage ignores entries with malformed optional display fields', async () => {
  const { FEEDBACK_STORAGE_KEY, getAllFeedbackFromStorage } = await loadFeedbackStorage()
  const storage = memoryStorage()

  const validFeedback = {
    id: 'feedback-1',
    targetType: 'EVENT_TICKET',
    targetId: 'event:event-1:attendee:guest@example.com',
    rating: 5,
    comment: 'Loved it',
    authorName: 'Amina',
    submittedAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T11:00:00.000Z',
  }

  storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify([
    validFeedback,
    { ...validFeedback, id: 'bad-comment', comment: 42 },
    { ...validFeedback, id: 'bad-author', authorName: false },
    { ...validFeedback, id: 'bad-updated-at', updatedAt: { value: 'now' } },
    { ...validFeedback, id: 'bad-submitted-at-text', submittedAt: 'not-a-date' },
    { ...validFeedback, id: 'bad-updated-at-text', updatedAt: 'not-a-date' },
  ]))

  assert.deepEqual(getAllFeedbackFromStorage(storage), [validFeedback])
})

test('getFeedbackMapForTargets returns keyed feedback for admin lists', async () => {
  const { feedbackTargetKey, getFeedbackMapForTargetsFromStorage, upsertFeedbackInStorage } = await loadFeedbackStorage()
  const storage = memoryStorage()

  upsertFeedbackInStorage(storage, {
    targetType: 'RESERVATION',
    targetId: 'reservation-1',
    rating: 5,
  }, () => new Date('2026-06-15T10:00:00.000Z'))

  upsertFeedbackInStorage(storage, {
    targetType: 'RESERVATION',
    targetId: 'reservation-hidden',
    rating: 2,
  }, () => new Date('2026-06-15T10:05:00.000Z'))

  const map = getFeedbackMapForTargetsFromStorage(storage, [
    { targetType: 'RESERVATION', targetId: 'reservation-1' },
    { targetType: 'RESERVATION', targetId: 'reservation-2' },
  ])

  assert.equal(map[feedbackTargetKey('RESERVATION', 'reservation-1')]?.rating, 5)
  assert.equal(map[feedbackTargetKey('RESERVATION', 'reservation-2')], undefined)
  assert.equal(map[feedbackTargetKey('RESERVATION', 'reservation-hidden')], undefined)
  assert.equal(Object.keys(map).length, 1)
})
