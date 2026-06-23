import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  canOpenBookingChat,
  type BookingChatMessage,
  type BookingChatMessageDraft,
  type BookingChatReservationSummary,
  type BookingChatThread,
  type BookingChatViewerType,
} from '../../lib/chat/bookingChatStorage'
import { apiFetch } from '../client'

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
  threads: (status?: 'OPEN' | 'RESOLVED' | 'ALL') => ['booking-chat', 'threads', status ?? 'ALL'] as const,
  thread: (reservationId: string) => ['booking-chat', 'thread', reservationId] as const,
  messages: (reservationId: string) => ['booking-chat', 'messages', reservationId] as const,
}

interface BookingChatResponse<T> {
  success: boolean
  message?: string
  data: T
}

export async function listBookingChatThreads(status: 'OPEN' | 'RESOLVED' | 'ALL' = 'ALL'): Promise<BookingChatThread[]> {
  const params = new URLSearchParams()
  if (status !== 'ALL') params.set('status', status)
  const query = params.toString()
  return apiFetch<BookingChatResponse<BookingChatThread[]>>(`/api/v1/booking-chats${query ? `?${query}` : ''}`)
    .then(response => response.data ?? [])
}

export async function getBookingChatThread(
  reservation: BookingChatReservationSummary | null | undefined,
): Promise<BookingChatThread | null> {
  if (!canOpenBookingChat(reservation)) return null
  if (!reservation) return null
  return apiFetch<BookingChatResponse<BookingChatThread>>(`/api/v1/reservations/${encodeURIComponent(reservation.id)}/chat`)
    .then(response => response.data)
}

export async function getBookingChatMessages(reservationId: string): Promise<BookingChatMessage[]> {
  return apiFetch<BookingChatResponse<BookingChatMessage[]>>(`/api/v1/reservations/${encodeURIComponent(reservationId)}/chat/messages`)
    .then(response => response.data ?? [])
}

export async function sendBookingChatMessageMutation(params: {
  reservation: BookingChatReservationSummary
  draft: BookingChatMessageDraft
}): Promise<BookingChatMessage> {
  return apiFetch<BookingChatResponse<BookingChatMessage>>(
    `/api/v1/reservations/${encodeURIComponent(params.reservation.id)}/chat/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ body: params.draft.body }),
    },
  ).then(response => response.data)
}

export async function markBookingChatReadMutation(params: {
  reservationId: string
  viewer: BookingChatViewerType
}): Promise<BookingChatThread | null> {
  return apiFetch<BookingChatResponse<BookingChatThread>>(
    `/api/v1/reservations/${encodeURIComponent(params.reservationId)}/chat/read`,
    { method: 'POST' },
  ).then(response => response.data)
}

export async function resolveBookingChatThreadMutation(reservationId: string): Promise<BookingChatThread | null> {
  return apiFetch<BookingChatResponse<BookingChatThread>>(
    `/api/v1/reservations/${encodeURIComponent(reservationId)}/chat/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESOLVED' }),
    },
  ).then(response => response.data)
}

export async function reopenBookingChatThreadMutation(reservationId: string): Promise<BookingChatThread | null> {
  return apiFetch<BookingChatResponse<BookingChatThread>>(
    `/api/v1/reservations/${encodeURIComponent(reservationId)}/chat/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'OPEN' }),
    },
  ).then(response => response.data)
}

export function useBookingChatThreads(status: 'OPEN' | 'RESOLVED' | 'ALL' = 'ALL') {
  return useQuery({
    queryKey: bookingChatKeys.threads(status),
    queryFn: () => listBookingChatThreads(status),
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
      queryClient.invalidateQueries({ queryKey: bookingChatKeys.all })
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
