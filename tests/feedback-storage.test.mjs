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
  const { getFeedbackForTargetFromStorage, upsertFeedbackInStorage } = await loadFeedbackStorage()
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

test('getFeedbackMapForTargets returns keyed feedback for admin lists', async () => {
  const { feedbackTargetKey, getFeedbackMapForTargetsFromStorage, upsertFeedbackInStorage } = await loadFeedbackStorage()
  const storage = memoryStorage()

  upsertFeedbackInStorage(storage, {
    targetType: 'RESERVATION',
    targetId: 'reservation-1',
    rating: 5,
  }, () => new Date('2026-06-15T10:00:00.000Z'))

  const map = getFeedbackMapForTargetsFromStorage(storage, [
    { targetType: 'RESERVATION', targetId: 'reservation-1' },
    { targetType: 'RESERVATION', targetId: 'reservation-2' },
  ])

  assert.equal(map[feedbackTargetKey('RESERVATION', 'reservation-1')]?.rating, 5)
  assert.equal(map[feedbackTargetKey('RESERVATION', 'reservation-2')], undefined)
})
