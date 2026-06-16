import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadFeedbackQueries(apiFetch) {
  const source = await readFile(new URL('../src/api/queries/feedback.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  })

  const module = { exports: {} }
  const require = specifier => {
    if (specifier === '@tanstack/react-query') {
      return {
        useMutation: () => ({}),
        useQuery: () => ({}),
        useQueryClient: () => ({
          invalidateQueries: () => {},
          setQueryData: () => {},
        }),
      }
    }
    if (specifier === '../client') return { apiFetch }
    if (specifier === './feedbackStorage') {
      return {
        feedbackTargetKey: (targetType, targetId) => `${targetType}:${targetId}`,
        getAllFeedbackFromStorage: () => [],
        getFeedbackForTargetFromStorage: () => null,
        getFeedbackMapForTargetsFromStorage: () => ({}),
        upsertFeedbackInStorage: () => {
          throw new Error('storage adapter should not be used')
        },
      }
    }
    throw new Error(`Unexpected import ${specifier}`)
  }
  const evaluate = new Function('exports', 'module', 'require', outputText)
  evaluate(module.exports, module, require)
  return module.exports
}

test('feedback queries read target maps from the backend feedback endpoint', async () => {
  const calls = []
  const feedback = {
    id: 'feedback-1',
    targetType: 'EVENT_TICKET',
    targetId: 'event:event-1:attendee:user-1',
    rating: 5,
    submittedAt: '2026-06-16T08:00:00.000Z',
  }
  const { getFeedbackMapForTargets } = await loadFeedbackQueries(async (path, options) => {
    calls.push({ path, options })
    return {
      success: true,
      data: {
        'EVENT_TICKET:event:event-1:attendee:user-1': feedback,
      },
    }
  })

  const map = await getFeedbackMapForTargets([
    { targetType: 'EVENT_TICKET', targetId: 'event:event-1:attendee:user-1' },
    { targetType: 'EVENT_TICKET', targetId: 'public-ticket:ticket-token' },
  ])

  assert.equal(calls.length, 1)
  assert.equal(calls[0].path.split('?')[0], '/api/v1/feedback')
  const params = new URLSearchParams(calls[0].path.split('?')[1])
  assert.equal(params.get('targetType'), 'EVENT_TICKET')
  assert.deepEqual(params.get('targetIds').split(','), [
    'event:event-1:attendee:user-1',
    'public-ticket:ticket-token',
  ])
  assert.deepEqual(map['EVENT_TICKET:event:event-1:attendee:user-1'], feedback)
})

test('feedback upsert writes reviews through the backend feedback endpoint', async () => {
  const calls = []
  const saved = {
    id: 'feedback-2',
    targetType: 'RESERVATION',
    targetId: 'reservation:reservation-1',
    rating: 4,
    comment: 'Good table',
    submittedAt: '2026-06-16T08:00:00.000Z',
  }
  const { upsertFeedback } = await loadFeedbackQueries(async (path, options) => {
    calls.push({ path, options })
    return { success: true, data: saved }
  })

  const result = await upsertFeedback({
    targetType: 'RESERVATION',
    targetId: 'reservation:reservation-1',
    rating: 4,
    comment: 'Good table',
  })

  assert.deepEqual(result, saved)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/api/v1/feedback')
  assert.equal(calls[0].options.method, 'PUT')
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    targetType: 'RESERVATION',
    targetId: 'reservation:reservation-1',
    rating: 4,
    comment: 'Good table',
  })
})
