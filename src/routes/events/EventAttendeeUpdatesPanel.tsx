import { useMemo, useState, type FormEvent } from 'react'
import {
  type EventAttendeeUpdateChannel,
  type EventAttendeeUpdateSummary,
  useSendEventAttendeeUpdate,
} from '@glee/api'
import { Button, Input, Label, Textarea, useToast, cn } from '@glee/ui'
import type { Event } from '@glee/types'
import { Mail, Megaphone, MessageSquareText, Send, Smartphone, Users } from 'lucide-react'

interface EventAttendeeUpdatesPanelProps {
  event: Event
  vendorScoped: boolean
  purchaseCount: number
  ticketQuantity: number
}

const CHANNELS: Array<{
  value: EventAttendeeUpdateChannel
  label: string
  icon: typeof Mail
}> = [
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'SMS', label: 'SMS', icon: MessageSquareText },
]

export default function EventAttendeeUpdatesPanel({
  event,
  vendorScoped,
  purchaseCount,
  ticketQuantity,
}: EventAttendeeUpdatesPanelProps) {
  const { toast } = useToast()
  const sendUpdate = useSendEventAttendeeUpdate({ vendorScoped })
  const [channels, setChannels] = useState<EventAttendeeUpdateChannel[]>(['EMAIL', 'SMS'])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [summary, setSummary] = useState<EventAttendeeUpdateSummary | null>(null)

  const smsPreview = useMemo(() => {
    const intro = subject.trim() ? `${subject.trim()} - ` : ''
    const body = message.trim() || 'Your update will appear here.'
    const ticketPreviewUrl = `${window.location.origin}/t/...`
    return `${event.title}: ${intro}${body} Ticket: ${ticketPreviewUrl}`
  }, [event.title, message, subject])

  function toggleChannel(channel: EventAttendeeUpdateChannel) {
    setChannels(current =>
      current.includes(channel)
        ? current.filter(value => value !== channel)
        : [...current, channel],
    )
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault()
    const cleanMessage = message.trim()
    if (!channels.length || !cleanMessage) {
      toast({
        title: 'Missing update details',
        description: 'Choose a channel and add the attendee message.',
        variant: 'destructive',
      })
      return
    }

    try {
      const result = await sendUpdate.mutateAsync({
        id: event.id,
        data: {
          channels,
          subject: subject.trim() || undefined,
          message: cleanMessage,
        },
      })
      setSummary(result)
      toast({
        title: 'Attendee update processed',
        description: buildSummaryLine(result),
      })
      setMessage('')
    } catch (error) {
      toast({
        title: 'Could not send attendee update',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  const smsSelected = channels.includes('SMS')
  const emailSelected = channels.includes('EMAIL')

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-foreground">Attendee Updates</h2>
              <p className="text-xs text-admin-40">Send event changes and announcements to confirmed attendees.</p>
            </div>
          </div>
          <span className="w-fit rounded-full border border-admin bg-admin-overlay px-3 py-1 text-xs font-medium text-admin-50">
            {ticketQuantity.toLocaleString()} ticket{ticketQuantity === 1 ? '' : 's'}
          </span>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs text-admin-50">Channels</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHANNELS.map(channel => {
                const active = channels.includes(channel.value)
                const Icon = channel.icon
                return (
                  <button
                    key={channel.value}
                    type="button"
                    onClick={() => toggleChannel(channel.value)}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition',
                      active
                        ? 'border-neon-pink/40 bg-neon-pink/10 text-foreground'
                        : 'border-admin bg-admin-overlay text-admin-50 hover:border-neon-pink/30 hover:text-foreground',
                    )}
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <Icon className={cn('h-4 w-4', active ? 'text-neon-pink' : 'text-admin-40')} />
                      {channel.label}
                    </span>
                    <span className={cn('h-2.5 w-2.5 rounded-full', active ? 'bg-neon-pink' : 'bg-admin-30')} />
                  </button>
                )
              })}
            </div>
          </div>

          {emailSelected && (
            <label className="space-y-1.5">
              <Label className="text-xs text-admin-50">Email subject</Label>
              <Input
                value={subject}
                onChange={changeEvent => setSubject(changeEvent.target.value)}
                maxLength={120}
                placeholder={`Update for ${event.title}`}
                className="border-admin bg-admin-input"
              />
            </label>
          )}

          <label className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs text-admin-50">Message</Label>
              <span className={cn('font-mono text-[11px]', message.length > 600 ? 'text-amber-300' : 'text-admin-40')}>
                {message.length}/800
              </span>
            </div>
            <Textarea
              value={message}
              onChange={changeEvent => setMessage(changeEvent.target.value)}
              maxLength={800}
              placeholder="Example: Gate opening has moved to 5:30 PM. Please arrive with your ticket link ready."
              className="min-h-[180px] resize-none border-admin bg-admin-input"
            />
          </label>

          {smsSelected && (
            <div className="rounded-xl border border-admin bg-admin-overlay p-4">
              <div className="mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-neon-pink" />
                <p className="text-xs font-semibold uppercase tracking-wide text-admin-50">SMS preview</p>
              </div>
              <p className="break-words text-sm leading-relaxed text-admin-70">{smsPreview}</p>
              <p className="mt-3 text-xs text-admin-40">
                {smsPreview.length.toLocaleString()} characters before provider formatting.
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={sendUpdate.isPending || !channels.length || !message.trim()}
            className="w-full bg-neon-pink text-white hover:bg-neon-pink/90 disabled:opacity-50 sm:w-fit"
          >
            <Send className="h-4 w-4" />
            {sendUpdate.isPending ? 'Sending...' : 'Send update'}
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-neon-pink" />
            <h3 className="font-heading text-sm font-bold text-foreground">Audience</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <UpdateMetric label="Purchases" value={purchaseCount.toLocaleString()} />
            <UpdateMetric label="Tickets" value={ticketQuantity.toLocaleString()} />
          </div>
          <p className="mt-4 text-sm text-admin-50">
            Recipients are deduped by email and phone before the update is sent.
          </p>
        </div>

        <div className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-neon-pink" />
            <h3 className="font-heading text-sm font-bold text-foreground">Latest Send</h3>
          </div>
          {!summary ? (
            <div className="rounded-xl border border-dashed border-admin bg-admin-overlay p-5 text-sm text-admin-40">
              No attendee update has been sent in this session.
            </div>
          ) : (
            <div className="space-y-3">
              <UpdateMetric label="Unique recipients" value={summary.uniqueRecipients.toLocaleString()} />
              <div className="grid grid-cols-2 gap-2">
                <UpdateMetric label="Emails sent" value={summary.email.sent.toLocaleString()} tone="pink" />
                <UpdateMetric label="SMS sent" value={summary.sms.sent.toLocaleString()} tone="pink" />
              </div>
              {(summary.email.failed > 0 || summary.sms.failed > 0 || summary.sms.skipped > 0) && (
                <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                  {buildFailureLine(summary)}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function UpdateMetric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'pink' | 'default' }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-3">
      <p className="text-xs text-admin-40">{label}</p>
      <p className={cn('mt-1 font-heading text-xl font-black', tone === 'pink' ? 'text-neon-pink' : 'text-foreground')}>
        {value}
      </p>
    </div>
  )
}

function buildSummaryLine(summary: EventAttendeeUpdateSummary) {
  return `${summary.email.sent.toLocaleString()} email${summary.email.sent === 1 ? '' : 's'} and ${summary.sms.sent.toLocaleString()} SMS sent.`
}

function buildFailureLine(summary: EventAttendeeUpdateSummary) {
  if (!summary.sms.enabled || !summary.sms.configured) {
    return 'SMS was skipped because Africa\'s Talking is not enabled or configured yet.'
  }
  return `${summary.email.failed + summary.sms.failed} failed and ${summary.sms.skipped} SMS recipient${summary.sms.skipped === 1 ? '' : 's'} skipped.`
}
