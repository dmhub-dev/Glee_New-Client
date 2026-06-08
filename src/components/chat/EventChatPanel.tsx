import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, Loader2, Lock, Megaphone, MessageCircle, Pin, Send, Trash2, Wifi, WifiOff } from 'lucide-react'
import {
  chatKeys,
  type EventChatMessage,
  type EventChatMessagesResponse,
  useCreateEventChatMessage,
  useDeleteEventChatMessage,
  useEventChatMessages,
  useEventChatRoom,
  useMarkEventChatRead,
  useUpdateEventChatMessagePin,
} from '@glee/api'
import { Badge, Button, Skeleton, Textarea, cn, useToast } from '@glee/ui'
import { useAuth } from '../../lib/auth/AuthContext'
import { createEventChatSocket, type EventChatSocket } from '../../lib/chat/eventChatSocket'

type PanelTone = 'customer' | 'admin'

interface EventChatPanelProps {
  eventId: string
  eventTitle: string
  tone?: PanelTone
  className?: string
  compact?: boolean
}

type SocketAck<T> = { success: true; data: T } | { success: false; error: { message: string; statusCode: number } }

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function statusCopy(status?: string) {
  if (status === 'LOCKED') return 'Locked'
  if (status === 'READ_ONLY') return 'Read only'
  return 'Live chat'
}

function mergeMessage(existing: EventChatMessage[], message: EventChatMessage) {
  if (existing.some(item => item.id === message.id)) {
    return existing.map(item => item.id === message.id ? message : item)
  }
  return [message, ...existing]
}

export function EventChatPanel({ eventId, eventTitle, tone = 'admin', className, compact = false }: EventChatPanelProps) {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const socketRef = useRef<EventChatSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [body, setBody] = useState('')
  const [messageType, setMessageType] = useState<'MESSAGE' | 'ANNOUNCEMENT'>('MESSAGE')
  const [isSocketReady, setIsSocketReady] = useState(false)
  const [socketError, setSocketError] = useState<string | null>(null)

  const enabled = Boolean(eventId) && isAuthenticated
  const roomQuery = useEventChatRoom(eventId, enabled)
  const messagesQuery = useEventChatMessages(eventId, enabled && roomQuery.data?.access.canRead !== false)
  const createMessage = useCreateEventChatMessage()
  const markRead = useMarkEventChatRead()
  const updatePin = useUpdateEventChatMessagePin()
  const deleteMessage = useDeleteEventChatMessage()

  const pinnedMessages = useMemo(() => (messagesQuery.data?.data ?? []).filter(message => message.isPinned && message.type !== 'SYSTEM'), [messagesQuery.data?.data])
  const messages = useMemo(() => {
    const pinnedIds = new Set(pinnedMessages.map(message => message.id))
    return [...(messagesQuery.data?.data ?? [])].filter(message => !pinnedIds.has(message.id)).reverse()
  }, [messagesQuery.data?.data, pinnedMessages])
  const room = roomQuery.data
  const canWrite = Boolean(room?.access.canWrite)
  const canAnnounce = Boolean(room?.access.canAnnounce)
  const canModerate = Boolean(room?.access.canModerate)
  const showModeration = canModerate && tone === 'admin'
  const canPostAnnouncement = canAnnounce && tone === 'admin'
  const locked = room?.status === 'LOCKED'
  const readOnly = room?.status === 'READ_ONLY'
  const isCustomer = tone === 'customer'
  const shellClass = isCustomer
    ? 'border-white/12 bg-white/[0.08] text-white shadow-[0_18px_55px_rgba(0,0,0,0.24)]'
    : 'border-admin bg-admin-surface text-foreground shadow-admin'
  const mutedText = isCustomer ? 'text-white/55' : 'text-admin-40'
  const panelAccent = 'text-neon-pink'

  useEffect(() => {
    if (!enabled) return undefined
    const socket = createEventChatSocket()
    if (!socket) return undefined
    socketRef.current = socket

    socket.on('connect', () => {
      setIsSocketReady(true)
      setSocketError(null)
      socket.emit('chat:join', { eventId }, (response: SocketAck<unknown>) => {
        if (!response.success) setSocketError(response.error.message)
      })
    })
    socket.on('disconnect', () => setIsSocketReady(false))
    socket.on('chat:error', (error: { message?: string }) => setSocketError(error.message ?? 'Chat connection failed'))
    socket.on('chat:message', (message: EventChatMessage) => {
      if (message.eventId !== eventId) return
      queryClient.setQueryData<EventChatMessagesResponse>(chatKeys.messages(eventId), previous => ({
        data: mergeMessage(previous?.data ?? [], message),
        meta: previous?.meta ?? { page: 1, limit: 50 },
      }))
      queryClient.invalidateQueries({ queryKey: chatKeys.room(eventId) })
    })

    return () => {
      socket.emit('chat:leave', { eventId })
      socket.disconnect()
      socketRef.current = null
      setIsSocketReady(false)
    }
  }, [enabled, eventId, queryClient])

  useEffect(() => {
    const latest = messages[messages.length - 1]
    if (!latest || !enabled) return
    markRead.mutate({ eventId, lastReadMessageId: latest.id })
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, eventId, messages.length])

  async function handleSubmit() {
    const cleanBody = body.trim()
    if (!cleanBody || !room) return
    const nextType = messageType === 'ANNOUNCEMENT' && canPostAnnouncement ? 'ANNOUNCEMENT' : 'MESSAGE'

    try {
      if (socketRef.current?.connected) {
        const message = await new Promise<EventChatMessage>((resolve, reject) => {
          socketRef.current?.emit('chat:message', { eventId, body: cleanBody, type: nextType }, (response: SocketAck<EventChatMessage>) => {
            if (response.success) resolve(response.data)
            else reject(new Error(response.error.message))
          })
        })
        queryClient.setQueryData<EventChatMessagesResponse>(chatKeys.messages(eventId), previous => ({
          data: mergeMessage(previous?.data ?? [], message),
          meta: previous?.meta ?? { page: 1, limit: 50 },
        }))
      } else {
        await createMessage.mutateAsync({ eventId, body: cleanBody, type: nextType })
      }
      setBody('')
      if (nextType === 'ANNOUNCEMENT') setMessageType('MESSAGE')
    } catch (error) {
      toast({ title: 'Message not sent', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handlePin(message: EventChatMessage) {
    try {
      await updatePin.mutateAsync({ eventId, messageId: message.id, isPinned: !message.isPinned })
    } catch (error) {
      toast({ title: 'Could not update pin', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleDelete(message: EventChatMessage) {
    const reason = window.prompt('Why remove this message?') ?? undefined
    if (reason === undefined) return
    try {
      await deleteMessage.mutateAsync({ eventId, messageId: message.id, reason })
    } catch (error) {
      toast({ title: 'Could not remove message', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  if (!isAuthenticated) {
    return (
      <section className={cn('rounded-2xl border p-5', shellClass, className)}>
        <ChatHeader eventTitle={eventTitle} statusLabel="Members only" connected={false} mutedText={mutedText} />
        <div className={cn('mt-4 rounded-xl border border-dashed p-5 text-sm', isCustomer ? 'border-white/15 bg-black/20 text-white/60' : 'border-admin bg-admin-overlay text-admin-50')}>
          Sign in with the account used to purchase this event ticket to join the room.
        </div>
      </section>
    )
  }

  if (roomQuery.isLoading) {
    return (
      <section className={cn('rounded-2xl border p-5', shellClass, className)}>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-4 h-56 rounded-xl" />
      </section>
    )
  }

  if (roomQuery.error || !room?.access.canRead) {
    return (
      <section className={cn('rounded-2xl border p-5', shellClass, className)}>
        <ChatHeader eventTitle={eventTitle} statusLabel="Locked" connected={isSocketReady} mutedText={mutedText} />
        <div className={cn('mt-4 rounded-xl border p-5 text-sm', isCustomer ? 'border-white/15 bg-black/20 text-white/60' : 'border-admin bg-admin-overlay text-admin-50')}>
          Chat opens for logged-in attendees after an app ticket purchase. Public checkout tickets do not unlock this room.
        </div>
      </section>
    )
  }

  return (
    <section className={cn('rounded-2xl border p-4', shellClass, className)}>
      <ChatHeader eventTitle={eventTitle} statusLabel={statusCopy(room.status)} connected={isSocketReady} mutedText={mutedText} />

      {socketError && (
        <div className={cn('mt-3 rounded-xl border px-3 py-2 text-xs', isCustomer ? 'border-amber-400/25 bg-amber-400/10 text-amber-100' : 'border-amber-500/25 bg-amber-500/10 text-amber-500')}>
          {socketError}
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="mt-4 rounded-xl border border-neon-pink/25 bg-neon-pink/10 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neon-pink">
            <Megaphone className="h-3.5 w-3.5" /> Pinned updates
          </div>
          <div className="space-y-2">
            {pinnedMessages.slice(0, 2).map(message => (
              <p key={message.id} className={cn('text-sm leading-5', isCustomer ? 'text-white/82' : 'text-admin-80')}>{message.body}</p>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className={cn('mt-4 space-y-3 overflow-y-auto pr-1', compact ? 'max-h-[320px]' : 'max-h-[430px]')}>
        {messagesQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className={cn('rounded-xl border border-dashed p-6 text-center', isCustomer ? 'border-white/15 bg-black/20' : 'border-admin bg-admin-overlay')}>
            <MessageCircle className={cn('mx-auto h-8 w-8', panelAccent)} />
            <p className={cn('mt-3 text-sm font-semibold', isCustomer ? 'text-white' : 'text-foreground')}>No messages yet</p>
            <p className={cn('mt-1 text-xs', mutedText)}>Announcements and attendee messages will appear here.</p>
          </div>
        ) : (
          messages.map(message => {
            const isAnnouncement = message.type === 'ANNOUNCEMENT'
            return (
              <div key={message.id} className={cn('rounded-xl border p-3', isAnnouncement ? 'border-neon-pink/25 bg-neon-pink/10' : isCustomer ? 'border-white/10 bg-black/20' : 'border-admin bg-admin-overlay')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn('text-sm font-semibold', isCustomer ? 'text-white' : 'text-foreground')}>{message.sender?.displayName ?? 'Glee Team'}</p>
                      {isAnnouncement && <Badge className="rounded-full border-neon-pink/25 bg-neon-pink/15 text-neon-pink">Update</Badge>}
                      {message.isPinned && <Pin className="h-3.5 w-3.5 text-neon-pink" />}
                    </div>
                    <p className={cn('mt-1 whitespace-pre-line text-sm leading-5', isCustomer ? 'text-white/72' : 'text-admin-70')}>{message.body}</p>
                    <p className={cn('mt-2 text-[11px]', mutedText)}>{formatMessageTime(message.createdAt)}</p>
                  </div>
                  {showModeration && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => handlePin(message)} className={cn('rounded-lg p-1.5 transition', isCustomer ? 'text-white/45 hover:bg-white/10 hover:text-white' : 'text-admin-40 hover:bg-admin-surface hover:text-neon-pink')} aria-label={message.isPinned ? 'Unpin message' : 'Pin message'}>
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete(message)} className="rounded-lg p-1.5 text-red-400/70 transition hover:bg-red-500/10 hover:text-red-300" aria-label="Remove message">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-4 space-y-3">
        {(locked || readOnly) && (
          <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs', isCustomer ? 'border-white/10 bg-black/20 text-white/55' : 'border-admin bg-admin-overlay text-admin-50')}>
            <Lock className="h-3.5 w-3.5" />
            {locked ? 'This room is locked.' : canAnnounce ? 'Attendees are read-only; staff can still post final updates.' : 'This room is read-only.'}
          </div>
        )}

        {canPostAnnouncement && (
          <button type="button" onClick={() => setMessageType(type => type === 'ANNOUNCEMENT' ? 'MESSAGE' : 'ANNOUNCEMENT')} className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition', messageType === 'ANNOUNCEMENT' ? 'border-neon-pink bg-neon-pink text-white' : isCustomer ? 'border-white/15 bg-white/[0.08] text-white/65 hover:text-white' : 'border-admin bg-admin-overlay text-admin-50 hover:text-foreground')}>
            <Bell className="h-3.5 w-3.5" />
            Announcement
          </button>
        )}

        <div className={cn('flex gap-2 rounded-2xl border p-2', isCustomer ? 'border-white/10 bg-black/20' : 'border-admin bg-admin-overlay')}>
          <Textarea
            value={body}
            onChange={event => setBody(event.target.value)}
            disabled={!canWrite && !(canPostAnnouncement && messageType === 'ANNOUNCEMENT')}
            placeholder={canWrite || canPostAnnouncement ? 'Write to the event room...' : 'Chat is read-only'}
            className={cn('min-h-[48px] flex-1 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0', isCustomer ? 'text-white placeholder:text-white/35' : 'text-foreground placeholder:text-admin-30')}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSubmit()
              }
            }}
          />
          <Button type="button" disabled={!body.trim() || createMessage.isPending || (!canWrite && !(canPostAnnouncement && messageType === 'ANNOUNCEMENT'))} onClick={handleSubmit} className="mt-auto h-11 w-11 rounded-full bg-neon-pink p-0 text-white hover:bg-neon-pink/90 disabled:opacity-50">
            {createMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </section>
  )
}

function ChatHeader({ eventTitle, statusLabel, connected, mutedText }: { eventTitle: string; statusLabel: string; connected: boolean; mutedText: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-pink/12 text-neon-pink">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-base font-black">Event Chat</h2>
            <p className={cn('truncate text-xs', mutedText)}>{eventTitle}</p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className="rounded-full border-neon-pink/20 bg-neon-pink/10 px-2.5 py-1 text-[11px] text-neon-pink">{statusLabel}</Badge>
        {connected ? <Wifi className="h-4 w-4 text-emerald-400" /> : <WifiOff className="h-4 w-4 text-amber-400" />}
      </div>
    </div>
  )
}
