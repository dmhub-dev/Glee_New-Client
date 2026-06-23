import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadBookingChatQueries(apiFetch) {
  const source = await readFile(new URL('../src/api/queries/bookingChat.ts', import.meta.url), 'utf8')
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
        }),
      }
    }
    if (specifier === '../client') return { apiFetch }
    if (specifier === '../../lib/chat/bookingChatStorage') {
      return {
        canOpenBookingChat: reservation => Boolean(reservation),
        bookingChatThreadId: reservationId => `booking-chat:${reservationId}`,
        ensureBookingChatThread: () => {
          throw new Error('storage adapter should not be used')
        },
        getBookingChatMessagesFromStorage: () => [],
        getBookingChatThreadsFromStorage: () => [],
        markBookingChatRead: () => null,
        reopenBookingChatThread: () => null,
        resolveBookingChatThread: () => null,
        sendBookingChatMessage: () => {
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

const reservation = {
  id: 'reservation-1',
  reference: 'RSV-1',
  status: 'CONFIRMED',
  paymentStatus: 'SUCCESS',
  tableCategory: 'VIP',
}

test('booking chat queries call the backend reservation chat endpoints', async () => {
  const calls = []
  const thread = {
    id: 'thread-1',
    reservationId: 'reservation-1',
    reference: 'RSV-1',
    title: 'VIP',
    customerName: 'Amina',
    status: 'OPEN',
    unreadForCustomer: 0,
    unreadForStaff: 0,
    createdAt: '2026-06-16T08:00:00.000Z',
    updatedAt: '2026-06-16T08:00:00.000Z',
    resolvedAt: null,
  }
  const message = {
    id: 'message-1',
    threadId: 'thread-1',
    reservationId: 'reservation-1',
    senderType: 'CUSTOMER',
    senderName: 'Amina',
    body: 'Hello',
    createdAt: '2026-06-16T08:01:00.000Z',
  }
  const api = await loadBookingChatQueries(async (path, options = {}) => {
    calls.push({ path, options })
    if (path === '/api/v1/booking-chats') return { success: true, data: [thread] }
    if (path.endsWith('/messages') && options.method !== 'POST') return { success: true, data: [message] }
    if (path.endsWith('/messages') && options.method === 'POST') return { success: true, data: message }
    return { success: true, data: thread }
  })

  assert.deepEqual(await api.listBookingChatThreads(), [thread])
  assert.deepEqual(await api.getBookingChatThread(reservation), thread)
  assert.deepEqual(await api.getBookingChatMessages('reservation-1'), [message])
  assert.deepEqual(
    await api.sendBookingChatMessageMutation({
      reservation,
      draft: { senderType: 'CUSTOMER', senderName: 'Amina', body: 'Hello' },
    }),
    message,
  )
  assert.deepEqual(await api.markBookingChatReadMutation({ reservationId: 'reservation-1', viewer: 'STAFF' }), thread)
  assert.deepEqual(await api.resolveBookingChatThreadMutation('reservation-1'), thread)
  assert.deepEqual(await api.reopenBookingChatThreadMutation('reservation-1'), thread)

  assert.deepEqual(calls.map(call => call.path), [
    '/api/v1/booking-chats',
    '/api/v1/reservations/reservation-1/chat',
    '/api/v1/reservations/reservation-1/chat/messages',
    '/api/v1/reservations/reservation-1/chat/messages',
    '/api/v1/reservations/reservation-1/chat/read',
    '/api/v1/reservations/reservation-1/chat/status',
    '/api/v1/reservations/reservation-1/chat/status',
  ])
  assert.equal(calls[3].options.method, 'POST')
  assert.deepEqual(JSON.parse(calls[3].options.body), { body: 'Hello' })
  assert.equal(calls[4].options.method, 'POST')
  assert.equal(calls[5].options.method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[5].options.body), { status: 'RESOLVED' })
  assert.deepEqual(JSON.parse(calls[6].options.body), { status: 'OPEN' })
})
