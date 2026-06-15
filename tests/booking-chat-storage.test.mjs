import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadBookingChatStorage() {
  const source = await readFile(new URL('../src/lib/chat/bookingChatStorage.ts', import.meta.url), 'utf8')
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

const reservation = {
  id: 'reservation-1',
  reference: 'RSV-1',
  status: 'CONFIRMED',
  paymentStatus: 'SUCCESS',
  tableCategory: 'VIP Booth',
  guestName: 'Amina Guest',
  guestEmail: 'amina@example.com',
  guestPhone: '+254700000001',
  guestCount: 6,
  startDateTime: '2026-06-20T20:00:00.000Z',
  endDateTime: '2026-06-20T23:00:00.000Z',
  location: { id: 'loc-1', name: 'Glee Lounge', address: 'Westlands' },
}

function storedThread(overrides = {}) {
  return {
    id: 'booking-chat:reservation-1',
    reservationId: 'reservation-1',
    reference: 'RSV-1',
    title: 'Glee Lounge',
    customerName: 'Amina Guest',
    status: 'OPEN',
    unreadForCustomer: 0,
    unreadForStaff: 0,
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-06-15T10:00:00.000Z',
    resolvedAt: null,
    ...overrides,
  }
}

function storedMessage(overrides = {}) {
  return {
    id: 'message-1',
    threadId: 'booking-chat:reservation-1',
    reservationId: 'reservation-1',
    senderType: 'CUSTOMER',
    senderName: 'Amina Guest',
    body: 'Hello',
    createdAt: '2026-06-15T10:00:00.000Z',
    ...overrides,
  }
}

test('booking chat eligibility requires confirmed paid reservations', async () => {
  const { canOpenBookingChat } = await loadBookingChatStorage()

  assert.equal(canOpenBookingChat(reservation), true)
  assert.equal(canOpenBookingChat({ ...reservation, status: 'SEATED' }), true)
  assert.equal(canOpenBookingChat({ ...reservation, status: 'COMPLETED' }), true)
  assert.equal(canOpenBookingChat({ ...reservation, status: 'PENDING_PAYMENT' }), false)
  assert.equal(canOpenBookingChat({ ...reservation, status: 'CANCELLED' }), false)
  assert.equal(canOpenBookingChat({ ...reservation, paymentStatus: 'PENDING' }), false)
})

test('booking chat eligibility uses the current payment status before historical payments', async () => {
  const { canOpenBookingChat } = await loadBookingChatStorage()

  assert.equal(canOpenBookingChat({
    ...reservation,
    paymentStatus: 'SUCCESS',
    payments: [{ status: 'FAILED' }],
  }), true)
  assert.equal(canOpenBookingChat({
    ...reservation,
    paymentStatus: undefined,
    payment: { status: 'SUCCESS' },
    payments: [{ status: 'FAILED' }],
  }), true)
  assert.equal(canOpenBookingChat({
    ...reservation,
    paymentStatus: undefined,
    payment: undefined,
    payments: [{ status: 'FAILED' }, { status: 'SUCCESS' }],
  }), true)
  assert.equal(canOpenBookingChat({
    ...reservation,
    paymentStatus: undefined,
    payment: undefined,
    payments: [{ status: 'FAILED' }],
  }), false)
})

test('booking chat eligibility rejects failed or pending top-level payment status before successful nested payments', async () => {
  const { canOpenBookingChat } = await loadBookingChatStorage()

  for (const paymentStatus of ['FAILED', 'PENDING']) {
    assert.equal(canOpenBookingChat({
      ...reservation,
      paymentStatus,
      payment: { status: 'SUCCESS' },
      payments: [{ status: 'SUCCESS' }],
    }), false)
  }
})

test('booking chat eligibility rejects failed or pending current payment before successful historical payments', async () => {
  const { canOpenBookingChat } = await loadBookingChatStorage()

  for (const status of ['FAILED', 'PENDING']) {
    assert.equal(canOpenBookingChat({
      ...reservation,
      paymentStatus: undefined,
      payment: { status },
      payments: [{ status: 'SUCCESS' }],
    }), false)
  }
})

test('ensureBookingChatThread creates one deterministic thread per reservation', async () => {
  const { ensureBookingChatThread, getBookingChatThreadsFromStorage } = await loadBookingChatStorage()
  const storage = memoryStorage()
  const now = () => new Date('2026-06-15T10:00:00.000Z')

  const first = ensureBookingChatThread(storage, reservation, now)
  const second = ensureBookingChatThread(storage, reservation, () => new Date('2026-06-15T11:00:00.000Z'))

  assert.equal(first.id, 'booking-chat:reservation-1')
  assert.equal(second.id, first.id)
  assert.equal(second.createdAt, first.createdAt)
  assert.equal(second.updatedAt, first.updatedAt)
  assert.equal(getBookingChatThreadsFromStorage(storage).length, 1)
})

test('ensureBookingChatThread ignores stored threads with non-deterministic ids', async () => {
  const { BOOKING_CHAT_STORAGE_KEY, ensureBookingChatThread, getBookingChatThreadsFromStorage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  storage.setItem(BOOKING_CHAT_STORAGE_KEY, JSON.stringify({
    threads: [storedThread({ id: 'legacy-thread' })],
    messages: [],
  }))

  const thread = ensureBookingChatThread(storage, reservation, () => new Date('2026-06-15T11:00:00.000Z'))
  const threads = getBookingChatThreadsFromStorage(storage)

  assert.equal(thread.id, 'booking-chat:reservation-1')
  assert.equal(thread.createdAt, '2026-06-15T11:00:00.000Z')
  assert.equal(threads.length, 1)
  assert.equal(threads[0].id, 'booking-chat:reservation-1')
})

test('booking chat storage collapses duplicate stored threads for one reservation to the newest update', async () => {
  const { BOOKING_CHAT_STORAGE_KEY, getBookingChatThreadFromStorage, getBookingChatThreadsFromStorage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  storage.setItem(BOOKING_CHAT_STORAGE_KEY, JSON.stringify({
    threads: [
      storedThread({
        customerName: 'Older Thread',
        unreadForStaff: 1,
        updatedAt: '2026-06-15T10:00:00.000Z',
      }),
      storedThread({
        customerName: 'Newest Thread',
        unreadForStaff: 3,
        updatedAt: '2026-06-15T12:00:00.000Z',
      }),
    ],
    messages: [],
  }))

  const threads = getBookingChatThreadsFromStorage(storage)
  const thread = getBookingChatThreadFromStorage(storage, reservation.id)

  assert.equal(threads.length, 1)
  assert.equal(threads[0].customerName, 'Newest Thread')
  assert.equal(thread.customerName, 'Newest Thread')
  assert.equal(thread.unreadForStaff, 3)
})

test('sendBookingChatMessage appends messages and updates unread counts', async () => {
  const { getBookingChatMessagesFromStorage, getBookingChatThreadFromStorage, sendBookingChatMessage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  const customerMessage = sendBookingChatMessage(storage, reservation, {
    senderType: 'CUSTOMER',
    senderName: 'Amina Guest',
    body: 'Can we add one more chair?',
  }, () => new Date('2026-06-15T10:00:00.000Z'))

  assert.equal(customerMessage.body, 'Can we add one more chair?')
  assert.equal(getBookingChatThreadFromStorage(storage, reservation.id).unreadForStaff, 1)
  assert.equal(getBookingChatThreadFromStorage(storage, reservation.id).unreadForCustomer, 0)

  const staffMessage = sendBookingChatMessage(storage, reservation, {
    senderType: 'STAFF',
    senderName: 'Glee Lounge',
    body: 'Yes, we can arrange that.',
  }, () => new Date('2026-06-15T10:05:00.000Z'))

  const messages = getBookingChatMessagesFromStorage(storage, reservation.id)
  assert.equal(messages.length, 2)
  assert.equal(messages[0].id, customerMessage.id)
  assert.equal(messages[1].id, staffMessage.id)
  assert.equal(getBookingChatThreadFromStorage(storage, reservation.id).unreadForCustomer, 1)
})

test('markBookingChatRead clears unread count for the selected viewer', async () => {
  const { getBookingChatThreadFromStorage, markBookingChatRead, sendBookingChatMessage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  sendBookingChatMessage(storage, reservation, {
    senderType: 'CUSTOMER',
    senderName: 'Amina Guest',
    body: 'Hello',
  }, () => new Date('2026-06-15T10:00:00.000Z'))
  sendBookingChatMessage(storage, reservation, {
    senderType: 'STAFF',
    senderName: 'Glee Lounge',
    body: 'Hi Amina',
  }, () => new Date('2026-06-15T10:01:00.000Z'))

  markBookingChatRead(storage, reservation.id, 'STAFF')
  assert.equal(getBookingChatThreadFromStorage(storage, reservation.id).unreadForStaff, 0)
  assert.equal(getBookingChatThreadFromStorage(storage, reservation.id).unreadForCustomer, 1)

  markBookingChatRead(storage, reservation.id, 'CUSTOMER')
  assert.equal(getBookingChatThreadFromStorage(storage, reservation.id).unreadForCustomer, 0)
})

test('customer message reopens a resolved booking chat', async () => {
  const { getBookingChatThreadFromStorage, resolveBookingChatThread, sendBookingChatMessage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  sendBookingChatMessage(storage, reservation, {
    senderType: 'STAFF',
    senderName: 'Glee Lounge',
    body: 'We have resolved this.',
  }, () => new Date('2026-06-15T10:00:00.000Z'))
  resolveBookingChatThread(storage, reservation.id, () => new Date('2026-06-15T10:05:00.000Z'))
  assert.equal(getBookingChatThreadFromStorage(storage, reservation.id).status, 'RESOLVED')

  sendBookingChatMessage(storage, reservation, {
    senderType: 'CUSTOMER',
    senderName: 'Amina Guest',
    body: 'One more question.',
  }, () => new Date('2026-06-15T10:10:00.000Z'))
  const thread = getBookingChatThreadFromStorage(storage, reservation.id)
  assert.equal(thread.status, 'OPEN')
  assert.equal(thread.resolvedAt, null)
})

test('booking chat storage recovers from malformed JSON', async () => {
  const { BOOKING_CHAT_STORAGE_KEY, ensureBookingChatThread, getBookingChatThreadsFromStorage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  storage.setItem(BOOKING_CHAT_STORAGE_KEY, '{bad json')
  assert.deepEqual(getBookingChatThreadsFromStorage(storage), [])

  const thread = ensureBookingChatThread(storage, reservation, () => new Date('2026-06-15T10:00:00.000Z'))
  assert.equal(thread.id, 'booking-chat:reservation-1')
  assert.equal(getBookingChatThreadsFromStorage(storage).length, 1)
})

test('booking chat storage exports browser-safe key constants', async () => {
  const { BOOKING_CHAT_STORAGE_KEY, bookingChatThreadId } = await loadBookingChatStorage()

  assert.equal(BOOKING_CHAT_STORAGE_KEY, 'glee:booking-chat:v1')
  assert.equal(bookingChatThreadId('reservation-1'), 'booking-chat:reservation-1')
})

test('sendBookingChatMessage trims text and rejects empty bodies', async () => {
  const { getBookingChatMessagesFromStorage, sendBookingChatMessage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  const message = sendBookingChatMessage(storage, reservation, {
    senderType: 'CUSTOMER',
    senderName: 'Amina Guest',
    body: '  Please confirm the booth.  ',
  }, () => new Date('2026-06-15T10:00:00.000Z'))

  assert.equal(message.body, 'Please confirm the booth.')
  assert.throws(() => sendBookingChatMessage(storage, reservation, {
    senderType: 'CUSTOMER',
    senderName: 'Amina Guest',
    body: '   ',
  }), /Message cannot be empty/)
  assert.equal(getBookingChatMessagesFromStorage(storage, reservation.id).length, 1)
})

test('reopenBookingChatThread reopens an existing resolved thread', async () => {
  const { getBookingChatThreadFromStorage, reopenBookingChatThread, resolveBookingChatThread, sendBookingChatMessage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  sendBookingChatMessage(storage, reservation, {
    senderType: 'STAFF',
    senderName: 'Glee Lounge',
    body: 'This is resolved.',
  }, () => new Date('2026-06-15T10:00:00.000Z'))
  resolveBookingChatThread(storage, reservation.id, () => new Date('2026-06-15T10:05:00.000Z'))

  const reopened = reopenBookingChatThread(storage, reservation.id, () => new Date('2026-06-15T10:10:00.000Z'))

  assert.equal(reopened.status, 'OPEN')
  assert.equal(reopened.resolvedAt, null)
  assert.equal(getBookingChatThreadFromStorage(storage, reservation.id).updatedAt, '2026-06-15T10:10:00.000Z')
})

test('booking chat storage ignores malformed stored date records', async () => {
  const { BOOKING_CHAT_STORAGE_KEY, getBookingChatMessagesFromStorage, getBookingChatThreadsFromStorage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  storage.setItem(BOOKING_CHAT_STORAGE_KEY, JSON.stringify({
    threads: [{
      id: 'booking-chat:reservation-1',
      reservationId: 'reservation-1',
      reference: 'RSV-1',
      title: 'Glee Lounge',
      customerName: 'Amina Guest',
      status: 'OPEN',
      unreadForCustomer: 0,
      unreadForStaff: 0,
      createdAt: 'not-a-date',
      updatedAt: '2026-06-15T10:00:00.000Z',
      resolvedAt: null,
    }],
    messages: [{
      id: 'message-1',
      threadId: 'booking-chat:reservation-1',
      reservationId: 'reservation-1',
      senderType: 'CUSTOMER',
      senderName: 'Amina Guest',
      body: 'Hello',
      createdAt: 'not-a-date',
    }],
  }))

  assert.deepEqual(getBookingChatThreadsFromStorage(storage), [])
  assert.deepEqual(getBookingChatMessagesFromStorage(storage, reservation.id), [])
})

test('booking chat storage ignores messages with non-deterministic thread ids', async () => {
  const { BOOKING_CHAT_STORAGE_KEY, getBookingChatMessagesFromStorage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  storage.setItem(BOOKING_CHAT_STORAGE_KEY, JSON.stringify({
    threads: [storedThread()],
    messages: [
      storedMessage({ id: 'message-legacy', threadId: 'legacy-thread' }),
      storedMessage({ id: 'message-deterministic', body: 'Deterministic message' }),
    ],
  }))

  const messages = getBookingChatMessagesFromStorage(storage, reservation.id)

  assert.equal(messages.length, 1)
  assert.equal(messages[0].id, 'message-deterministic')
})

test('booking chat storage ignores malformed unread counters', async () => {
  const { BOOKING_CHAT_STORAGE_KEY, getBookingChatThreadsFromStorage } = await loadBookingChatStorage()
  const storage = memoryStorage()

  storage.setItem(BOOKING_CHAT_STORAGE_KEY, JSON.stringify({
    threads: [
      {
        id: 'booking-chat:reservation-1',
        reservationId: 'reservation-1',
        reference: 'RSV-1',
        title: 'Glee Lounge',
        customerName: 'Amina Guest',
        status: 'OPEN',
        unreadForCustomer: -1,
        unreadForStaff: 0,
        createdAt: '2026-06-15T10:00:00.000Z',
        updatedAt: '2026-06-15T10:00:00.000Z',
        resolvedAt: null,
      },
      {
        id: 'booking-chat:reservation-2',
        reservationId: 'reservation-2',
        reference: 'RSV-2',
        title: 'Glee Lounge',
        customerName: 'Amina Guest',
        status: 'OPEN',
        unreadForCustomer: 0,
        unreadForStaff: 1.5,
        createdAt: '2026-06-15T11:00:00.000Z',
        updatedAt: '2026-06-15T11:00:00.000Z',
        resolvedAt: null,
      },
    ],
    messages: [],
  }))

  assert.deepEqual(getBookingChatThreadsFromStorage(storage), [])
})
