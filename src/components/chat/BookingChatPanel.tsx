import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, CheckCircle2, Loader2, MessageCircle, RotateCcw, Send } from 'lucide-react'
import {
  canOpenBookingChat,
  type BookingChatMessage,
  type BookingChatReservationSummary,
  type BookingChatViewerType,
  useBookingChatMessages,
  useBookingChatThread,
  useMarkBookingChatRead,
  useReopenBookingChatThread,
  useResolveBookingChatThread,
  useSendBookingChatMessage,
} from '@glee/api'
import { Badge, Button, Skeleton, Textarea, cn, useToast } from '@glee/ui'

export interface BookingChatPanelProps {
  reservation: BookingChatReservationSummary | null | undefined
  viewer: BookingChatViewerType
  viewerName: string
  tone?: 'customer' | 'admin'
  compact?: boolean
  className?: string
  onBack?: () => void
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function senderLabel(message: BookingChatMessage) {
  if (message.senderType === 'SYSTEM') return 'Glee'
  return message.senderName || (message.senderType === 'CUSTOMER' ? 'Guest' : 'Glee Team')
}

export function BookingChatPanel({
  reservation,
  viewer,
  viewerName,
  tone = 'admin',
  compact = false,
  className,
  onBack,
}: BookingChatPanelProps) {
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [draft, setDraft] = useState('')

  const isCustomerTone = tone === 'customer'
  const isEligible = canOpenBookingChat(reservation)
  const reservationId = reservation?.id
  const threadQuery = useBookingChatThread(reservation, isEligible)
  const thread = threadQuery.data
  const messagesQuery = useBookingChatMessages(reservationId, isEligible && Boolean(thread))
  const sendMessage = useSendBookingChatMessage()
  const markRead = useMarkBookingChatRead()
  const resolveThread = useResolveBookingChatThread()
  const reopenThread = useReopenBookingChatThread()

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data])
  const latestMessageId = messages[messages.length - 1]?.id
  const isResolved = thread?.status === 'RESOLVED'
  const canUseComposer = Boolean(reservation && isEligible && thread) && (!isResolved || viewer === 'CUSTOMER')
  const canManageThread = viewer === 'STAFF'
  const currentUnreadCount = viewer === 'CUSTOMER' ? thread?.unreadForCustomer : thread?.unreadForStaff
  const isSending = sendMessage.isPending

  const shellClass = isCustomerTone
    ? 'border-white/12 bg-white/[0.08] text-white shadow-[0_18px_55px_rgba(0,0,0,0.24)]'
    : 'border-admin bg-admin-surface text-foreground shadow-admin'
  const mutedText = isCustomerTone ? 'text-white/55' : 'text-admin-40'
  const chatSurfaceClass = isCustomerTone
    ? 'bg-[radial-gradient(circle_at_top_left,rgba(255,45,143,0.14),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.96))]'
    : 'border-admin bg-admin-overlay'
  const emptyStateClass = isCustomerTone
    ? 'border-white/10 bg-white/[0.05] text-white/60'
    : 'border-admin bg-admin-overlay text-admin-50'
  const customerTitle = thread?.title ?? reservation?.location?.name ?? reservation?.event?.name ?? reservation?.tableCategory ?? 'Booking Chat'
  const customerSubtitle = thread?.reference ?? reservation?.reference ?? 'Reservation support'

  useEffect(() => {
    setDraft('')
  }, [reservationId])

  useEffect(() => {
    if (!reservationId || !isEligible || !thread || !messagesQuery.isSuccess) return
    if ((currentUnreadCount ?? 0) > 0) {
      markRead.mutate({ reservationId, viewer })
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnreadCount, isEligible, latestMessageId, messages.length, messagesQuery.isSuccess, reservationId, thread?.id, viewer])

  async function handleSend() {
    const body = draft.trim()
    if (!body || !reservation || !isEligible || !canUseComposer) return

    try {
      await sendMessage.mutateAsync({
        reservation,
        draft: {
          senderType: viewer,
          senderName: viewerName,
          body,
        },
      })
      setDraft('')
    } catch (error) {
      toast({
        title: 'Message not sent',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function handleResolve() {
    if (!reservationId) return
    try {
      await resolveThread.mutateAsync(reservationId)
    } catch (error) {
      toast({
        title: 'Could not resolve chat',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function handleReopen() {
    if (!reservationId) return
    try {
      await reopenThread.mutateAsync(reservationId)
    } catch (error) {
      toast({
        title: 'Could not reopen chat',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (!reservation || !isEligible) {
    if (isCustomerTone) {
      return (
        <div className={cn('flex flex-col', className)}>
          <BookingCustomerChatHeader
            title={customerTitle}
            subtitle={customerSubtitle}
            statusLabel="Locked"
            onBack={onBack}
          />
          <div className={cn('flex-1 overflow-y-auto overscroll-contain', chatSurfaceClass)}>
            <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="mb-3 h-9 w-9 text-neon-pink/55" />
              <p className="text-sm font-semibold text-white/75">
                Chat opens after this booking is confirmed and paid.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <section className={cn('flex min-h-[280px] flex-col rounded-2xl border p-4', shellClass, className)}>
        <BookingChatHeader
          title="Booking Chat"
          subtitle={reservation?.reference ?? 'Reservation support'}
          statusLabel="Locked"
          mutedText={mutedText}
        />
        <div className={cn('mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center', emptyStateClass)}>
          <MessageCircle className="mb-3 h-9 w-9 text-neon-pink/55" />
          <p className={cn('text-sm font-semibold', isCustomerTone ? 'text-white/75' : 'text-foreground')}>
            Chat opens after this booking is confirmed and paid.
          </p>
        </div>
      </section>
    )
  }

  if (threadQuery.isLoading) {
    if (isCustomerTone) {
      return (
        <div className={cn('flex flex-col', className)}>
          <BookingCustomerChatHeader
            title={customerTitle}
            subtitle={customerSubtitle}
            statusLabel="Loading"
            onBack={onBack}
          />
          <div className={cn('flex-1 overflow-y-auto overscroll-contain p-3', chatSurfaceClass)}>
            <Skeleton className="h-16 rounded-xl bg-white/10" />
            <Skeleton className="mt-3 h-16 rounded-xl bg-white/10" />
            <Skeleton className="mt-3 h-12 rounded-xl bg-white/10" />
          </div>
        </div>
      )
    }

    return (
      <section className={cn('flex rounded-2xl border p-4', compact ? 'min-h-[360px]' : 'min-h-[520px]', shellClass, className)}>
        <div className="flex min-h-0 flex-1 flex-col">
          <Skeleton className={cn('h-10 w-48 rounded-xl', isCustomerTone ? 'bg-white/10' : '')} />
          <Skeleton className={cn('mt-4 min-h-0 flex-1 rounded-2xl', isCustomerTone ? 'bg-white/10' : '')} />
        </div>
      </section>
    )
  }

  const messageList = messagesQuery.isLoading ? (
    <div className="space-y-3 p-3">
      <Skeleton className={cn('h-16 rounded-xl', isCustomerTone ? 'bg-white/10' : '')} />
      <Skeleton className={cn('h-16 rounded-xl', isCustomerTone ? 'bg-white/10' : '')} />
      <Skeleton className={cn('h-12 rounded-xl', isCustomerTone ? 'bg-white/10' : '')} />
    </div>
  ) : messages.length === 0 ? (
    <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
      <MessageCircle className="mb-3 h-8 w-8 text-neon-pink/55" />
      <p className={cn('text-sm font-semibold', isCustomerTone ? 'text-white/72' : 'text-foreground')}>No messages yet</p>
      <p className={cn('mt-1 text-xs', mutedText)}>Booking support messages will appear here.</p>
    </div>
  ) : (
    <div className="space-y-2 p-3">
      {messages.map(message => {
        const isOwnMessage = message.senderType === viewer
        const isStaffMessage = message.senderType === 'STAFF'
        return (
          <div key={message.id} className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[84%] sm:max-w-[74%]', isOwnMessage ? 'text-right' : 'text-left')}>
              <div
                className={cn(
                  'rounded-2xl border px-3.5 py-2.5 shadow-[0_6px_18px_rgba(0,0,0,0.14)]',
                  isOwnMessage
                    ? 'rounded-br-md border-neon-pink/30 bg-neon-pink text-white'
                    : isCustomerTone
                      ? isStaffMessage
                        ? 'rounded-bl-md border-blue-400/25 bg-blue-500/15 text-white'
                        : 'rounded-bl-md border-white/10 bg-white/[0.09] text-white'
                      : isStaffMessage
                        ? 'rounded-bl-md border-blue-400/20 bg-blue-500/10 text-foreground'
                        : 'rounded-bl-md border-admin bg-admin-surface text-foreground',
                )}
              >
                {!isOwnMessage && (
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className={cn('text-xs font-black', isCustomerTone ? 'text-white/82' : 'text-foreground')}>
                      {senderLabel(message)}
                    </span>
                    {message.senderType !== 'CUSTOMER' && (
                      <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                        Glee
                      </span>
                    )}
                  </div>
                )}
                <p className={cn('whitespace-pre-line text-sm leading-5', isOwnMessage ? 'text-white' : isCustomerTone ? 'text-white/82' : 'text-admin-70')}>
                  {message.body}
                </p>
                <p className={cn('mt-1 text-[10px]', isOwnMessage ? 'text-white/70' : mutedText)}>
                  {formatMessageTime(message.createdAt)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const resolvedNotice = isResolved ? (
    <div className={cn('mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs', isCustomerTone ? 'border-white/10 bg-black/20 text-white/60' : 'border-admin bg-admin-overlay text-admin-50')}>
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      {isCustomerTone ? 'This chat is resolved. Sending a new message reopens it.' : 'This chat is resolved.'}
    </div>
  ) : null

  const composer = (
    <div className={cn('shrink-0 space-y-2', isCustomerTone ? 'border-t border-white/10 bg-[#050017]/80 px-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-3 backdrop-blur-xl lg:pb-[calc(env(safe-area-inset-bottom)+1rem)]' : 'mt-4')}>
      {resolvedNotice}
      <div className={cn('flex items-end gap-2 rounded-2xl border p-2', isCustomerTone ? 'border-white/10 bg-white/[0.06]' : 'border-admin bg-admin-overlay')}>
        <Textarea
          aria-label="Booking chat message"
          value={draft}
          onChange={event => setDraft(event.target.value)}
          disabled={!canUseComposer}
          placeholder={canUseComposer ? 'Message...' : 'Reopen this chat to send a message'}
          className={cn('min-h-[44px] max-h-[120px] flex-1 resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0', isCustomerTone ? 'text-white placeholder:text-white/30' : 'text-foreground placeholder:text-admin-30')}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
        />
        <Button
          type="button"
          disabled={!draft.trim() || isSending || !canUseComposer}
          onClick={handleSend}
          className="mb-0.5 h-10 w-10 shrink-0 rounded-full bg-neon-pink p-0 text-white hover:bg-neon-pink/90 disabled:opacity-40"
          aria-label="Send message"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )

  if (isCustomerTone) {
    return (
      <div className={cn('flex flex-col', className)}>
        <BookingCustomerChatHeader
          title={customerTitle}
          subtitle={customerSubtitle}
          statusLabel={thread?.status === 'RESOLVED' ? 'Resolved' : 'Open'}
          onBack={onBack}
        />

        <div
          ref={scrollRef}
          className={cn('flex-1 overflow-y-auto overscroll-contain', chatSurfaceClass)}
        >
          {messageList}
        </div>

        {composer}
      </div>
    )
  }

  return (
    <section className={cn('flex flex-col rounded-2xl border p-4', compact ? 'min-h-[360px]' : 'min-h-[520px]', shellClass, className)}>
      <BookingChatHeader
        title="Booking Chat"
        subtitle={`${thread?.reference ?? reservation.reference} · ${thread?.title ?? reservation.tableCategory}`}
        statusLabel={thread?.status === 'RESOLVED' ? 'Resolved' : 'Open'}
        mutedText={mutedText}
      >
        {canManageThread && thread && (
          thread.status === 'RESOLVED' ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleReopen}
              disabled={reopenThread.isPending}
              className="h-8 shrink-0 border-admin bg-admin-overlay px-2.5 text-xs hover:text-neon-pink"
            >
              {reopenThread.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
              Reopen
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleResolve}
              disabled={resolveThread.isPending}
              className="h-8 shrink-0 border-neon-pink/25 bg-neon-pink/10 px-2.5 text-xs text-neon-pink hover:bg-neon-pink/15 hover:text-neon-pink"
            >
              {resolveThread.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
              Mark Resolved
            </Button>
          )
        )}
      </BookingChatHeader>

      <div
        ref={scrollRef}
        className={cn('mt-4 min-h-[190px] flex-1 overflow-y-auto overscroll-contain rounded-2xl border', compact ? 'max-h-[320px]' : 'max-h-[520px]', chatSurfaceClass)}
      >
        {messageList}
      </div>

      {composer}
    </section>
  )
}

function BookingCustomerChatHeader({
  title,
  subtitle,
  statusLabel,
  onBack,
}: {
  title: string
  subtitle: string
  statusLabel: string
  onBack?: () => void
}) {
  return (
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-pink/15">
        <MessageCircle className="h-5 w-5 text-neon-pink" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">{title}</p>
        <div className="flex items-center gap-1.5">
          <div className={cn('h-1.5 w-1.5 rounded-full', statusLabel === 'Open' ? 'bg-emerald-400' : statusLabel === 'Resolved' ? 'bg-sky-400' : 'bg-amber-400')} />
          <p className="truncate text-xs text-white/45">{statusLabel} · {subtitle}</p>
        </div>
      </div>
    </div>
  )
}

function BookingChatHeader({
  title,
  subtitle,
  statusLabel,
  mutedText,
  children,
}: {
  title: string
  subtitle: string
  statusLabel: string
  mutedText: string
  children?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-pink/12 text-neon-pink">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-black">{title}</h2>
          <p className={cn('truncate text-xs', mutedText)}>{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <Badge className="rounded-full border-neon-pink/20 bg-neon-pink/10 px-2.5 py-1 text-[11px] text-neon-pink">
          {statusLabel}
        </Badge>
        {children}
      </div>
    </div>
  )
}
