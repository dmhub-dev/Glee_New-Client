export type BookingChatViewerType = 'CUSTOMER' | 'STAFF'
export type BookingChatSenderType = BookingChatViewerType | 'SYSTEM'
export type BookingChatThreadStatus = 'OPEN' | 'RESOLVED'

export interface BookingChatStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem?(key: string): void
}

export interface BookingChatReservationSummary {
  id: string
  reference: string
  status: string
  paymentStatus?: string | null
  payment?: { status?: string | null } | null
  payments?: Array<{ status?: string | null }>
  tableCategory: string
  guestName?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  guestCount?: number | null
  startDateTime?: string | null
  endDateTime?: string | null
  location?: { id?: string | null; name?: string | null; address?: string | null } | null
  event?: { id?: string | null; name?: string | null } | null
  user?: { name?: string | null; email?: string | null; phone?: string | null } | null
}

export interface BookingChatThread {
  id: string
  reservationId: string
  reference: string
  title: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  status: BookingChatThreadStatus
  unreadForCustomer: number
  unreadForStaff: number
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
}

export interface BookingChatMessage {
  id: string
  threadId: string
  reservationId: string
  senderType: BookingChatSenderType
  senderName: string
  body: string
  createdAt: string
}

export interface BookingChatMessageDraft {
  senderType: BookingChatSenderType
  senderName: string
  body: string
}

interface BookingChatState {
  threads: BookingChatThread[]
  messages: BookingChatMessage[]
}

export const BOOKING_CHAT_STORAGE_KEY = 'glee:booking-chat:v1'

const ELIGIBLE_STATUSES = new Set(['CONFIRMED', 'SEATED', 'COMPLETED'])

export function bookingChatThreadId(reservationId: string) {
  return `booking-chat:${reservationId}`
}

function validDateString(value: string) {
  return Number.isFinite(new Date(value).getTime())
}

function isThread(value: unknown): value is BookingChatThread {
  if (!value || typeof value !== 'object') return false

  const item = value as Partial<BookingChatThread>
  return (
    typeof item.id === 'string' &&
    typeof item.reservationId === 'string' &&
    typeof item.reference === 'string' &&
    typeof item.title === 'string' &&
    typeof item.customerName === 'string' &&
    (item.customerEmail === undefined || item.customerEmail === null || typeof item.customerEmail === 'string') &&
    (item.customerPhone === undefined || item.customerPhone === null || typeof item.customerPhone === 'string') &&
    (item.status === 'OPEN' || item.status === 'RESOLVED') &&
    typeof item.unreadForCustomer === 'number' &&
    Number.isFinite(item.unreadForCustomer) &&
    typeof item.unreadForStaff === 'number' &&
    Number.isFinite(item.unreadForStaff) &&
    typeof item.createdAt === 'string' &&
    validDateString(item.createdAt) &&
    typeof item.updatedAt === 'string' &&
    validDateString(item.updatedAt) &&
    (item.resolvedAt === undefined ||
      item.resolvedAt === null ||
      (typeof item.resolvedAt === 'string' && validDateString(item.resolvedAt)))
  )
}

function isMessage(value: unknown): value is BookingChatMessage {
  if (!value || typeof value !== 'object') return false

  const item = value as Partial<BookingChatMessage>
  return (
    typeof item.id === 'string' &&
    typeof item.threadId === 'string' &&
    typeof item.reservationId === 'string' &&
    (item.senderType === 'CUSTOMER' || item.senderType === 'STAFF' || item.senderType === 'SYSTEM') &&
    typeof item.senderName === 'string' &&
    typeof item.body === 'string' &&
    typeof item.createdAt === 'string' &&
    validDateString(item.createdAt)
  )
}

function emptyState(): BookingChatState {
  return { threads: [], messages: [] }
}

function readState(storage: BookingChatStorageLike | null | undefined): BookingChatState {
  if (!storage) return emptyState()

  try {
    const raw = storage.getItem(BOOKING_CHAT_STORAGE_KEY)
    if (!raw) return emptyState()

    const parsed = JSON.parse(raw) as Partial<BookingChatState>
    return {
      threads: Array.isArray(parsed.threads) ? parsed.threads.filter(isThread) : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages.filter(isMessage) : [],
    }
  } catch {
    return emptyState()
  }
}

function writeState(storage: BookingChatStorageLike, state: BookingChatState) {
  storage.setItem(BOOKING_CHAT_STORAGE_KEY, JSON.stringify(state))
}

function paymentStatuses(reservation: BookingChatReservationSummary) {
  return [
    reservation.paymentStatus,
    reservation.payment?.status,
    ...(reservation.payments?.map(payment => payment.status) ?? []),
  ].filter((status): status is string => Boolean(status))
}

export function canOpenBookingChat(reservation?: BookingChatReservationSummary | null) {
  if (!reservation) return false
  if (!ELIGIBLE_STATUSES.has(reservation.status)) return false

  const statuses = paymentStatuses(reservation)
  return statuses.length === 0 || statuses.every(status => status === 'SUCCESS')
}

function threadTitle(reservation: BookingChatReservationSummary) {
  return reservation.location?.name ?? reservation.event?.name ?? reservation.tableCategory
}

function reservationCustomerName(reservation: BookingChatReservationSummary) {
  return reservation.user?.name ?? reservation.guestName ?? reservation.user?.email ?? reservation.guestEmail ?? 'Guest'
}

function threadFromReservation(reservation: BookingChatReservationSummary, createdAt: string): BookingChatThread {
  return {
    id: bookingChatThreadId(reservation.id),
    reservationId: reservation.id,
    reference: reservation.reference,
    title: threadTitle(reservation),
    customerName: reservationCustomerName(reservation),
    customerEmail: reservation.user?.email ?? reservation.guestEmail ?? null,
    customerPhone: reservation.user?.phone ?? reservation.guestPhone ?? null,
    status: 'OPEN',
    unreadForCustomer: 0,
    unreadForStaff: 0,
    createdAt,
    updatedAt: createdAt,
    resolvedAt: null,
  }
}

export function getBookingChatThreadsFromStorage(storage: BookingChatStorageLike | null | undefined) {
  return [...readState(storage).threads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export function getBookingChatThreadFromStorage(storage: BookingChatStorageLike | null | undefined, reservationId: string) {
  return readState(storage).threads.find(thread => thread.reservationId === reservationId) ?? null
}

export function getBookingChatMessagesFromStorage(storage: BookingChatStorageLike | null | undefined, reservationId: string) {
  return readState(storage).messages
    .filter(message => message.reservationId === reservationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function ensureBookingChatThread(
  storage: BookingChatStorageLike,
  reservation: BookingChatReservationSummary,
  now: () => Date = () => new Date(),
) {
  const state = readState(storage)
  const existing = state.threads.find(thread => thread.reservationId === reservation.id)
  if (existing) return existing

  const createdAt = now().toISOString()
  const thread = threadFromReservation(reservation, createdAt)
  writeState(storage, { ...state, threads: [thread, ...state.threads] })
  return thread
}

export function sendBookingChatMessage(
  storage: BookingChatStorageLike,
  reservation: BookingChatReservationSummary,
  draft: BookingChatMessageDraft,
  now: () => Date = () => new Date(),
) {
  const body = draft.body.trim()
  if (!body) throw new Error('Message cannot be empty')

  const thread = ensureBookingChatThread(storage, reservation, now)
  const state = readState(storage)
  const createdAt = now().toISOString()
  const message: BookingChatMessage = {
    id: `${thread.id}:${createdAt}:${state.messages.length}`,
    threadId: thread.id,
    reservationId: reservation.id,
    senderType: draft.senderType,
    senderName: draft.senderName.trim() || (draft.senderType === 'CUSTOMER' ? reservationCustomerName(reservation) : 'Glee Team'),
    body,
    createdAt,
  }

  const nextThreads = state.threads.map(item => {
    if (item.id !== thread.id) return item

    const sentByCustomer = draft.senderType === 'CUSTOMER'
    const sentByStaff = draft.senderType === 'STAFF'
    return {
      ...item,
      status: sentByCustomer ? 'OPEN' : item.status,
      resolvedAt: sentByCustomer ? null : item.resolvedAt ?? null,
      unreadForCustomer: sentByStaff ? item.unreadForCustomer + 1 : item.unreadForCustomer,
      unreadForStaff: sentByCustomer ? item.unreadForStaff + 1 : item.unreadForStaff,
      updatedAt: createdAt,
    }
  })

  writeState(storage, { threads: nextThreads, messages: [...state.messages, message] })
  return message
}

export function markBookingChatRead(storage: BookingChatStorageLike, reservationId: string, viewer: BookingChatViewerType) {
  const state = readState(storage)
  const nextThreads = state.threads.map(thread => {
    if (thread.reservationId !== reservationId) return thread

    return viewer === 'CUSTOMER'
      ? { ...thread, unreadForCustomer: 0 }
      : { ...thread, unreadForStaff: 0 }
  })

  writeState(storage, { ...state, threads: nextThreads })
  return nextThreads.find(thread => thread.reservationId === reservationId) ?? null
}

export function resolveBookingChatThread(
  storage: BookingChatStorageLike,
  reservationId: string,
  now: () => Date = () => new Date(),
) {
  const state = readState(storage)
  const timestamp = now().toISOString()
  const nextThreads = state.threads.map(thread => thread.reservationId === reservationId
    ? { ...thread, status: 'RESOLVED' as const, resolvedAt: timestamp, updatedAt: timestamp }
    : thread)

  writeState(storage, { ...state, threads: nextThreads })
  return nextThreads.find(thread => thread.reservationId === reservationId) ?? null
}

export function reopenBookingChatThread(
  storage: BookingChatStorageLike,
  reservationId: string,
  now: () => Date = () => new Date(),
) {
  const state = readState(storage)
  const timestamp = now().toISOString()
  const nextThreads = state.threads.map(thread => thread.reservationId === reservationId
    ? { ...thread, status: 'OPEN' as const, resolvedAt: null, updatedAt: timestamp }
    : thread)

  writeState(storage, { ...state, threads: nextThreads })
  return nextThreads.find(thread => thread.reservationId === reservationId) ?? null
}
