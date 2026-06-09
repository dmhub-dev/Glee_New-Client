import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bell, Loader2, Lock, Megaphone, MessageCircle, Pin, Send, Trash2, Wifi, WifiOff } from 'lucide-react'
import {
  chatKeys,
  type EventChatMessage,
  type EventChatMessagesResponse,
  type EventChatRoom,
  useCreateEventChatMessage,
  useDeleteEventChatMessage,
  useEventChatMessages,
  useEventChatRoom,
  useMarkEventChatRead,
  useUpdateChatSettings,
  useUpdateEventChatMessagePin,
} from '@glee/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Input,
  Skeleton,
  Switch,
  Textarea,
  cn,
  useToast,
} from '@glee/ui'
import { useAuth } from '../../lib/auth/AuthContext'
import { createEventChatSocket, type EventChatSocket } from '../../lib/chat/eventChatSocket'

type PanelTone = 'customer' | 'admin'

export interface EventChatPanelProps {
  eventId: string
  eventTitle: string
  eventImage?: string | null
  tone?: PanelTone
  className?: string
  compact?: boolean
  onBack?: () => void
}

type SocketAck<T> = { success: true; data: T } | { success: false; error: { message: string; statusCode: number } }

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function statusCopy(status?: string) {
  if (status === 'LOCKED') return 'Locked'
  if (status === 'READ_ONLY') return 'Read only'
  return 'Live'
}

function mergeMessage(existing: EventChatMessage[], message: EventChatMessage) {
  if (existing.some(item => item.id === message.id)) {
    return existing.map(item => item.id === message.id ? message : item)
  }
  return [message, ...existing]
}

function getSenderRoleLabel(role?: string | null) {
  const r = role?.toUpperCase()
  if (r === 'SUPER_ADMIN' || r === 'ADMIN') return 'Admin'
  if (r === 'OPERATIONS_MANAGER' || r === 'CUSTOMER_SUPPORT') return 'Staff'
  if (r === 'VENDOR') return 'Host'
  if (r === 'VENDOR_STAFF') return 'Host Staff'
  if (r === 'CONTENT_MANAGER' || r === 'COMMERCIAL_MANAGER') return 'Staff'
  return null
}

function isStaffRole(role?: string | null) {
  const r = role?.toUpperCase()
  return r === 'SUPER_ADMIN' || r === 'ADMIN' || r === 'OPERATIONS_MANAGER' || r === 'CUSTOMER_SUPPORT' || r === 'CONTENT_MANAGER' || r === 'COMMERCIAL_MANAGER'
}

function isVendorRole(role?: string | null) {
  const r = role?.toUpperCase()
  return r === 'VENDOR' || r === 'VENDOR_STAFF'
}

function getOtherBubbleClass(sender: EventChatMessage['sender'], isCustomer: boolean): string {
  if (isStaffRole(sender?.role)) {
    return isCustomer
      ? 'rounded-bl-md border-blue-400/25 bg-blue-500/15 text-white'
      : 'rounded-bl-md border-blue-400/20 bg-blue-500/10 text-foreground'
  }
  if (isVendorRole(sender?.role)) {
    return isCustomer
      ? 'rounded-bl-md border-amber-400/30 bg-amber-500/15 text-white'
      : 'rounded-bl-md border-amber-400/25 bg-amber-500/10 text-foreground'
  }
  return isCustomer
    ? 'rounded-bl-md border-white/10 bg-white/[0.09] text-white'
    : 'rounded-bl-md border-admin bg-admin-surface text-foreground'
}

function getSenderNameClass(sender: EventChatMessage['sender'], isCustomer: boolean): string {
  if (isStaffRole(sender?.role)) return isCustomer ? 'text-blue-300' : 'text-blue-400'
  if (isVendorRole(sender?.role)) return isCustomer ? 'text-amber-300' : 'text-amber-400'
  return isCustomer ? 'text-white/82' : 'text-foreground'
}

export function EventChatPanel({ eventId, eventTitle, eventImage, tone = 'admin', className, compact = false, onBack }: EventChatPanelProps) {
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const socketRef = useRef<EventChatSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [body, setBody] = useState('')
  const [messageType, setMessageType] = useState<'MESSAGE' | 'ANNOUNCEMENT'>('MESSAGE')
  const [isSocketReady, setIsSocketReady] = useState(false)
  const [socketError, setSocketError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ message: EventChatMessage; reason: string } | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const isCustomer = tone === 'customer'
  const enabled = Boolean(eventId) && isAuthenticated
  const roomQuery = useEventChatRoom(eventId, enabled)
  const messagesQuery = useEventChatMessages(eventId, enabled && roomQuery.data?.access.canRead !== false)
  const createMessage = useCreateEventChatMessage()
  const markRead = useMarkEventChatRead()
  const updatePin = useUpdateEventChatMessagePin()
  const deleteMessage = useDeleteEventChatMessage()
  const updateSettings = useUpdateChatSettings()

  const pinnedMessages = useMemo(
    () => (messagesQuery.data?.data ?? []).filter(m => m.isPinned && m.type !== 'SYSTEM'),
    [messagesQuery.data?.data],
  )
  const messages = useMemo(() => {
    const pinnedIds = new Set(pinnedMessages.map(m => m.id))
    return [...(messagesQuery.data?.data ?? [])].filter(m => !pinnedIds.has(m.id)).reverse()
  }, [messagesQuery.data?.data, pinnedMessages])

  const room = roomQuery.data
  const canWrite = Boolean(room?.access.canWrite)
  const canAnnounce = Boolean(room?.access.canAnnounce)
  const canModerate = Boolean(room?.access.canModerate)
  const canPin = Boolean(room?.access.canPin)
  const showModerationActions = canModerate && !isCustomer
  const showPinAction = canPin
  const canPostAnnouncement = canAnnounce && !isCustomer
  const locked = room?.status === 'LOCKED'
  const readOnly = room?.status === 'READ_ONLY'

  // Theme tokens
  const shellClass = isCustomer
    ? 'border-white/12 bg-white/[0.08] text-white shadow-[0_18px_55px_rgba(0,0,0,0.24)]'
    : 'border-admin bg-admin-surface text-foreground shadow-admin'
  const mutedText = isCustomer ? 'text-white/55' : 'text-admin-40'
  const chatSurfaceClass = isCustomer
    ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,45,143,0.16),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))]'
    : 'bg-admin-overlay'

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

    socket.on('chat:message:updated', (message: EventChatMessage) => {
      if (message.eventId !== eventId) return
      queryClient.setQueryData<EventChatMessagesResponse>(chatKeys.messages(eventId), previous => {
        if (!previous) return previous
        return { ...previous, data: previous.data.map(item => item.id === message.id ? message : item) }
      })
    })

    socket.on('chat:room:updated', (updatedRoom: EventChatRoom) => {
      if (updatedRoom.eventId !== eventId) return
      queryClient.setQueryData<EventChatRoom>(chatKeys.room(eventId), updatedRoom)
    })

    socket.on('chat:message:deleted', ({ messageId }: { messageId: string; eventId: string }) => {
      queryClient.setQueryData<EventChatMessagesResponse>(chatKeys.messages(eventId), previous => {
        if (!previous) return previous
        return { ...previous, data: previous.data.filter(item => item.id !== messageId) }
      })
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

  async function handleDeleteConfirm() {
    if (!pendingDelete) return
    try {
      await deleteMessage.mutateAsync({ eventId, messageId: pendingDelete.message.id, reason: pendingDelete.reason || undefined })
    } catch (error) {
      toast({ title: 'Could not remove message', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setPendingDelete(null)
    }
  }

  function scrollToMessage(messageId: string) {
    const el = messageRefs.current.get(messageId)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    setHighlightedId(messageId)
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 1600)
  }

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (isCustomer) {
      return (
        <div className={cn('flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center', className)}>
          <MessageCircle className="h-10 w-10 text-neon-pink/50" />
          <p className="text-sm text-white/55">Sign in to join this event chat.</p>
        </div>
      )
    }
    return (
      <section className={cn('rounded-2xl border p-5', shellClass, className)}>
        <AdminChatHeader eventTitle={eventTitle} statusLabel="Members only" connected={false} mutedText={mutedText} />
        <div className="mt-4 rounded-xl border border-dashed border-admin bg-admin-overlay p-5 text-sm text-admin-50">
          Sign in with the account used to purchase this event ticket to join the room.
        </div>
      </section>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (roomQuery.isLoading) {
    if (isCustomer) {
      return (
        <div className={cn('flex flex-1 flex-col gap-3 p-4', className)}>
          <Skeleton className="h-10 w-full rounded-2xl bg-white/10" />
          <Skeleton className="h-56 flex-1 rounded-2xl bg-white/10" />
        </div>
      )
    }
    return (
      <section className={cn('rounded-2xl border p-5', shellClass, className)}>
        <Skeleton className="h-8 w-44" />
        <Skeleton className="mt-4 h-56 rounded-xl" />
      </section>
    )
  }

  // ── No access ─────────────────────────────────────────────────────────────
  if (roomQuery.error || !room?.access.canRead) {
    if (isCustomer) {
      return (
        <div className={cn('flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center', className)}>
          <Lock className="h-10 w-10 text-white/30" />
          <p className="text-sm font-semibold text-white/60">Chat unlocks after ticket purchase</p>
          <p className="text-xs text-white/35">Only in-app ticket holders can join this room.</p>
        </div>
      )
    }
    return (
      <section className={cn('rounded-2xl border p-5', shellClass, className)}>
        <AdminChatHeader eventTitle={eventTitle} statusLabel="Locked" connected={isSocketReady} mutedText={mutedText} />
        <div className="mt-4 rounded-xl border border-dashed border-admin bg-admin-overlay p-5 text-sm text-admin-50">
          Chat opens for logged-in attendees after an in-app ticket purchase.
        </div>
      </section>
    )
  }

  // ── Message list shared render ────────────────────────────────────────────
  const messageList = messagesQuery.isLoading ? (
    <div className="space-y-3 p-3">
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-16 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  ) : messages.length === 0 ? (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-10 text-center', isCustomer ? '' : 'rounded-xl border border-dashed border-admin bg-admin-overlay')}>
      <MessageCircle className="h-8 w-8 text-neon-pink/50" />
      <p className={cn('text-sm font-semibold', isCustomer ? 'text-white/70' : 'text-foreground')}>No messages yet</p>
      <p className={cn('text-xs', mutedText)}>Announcements and attendee messages will appear here.</p>
    </div>
  ) : (
    <div className={cn('space-y-2', isCustomer ? 'px-3 py-2' : 'p-3')}>
      {messages.map(message => {
        const isAnnouncement = message.type === 'ANNOUNCEMENT'
        const isOwnMessage = Boolean(user?.id && message.sender?.id === user.id)
        const roleLabel = getSenderRoleLabel(message.sender?.role)

        if (isAnnouncement) {
          return (
            <div
              key={message.id}
              ref={el => { if (el) messageRefs.current.set(message.id, el); else messageRefs.current.delete(message.id) }}
              className={cn('mx-auto max-w-[92%] rounded-2xl border border-neon-pink/25 bg-neon-pink/10 px-4 py-3 text-center transition-colors duration-700', highlightedId === message.id ? 'ring-2 ring-neon-pink/50' : '')}
            >
              <div className="mb-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-neon-pink">
                <Megaphone className="h-3.5 w-3.5" /> Announcement
                {message.isPinned && <Pin className="h-3.5 w-3.5" />}
              </div>
              <p className={cn('whitespace-pre-line text-sm leading-5', isCustomer ? 'text-white/82' : 'text-admin-80')}>{message.body}</p>
              <p className={cn('mt-2 text-[11px]', mutedText)}>{message.sender?.displayName ?? 'Glee Team'} · {formatMessageTime(message.createdAt)}</p>
              {showModerationActions && (
                <div className="mt-2 flex items-center justify-center gap-1">
                  <button type="button" onClick={() => handlePin(message)} className="rounded-lg p-1.5 text-admin-40 transition hover:bg-admin-surface hover:text-neon-pink" aria-label={message.isPinned ? 'Unpin' : 'Pin'}>
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => setPendingDelete({ message, reason: '' })} className="rounded-lg p-1.5 text-red-400/70 transition hover:bg-red-500/10 hover:text-red-300" aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        }

        return (
          <div
            key={message.id}
            ref={el => { if (el) messageRefs.current.set(message.id, el); else messageRefs.current.delete(message.id) }}
            className={cn(
              'flex gap-2 rounded-xl px-1 py-0.5 transition-colors duration-700',
              isOwnMessage ? 'justify-end' : 'justify-start',
              highlightedId === message.id ? 'bg-neon-pink/12' : 'bg-transparent',
            )}
          >
            {!isOwnMessage && <ChatAvatar sender={message.sender} isCustomer={isCustomer} />}
            <div className={cn('group max-w-[82%] sm:max-w-[72%]', isOwnMessage ? 'items-end' : 'items-start')}>
              <div className={cn(
                'relative rounded-2xl border px-3.5 py-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.14)]',
                isOwnMessage
                  ? 'rounded-br-md border-neon-pink/30 bg-neon-pink text-white'
                  : getOtherBubbleClass(message.sender, isCustomer),
              )}>
                {!isOwnMessage && (
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className={cn('text-xs font-black', getSenderNameClass(message.sender, isCustomer))}>
                      {message.sender?.displayName ?? 'Glee Team'}
                    </span>
                    {roleLabel && (
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                        isStaffRole(message.sender?.role)
                          ? 'bg-blue-500/20 text-blue-300'
                          : isVendorRole(message.sender?.role)
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/10 text-white/60',
                      )}>
                        {roleLabel}
                      </span>
                    )}
                    {message.isPinned && <Pin className={cn('h-3 w-3', isCustomer ? 'text-neon-pink' : 'text-neon-pink')} />}
                  </div>
                )}
                {isOwnMessage && message.isPinned && (
                  <div className="mb-1 flex items-center justify-end">
                    <Pin className="h-3 w-3 text-white/80" />
                  </div>
                )}
                <p className={cn('whitespace-pre-line text-sm leading-5', isOwnMessage ? 'text-white' : isCustomer ? 'text-white/82' : 'text-admin-70')}>{message.body}</p>
                <p className={cn('mt-1 text-right text-[10px]', isOwnMessage ? 'text-white/70' : mutedText)}>{formatMessageTime(message.createdAt)}</p>
              </div>
              {(showModerationActions || (!isOwnMessage && showPinAction)) && (
                <div className={cn('mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100', isOwnMessage ? 'justify-end' : 'justify-start')}>
                  {showPinAction && (
                    <button type="button" onClick={() => handlePin(message)} className={cn('rounded-lg p-1.5 transition', isCustomer ? 'text-white/45 hover:bg-white/10 hover:text-white' : 'text-admin-40 hover:bg-admin-surface hover:text-neon-pink')} aria-label={message.isPinned ? 'Unpin message' : 'Pin message'}>
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {showModerationActions && (
                    <button type="button" onClick={() => setPendingDelete({ message, reason: '' })} className="rounded-lg p-1.5 text-red-400/70 transition hover:bg-red-500/10 hover:text-red-300" aria-label="Remove message">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            {isOwnMessage && <ChatAvatar sender={message.sender} own isCustomer={isCustomer} />}
          </div>
        )
      })}
    </div>
  )

  // ── Input area ────────────────────────────────────────────────────────────
  const inputDisabled = !canWrite && !(canPostAnnouncement && messageType === 'ANNOUNCEMENT')

  const inputArea = (
    <div className={cn('space-y-2 shrink-0', isCustomer ? 'border-t border-white/10 bg-[#050017]/80 px-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-3 backdrop-blur-xl lg:pb-[calc(env(safe-area-inset-bottom)+1rem)]' : 'mt-4')}>
      {(locked || readOnly) && (
        <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 text-xs', isCustomer ? 'border-white/10 bg-black/20 text-white/55' : 'border-admin bg-admin-overlay text-admin-50')}>
          <Lock className="h-3.5 w-3.5" />
          {locked ? 'This room is locked.' : canAnnounce ? 'Attendees read-only; staff can still post final updates.' : 'This room is read-only.'}
        </div>
      )}
      {canPostAnnouncement && (
        <button type="button" onClick={() => setMessageType(t => t === 'ANNOUNCEMENT' ? 'MESSAGE' : 'ANNOUNCEMENT')} className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition', messageType === 'ANNOUNCEMENT' ? 'border-neon-pink bg-neon-pink text-white' : isCustomer ? 'border-white/15 bg-white/[0.08] text-white/65 hover:text-white' : 'border-admin bg-admin-overlay text-admin-50 hover:text-foreground')}>
          <Bell className="h-3.5 w-3.5" />
          Announcement
        </button>
      )}
      <div className={cn('flex items-end gap-2 rounded-2xl border p-2', isCustomer ? 'border-white/10 bg-white/[0.06]' : 'border-admin bg-admin-overlay')}>
        <Textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          disabled={inputDisabled}
          placeholder={canWrite || canPostAnnouncement ? 'Message...' : 'Chat is read-only'}
          className={cn('min-h-[44px] max-h-[120px] flex-1 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0', isCustomer ? 'text-white placeholder:text-white/30' : 'text-foreground placeholder:text-admin-30')}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
        />
        <Button
          type="button"
          disabled={!body.trim() || createMessage.isPending || inputDisabled}
          onClick={handleSubmit}
          className="mb-0.5 h-10 w-10 shrink-0 rounded-full bg-neon-pink p-0 text-white hover:bg-neon-pink/90 disabled:opacity-40"
        >
          {createMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )

  // ── Delete dialog ─────────────────────────────────────────────────────────
  const deleteDialog = (
    <AlertDialog open={Boolean(pendingDelete)} onOpenChange={open => { if (!open) setPendingDelete(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove message?</AlertDialogTitle>
          <AlertDialogDescription>This will soft-delete the message. Optionally add a reason.</AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          placeholder="Reason (optional)"
          value={pendingDelete?.reason ?? ''}
          onChange={e => setPendingDelete(prev => prev ? { ...prev, reason: e.target.value } : null)}
          className="mt-1"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  // ── Customer WhatsApp layout ───────────────────────────────────────────────
  if (isCustomer) {
    return (
      <div className={cn('flex flex-col', className)}>
        {deleteDialog}

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-[#050017]/90 px-4 py-3 backdrop-blur-xl">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          {eventImage ? (
            <img
              src={eventImage}
              alt={eventTitle}
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-neon-pink/30"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-pink/15">
              <MessageCircle className="h-5 w-5 text-neon-pink" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white">{eventTitle}</p>
            <div className="flex items-center gap-1.5">
              <div className={cn('h-1.5 w-1.5 rounded-full', isSocketReady ? 'bg-emerald-400' : 'bg-amber-400')} />
              <p className="text-xs text-white/45">{statusCopy(room.status)}</p>
            </div>
          </div>
          {isSocketReady ? (
            <Wifi className="h-4 w-4 shrink-0 text-emerald-400/70" />
          ) : (
            <WifiOff className="h-4 w-4 shrink-0 text-amber-400/70" />
          )}
        </div>

        {socketError && (
          <div className="shrink-0 border-b border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
            {socketError}
          </div>
        )}

        {/* Pinned announcements */}
        {pinnedMessages.length > 0 && (
          <button
            type="button"
            onClick={() => scrollToMessage(pinnedMessages[0].id)}
            className="shrink-0 w-full border-b border-neon-pink/15 bg-neon-pink/[0.08] px-4 py-2.5 text-left transition-colors hover:bg-neon-pink/[0.14] active:bg-neon-pink/20"
          >
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neon-pink">
              <Pin className="h-3 w-3" /> Pinned message
            </div>
            <p className="line-clamp-1 text-xs leading-relaxed text-white/75">
              {pinnedMessages[0].body}
            </p>
          </button>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain',
            chatSurfaceClass,
          )}
        >
          {messageList}
        </div>

        {/* Input */}
        {inputArea}
      </div>
    )
  }

  // ── Admin panel layout ────────────────────────────────────────────────────
  return (
    <section className={cn('rounded-2xl border p-4', shellClass, className)}>
      {deleteDialog}
      <AdminChatHeader eventTitle={eventTitle} statusLabel={statusCopy(room.status)} connected={isSocketReady} mutedText={mutedText} />

      {canModerate && (
        <div className={cn('mt-3 flex items-center justify-between rounded-xl border px-3 py-2.5', room.staffOnly ? 'border-amber-500/30 bg-amber-500/8' : 'border-admin bg-admin-overlay')}>
          <div className="min-w-0">
            <p className={cn('text-xs font-semibold', room.staffOnly ? 'text-amber-400' : 'text-foreground')}>
              {room.staffOnly ? 'Staff-only mode — attendees read-only' : 'Open chat — attendees can send messages'}
            </p>
          </div>
          <Switch
            checked={room.staffOnly}
            disabled={updateSettings.isPending}
            onCheckedChange={(checked) => updateSettings.mutate({ eventId, staffOnly: checked })}
            className="ml-4 shrink-0 data-[state=checked]:bg-amber-500"
          />
        </div>
      )}

      {socketError && (
        <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          {socketError}
        </div>
      )}

      {pinnedMessages.length > 0 && (
        <div className="mt-4 rounded-xl border border-neon-pink/25 bg-neon-pink/10 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neon-pink">
            <Megaphone className="h-3.5 w-3.5" /> Pinned updates
          </div>
          <div className="space-y-2">
            {pinnedMessages.slice(0, 2).map(m => (
              <p key={m.id} className="text-sm leading-5 text-admin-80">{m.body}</p>
            ))}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn('mt-4 overflow-y-auto rounded-2xl border', chatSurfaceClass, 'border-admin', compact ? 'max-h-[320px]' : 'max-h-[520px]')}
      >
        {messageList}
      </div>

      {inputArea}
    </section>
  )
}

function AdminChatHeader({ eventTitle, statusLabel, connected, mutedText }: { eventTitle: string; statusLabel: string; connected: boolean; mutedText: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-pink/12 text-neon-pink">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-black">Event Chat</h2>
          <p className={cn('truncate text-xs', mutedText)}>{eventTitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className="rounded-full border-neon-pink/20 bg-neon-pink/10 px-2.5 py-1 text-[11px] text-neon-pink">{statusLabel}</Badge>
        {connected ? <Wifi className="h-4 w-4 text-emerald-400" /> : <WifiOff className="h-4 w-4 text-amber-400" />}
      </div>
    </div>
  )
}

function ChatAvatar({ sender, own = false, isCustomer }: { sender: EventChatMessage['sender']; own?: boolean; isCustomer: boolean }) {
  const name = sender?.displayName ?? (own ? 'You' : 'Glee')
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'G'

  const ringClass = isCustomer ? 'ring-white/10' : 'ring-admin'
  const fallbackClass = own
    ? 'bg-neon-pink text-white'
    : isStaffRole(sender?.role)
      ? 'bg-blue-500/20 text-blue-300'
      : isVendorRole(sender?.role)
        ? 'bg-amber-500/20 text-amber-300'
        : isCustomer ? 'bg-white/12 text-white' : 'bg-admin-overlay text-foreground'

  if (sender?.profileImage) {
    return <img src={sender.profileImage} alt={name} className={cn('mt-1 h-8 w-8 shrink-0 rounded-full object-cover ring-2', ringClass)} />
  }

  return (
    <div className={cn('mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-black ring-2', ringClass, fallbackClass)}>
      {initials}
    </div>
  )
}
