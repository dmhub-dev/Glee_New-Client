import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../client'

export type EventChatRoomStatus = 'ACTIVE' | 'READ_ONLY' | 'LOCKED'
export type EventChatMessageType = 'MESSAGE' | 'ANNOUNCEMENT' | 'SYSTEM'

export interface EventChatAccess {
  canRead: boolean
  canWrite: boolean
  canModerate: boolean
  canAnnounce: boolean
}

export interface EventChatRoom {
  id: string
  eventId: string
  event: { id: string; name: string }
  status: EventChatRoomStatus
  finalUpdatesUntil: string | null
  lockedAt: string | null
  access: EventChatAccess
  unreadCount: number
}

export interface EventChatSender {
  id: string
  displayName: string
  profileImage: string | null
}

export interface EventChatMessage {
  id: string
  roomId: string
  eventId: string
  type: EventChatMessageType
  body: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  sender: EventChatSender | null
}

export interface EventChatMessagesResponse {
  data: EventChatMessage[]
  meta: { page: number; limit: number }
}

export interface EventChatReadState {
  id?: string
  roomId: string
  eventId: string
  userId: string
  lastReadMessageId?: string | null
  lastReadAt?: string
}

export const chatKeys = {
  all: ['event-chat'] as const,
  room: (eventId: string) => ['event-chat', eventId, 'room'] as const,
  messages: (eventId: string) => ['event-chat', eventId, 'messages'] as const,
}

export function fetchEventChatRoom(eventId: string): Promise<EventChatRoom> {
  return apiFetch<EventChatRoom>(`/api/v1/event/${eventId}/chat`)
}

export function fetchEventChatMessages(eventId: string, limit = 50): Promise<EventChatMessagesResponse> {
  return apiFetch<EventChatMessagesResponse>(`/api/v1/event/${eventId}/chat/messages?page=1&limit=${limit}`)
}

export function createEventChatMessage(params: { eventId: string; body: string; type?: 'MESSAGE' | 'ANNOUNCEMENT' }): Promise<EventChatMessage> {
  return apiFetch<EventChatMessage>(`/api/v1/event/${params.eventId}/chat/messages`, {
    method: 'POST',
    body: JSON.stringify({ body: params.body, type: params.type ?? 'MESSAGE' }),
  })
}

export function markEventChatRead(params: { eventId: string; lastReadMessageId?: string }): Promise<EventChatReadState> {
  return apiFetch<EventChatReadState>(`/api/v1/event/${params.eventId}/chat/read`, {
    method: 'POST',
    body: JSON.stringify({ lastReadMessageId: params.lastReadMessageId }),
  })
}

export function updateEventChatMessagePin(params: { eventId: string; messageId: string; isPinned: boolean }): Promise<EventChatMessage> {
  return apiFetch<EventChatMessage>(`/api/v1/event/${params.eventId}/chat/messages/${params.messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isPinned: params.isPinned }),
  })
}

export function deleteEventChatMessage(params: { eventId: string; messageId: string; reason?: string }): Promise<{ success: boolean; messageId: string }> {
  return apiFetch<{ success: boolean; messageId: string }>(`/api/v1/event/${params.eventId}/chat/messages/${params.messageId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason: params.reason }),
  })
}

export function useEventChatRoom(eventId: string, enabled = true) {
  return useQuery({
    queryKey: chatKeys.room(eventId),
    queryFn: () => fetchEventChatRoom(eventId),
    enabled: enabled && Boolean(eventId),
    retry: false,
  })
}

export function useEventChatMessages(eventId: string, enabled = true) {
  return useQuery({
    queryKey: chatKeys.messages(eventId),
    queryFn: () => fetchEventChatMessages(eventId),
    enabled: enabled && Boolean(eventId),
    retry: false,
  })
}

export function useCreateEventChatMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEventChatMessage,
    onSuccess: (message, { eventId }) => {
      qc.setQueryData<EventChatMessagesResponse>(chatKeys.messages(eventId), previous => {
        const existing = previous?.data ?? []
        if (existing.some(item => item.id === message.id)) return previous
        return { data: [message, ...existing], meta: previous?.meta ?? { page: 1, limit: 50 } }
      })
      qc.invalidateQueries({ queryKey: chatKeys.room(eventId) })
    },
  })
}

export function useMarkEventChatRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markEventChatRead,
    onSuccess: (_, { eventId }) => qc.invalidateQueries({ queryKey: chatKeys.room(eventId) }),
  })
}

export function useUpdateEventChatMessagePin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateEventChatMessagePin,
    onSuccess: (message, { eventId }) => {
      qc.setQueryData<EventChatMessagesResponse>(chatKeys.messages(eventId), previous => {
        if (!previous) return previous
        return { ...previous, data: previous.data.map(item => item.id === message.id ? message : item) }
      })
    },
  })
}

export function useDeleteEventChatMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteEventChatMessage,
    onSuccess: ({ messageId }, { eventId }) => {
      qc.setQueryData<EventChatMessagesResponse>(chatKeys.messages(eventId), previous => {
        if (!previous) return previous
        return { ...previous, data: previous.data.filter(item => item.id !== messageId) }
      })
      qc.invalidateQueries({ queryKey: chatKeys.room(eventId) })
    },
  })
}
