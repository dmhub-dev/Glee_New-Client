import { io, type Socket } from 'socket.io-client'
import { tokens } from '../../utils'

export type EventChatSocket = Socket

function socketBaseUrl() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configured = ((import.meta as any).env?.VITE_API_BASE_URL ?? '') as string
  return configured.replace(/\/$/, '')
}

export function createEventChatSocket(): EventChatSocket | null {
  const token = tokens.getAccess()
  if (!token) return null

  return io(`${socketBaseUrl()}/event-chat`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 800,
  })
}
