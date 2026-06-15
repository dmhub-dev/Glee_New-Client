import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  canOpenBookingChat,
  ensureBookingChatThread,
  getBookingChatMessagesFromStorage,
  getBookingChatThreadsFromStorage,
  markBookingChatRead,
  reopenBookingChatThread,
  resolveBookingChatThread,
  sendBookingChatMessage,
  type BookingChatMessage,
  type BookingChatMessageDraft,
  type BookingChatReservationSummary,
  type BookingChatStorageLike,
  type BookingChatThread,
  type BookingChatViewerType,
} from '../../lib/chat/bookingChatStorage'

export type {
  BookingChatMessage,
  BookingChatMessageDraft,
  BookingChatReservationSummary,
  BookingChatSenderType,
  BookingChatThread,
  BookingChatThreadStatus,
  BookingChatViewerType,
} from '../../lib/chat/bookingChatStorage'
export {
  canOpenBookingChat,
  bookingChatThreadId,
} from '../../lib/chat/bookingChatStorage'

export const bookingChatKeys = {
  all: ['booking-chat'] as const,
  threads: () => ['booking-chat', 'threads'] as const,
  thread: (reservationId: string) => ['booking-chat', 'thread', reservationId] as const,
  messages: (reservationId: string) => ['booking-chat', 'messages', reservationId] as const,
}

function browserBookingChatStorage(): BookingChatStorageLike | null {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function requireStorage(): BookingChatStorageLike {
  const storage = browserBookingChatStorage()
  if (!storage) throw new Error('Booking chat storage is unavailable in this browser.')
  return storage
}

export async function listBookingChatThreads(): Promise<BookingChatThread[]> {
  return getBookingChatThreadsFromStorage(browserBookingChatStorage())
}

export async function getBookingChatThread(
  reservation: BookingChatReservationSummary | null | undefined,
): Promise<BookingChatThread | null> {
  if (!canOpenBookingChat(reservation)) return null

  const storage = browserBookingChatStorage()
  if (!storage || !reservation) return null

  return ensureBookingChatThread(storage, reservation)
}

export async function getBookingChatMessages(reservationId: string): Promise<BookingChatMessage[]> {
  return getBookingChatMessagesFromStorage(browserBookingChatStorage(), reservationId)
}

export async function sendBookingChatMessageMutation(params: {
  reservation: BookingChatReservationSummary
  draft: BookingChatMessageDraft
}): Promise<BookingChatMessage> {
  return sendBookingChatMessage(requireStorage(), params.reservation, params.draft)
}

export async function markBookingChatReadMutation(params: {
  reservationId: string
  viewer: BookingChatViewerType
}): Promise<BookingChatThread | null> {
  return markBookingChatRead(requireStorage(), params.reservationId, params.viewer)
}

export async function resolveBookingChatThreadMutation(reservationId: string): Promise<BookingChatThread | null> {
  return resolveBookingChatThread(requireStorage(), reservationId)
}

export async function reopenBookingChatThreadMutation(reservationId: string): Promise<BookingChatThread | null> {
  return reopenBookingChatThread(requireStorage(), reservationId)
}

export function useBookingChatThreads() {
  return useQuery({
    queryKey: bookingChatKeys.threads(),
    queryFn: listBookingChatThreads,
    refetchInterval: 4000,
    refetchIntervalInBackground: false,
  })
}

export function useBookingChatThread(
  reservation: BookingChatReservationSummary | null | undefined,
  enabled = true,
) {
  const reservationId = reservation?.id ?? ''

  return useQuery({
    queryKey: bookingChatKeys.thread(reservationId),
    queryFn: () => getBookingChatThread(reservation),
    enabled: enabled && Boolean(reservationId) && canOpenBookingChat(reservation),
  })
}

export function useBookingChatMessages(reservationId: string | undefined, enabled = true) {
  const queryEnabled = enabled && Boolean(reservationId)

  return useQuery({
    queryKey: bookingChatKeys.messages(reservationId ?? ''),
    queryFn: () => getBookingChatMessages(reservationId as string),
    enabled: queryEnabled,
    refetchInterval: queryEnabled ? 4000 : false,
    refetchIntervalInBackground: false,
  })
}

export function useSendBookingChatMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendBookingChatMessageMutation,
    onSuccess: (_, { reservation }) => {
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.all })
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.thread(reservation.id) })
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.messages(reservation.id) })
    },
  })
}

export function useMarkBookingChatRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markBookingChatReadMutation,
    onSuccess: (_, { reservationId }) => {
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.threads() })
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.thread(reservationId) })
    },
  })
}

export function useResolveBookingChatThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resolveBookingChatThreadMutation,
    onSuccess: (_, reservationId) => {
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.all })
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.thread(reservationId) })
    },
  })
}

export function useReopenBookingChatThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: reopenBookingChatThreadMutation,
    onSuccess: (_, reservationId) => {
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.all })
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.thread(reservationId) })
    },
  })
}
