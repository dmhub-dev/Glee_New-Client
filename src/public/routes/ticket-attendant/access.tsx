import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  accessTicketAttendantDesk,
  attendantCheckIn,
  attendantLogout,
  getTicketAttendantAttendees,
  getTicketAttendantDesk,
  type AttendantDeskTicket,
  type TicketAttendantDeskResult,
} from '@glee/api'
import { ApiError } from '@glee/api'
import { Badge, Button, Input, Label, Skeleton, useToast } from '@glee/ui'
import { cn } from '@glee/ui'
import { CheckCircle2, LogOut, Search, ShieldCheck, Ticket, XCircle } from 'lucide-react'

const storageKey = 'glee:ticket-attendant-session'

export default function TicketAttendantAccessPage() {
  const [params] = useSearchParams()
  const inviteToken = params.get('token') ?? ''
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [sessionToken, setSessionToken] = useState(() => sessionStorage.getItem(storageKey) ?? '')
  const [desk, setDesk] = useState<TicketAttendantDeskResult | null>(null)
  const [attendees, setAttendees] = useState<AttendantDeskTicket[]>([])
  const [ticketRef, setTicketRef] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(Boolean(sessionToken))
  const [checkingIn, setCheckingIn] = useState(false)
  const [accessing, setAccessing] = useState(false)

  const filteredAttendees = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return attendees
    return attendees.filter(ticket =>
      `${ticket.attendee.name} ${ticket.attendee.email ?? ''} ${ticket.attendee.phone ?? ''} ${ticket.ticketTier ?? ''} ${ticket.ticketRefDisplay ?? ''}`.toLowerCase().includes(q),
    )
  }, [attendees, query])

  const checkedInCount = attendees.filter(ticket => ticket.status === 'USED' || ticket.checkedInAt).length

  useEffect(() => {
    if (!sessionToken) return
    let cancelled = false
    async function loadDesk() {
      setLoading(true)
      try {
        const [deskResult, attendeeRows] = await Promise.all([
          getTicketAttendantDesk(sessionToken),
          getTicketAttendantAttendees(sessionToken),
        ])
        if (cancelled) return
        setDesk(deskResult)
        setAttendees(attendeeRows)
      } catch (error) {
        if (cancelled) return
        sessionStorage.removeItem(storageKey)
        setSessionToken('')
        toast({
          title: 'Session expired',
          description: error instanceof Error ? error.message : 'Please sign in again.',
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadDesk()
    return () => { cancelled = true }
  }, [sessionToken, toast])

  async function handleAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAccessing(true)
    try {
      const result = await accessTicketAttendantDesk({ token: inviteToken, name, email, pin })
      sessionStorage.setItem(storageKey, result.token)
      setSessionToken(result.token)
      setDesk({ attendant: result.attendant, event: result.event, canCheckIn: result.event.status === 'LIVE' })
      toast({ title: 'Access granted' })
    } catch (error) {
      toast({
        title: 'Could not open desk',
        description: error instanceof Error ? error.message : 'Check your details and try again.',
        variant: 'destructive',
      })
    } finally {
      setAccessing(false)
    }
  }

  async function handleCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ticketRef.trim()) return
    setCheckingIn(true)
    try {
      const updated = await attendantCheckIn({ sessionToken, ticketRef: ticketRef.trim(), source: 'QR' })
      setAttendees(rows => rows.map(row => row.id === updated.id ? updated : row))
      setTicketRef('')
      toast({ title: 'Ticket checked in', description: updated.attendee.name })
    } catch (error) {
      toast({
        title: error instanceof ApiError && error.status === 409 ? 'Already checked in' : 'Check-in failed',
        description: error instanceof Error ? error.message : 'Please verify the QR code.',
        variant: 'destructive',
      })
    } finally {
      setCheckingIn(false)
    }
  }

  async function handleLogout() {
    if (sessionToken) await attendantLogout(sessionToken).catch(() => undefined)
    sessionStorage.removeItem(storageKey)
    setSessionToken('')
    setDesk(null)
    setAttendees([])
  }

  if (!sessionToken) {
    return (
      <main className="min-h-screen bg-admin-body text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10">
          <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="rounded-2xl border border-admin bg-admin-surface p-6 shadow-admin lg:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neon-pink/10 text-neon-pink">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-neon-pink">Glee Check-in Desk</p>
              <h1 className="mt-3 max-w-xl font-heading text-3xl font-black leading-tight text-foreground sm:text-4xl">
                Secure event access for ticket attendants.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-admin-50">
                Enter the exact name and email from your invite, plus the PIN shared by the event admin or vendor.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <DeskIntro label="Event scoped" value="One event" />
                <DeskIntro label="PIN protected" value="Unique code" />
                <DeskIntro label="Session" value="One device" />
              </div>
            </section>

            <form onSubmit={handleAccess} className="rounded-2xl border border-admin bg-admin-surface p-6 shadow-admin">
              <h2 className="font-heading text-lg font-bold text-foreground">Open Desk</h2>
              <p className="mt-1 text-sm text-admin-40">Your access link is already attached to this page.</p>
              <div className="mt-6 space-y-4">
                <label className="space-y-1.5">
                  <Label className="text-xs text-admin-50">Full name</Label>
                  <Input value={name} onChange={event => setName(event.target.value)} className="border-admin bg-admin-input" />
                </label>
                <label className="space-y-1.5">
                  <Label className="text-xs text-admin-50">Email</Label>
                  <Input type="email" value={email} onChange={event => setEmail(event.target.value)} className="border-admin bg-admin-input" />
                </label>
                <label className="space-y-1.5">
                  <Label className="text-xs text-admin-50">PIN</Label>
                  <Input inputMode="numeric" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="border-admin bg-admin-input font-mono text-lg tracking-[0.3em]" />
                </label>
                <Button type="submit" disabled={accessing || !inviteToken} className="w-full bg-neon-pink text-white hover:bg-neon-pink/90">
                  {accessing ? 'Opening...' : 'Open Check-in Desk'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-admin-body text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-neon-pink/25 bg-neon-pink/10 text-neon-pink">Ticket Attendant</Badge>
              <Badge className={cn('border-admin bg-admin-overlay text-admin-50', desk?.canCheckIn && 'border-green-500/25 bg-green-500/10 text-green-400')}>
                {desk?.event.status ?? 'Loading'}
              </Badge>
            </div>
            <h1 className="mt-3 font-heading text-2xl font-black text-foreground">{desk?.event.name ?? 'Check-in Desk'}</h1>
            <p className="mt-1 text-sm text-admin-40">{desk?.attendant.name ?? 'Attendant'} · {desk?.attendant.email ?? ''}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DeskStat label="Attendees" value={attendees.length} />
            <DeskStat label="Checked in" value={checkedInCount} />
            <Button type="button" variant="outline" onClick={handleLogout} className="border-admin bg-admin-overlay">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
            <div className="mb-4 flex items-center gap-2">
              <Ticket className="h-4 w-4 text-neon-pink" />
              <h2 className="font-heading text-sm font-bold text-foreground">Scan or Enter QR Code</h2>
            </div>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <Input
                value={ticketRef}
                onChange={event => setTicketRef(event.target.value)}
                placeholder="Paste or scan ticket QR reference"
                disabled={!desk?.canCheckIn}
                className="h-12 border-admin bg-admin-input font-mono"
                autoFocus
              />
              <Button type="submit" disabled={checkingIn || !desk?.canCheckIn || !ticketRef.trim()} className="w-full bg-neon-pink text-white hover:bg-neon-pink/90">
                {checkingIn ? 'Checking...' : 'Check In Ticket'}
              </Button>
            </form>
            {!desk?.canCheckIn && (
              <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-300">
                Check-in opens when this event is Live.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-sm font-bold text-foreground">Attendee List</h2>
                <p className="mt-1 text-xs text-admin-40">Limited operational view. Ticket refs are masked until scanned.</p>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-30" />
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search attendee" className="h-9 border-admin bg-admin-input pl-9" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
            ) : (
              <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                {filteredAttendees.map(ticket => {
                  const checkedIn = ticket.status === 'USED' || Boolean(ticket.checkedInAt)
                  return (
                    <div key={ticket.id} className="rounded-xl border border-admin bg-admin-overlay p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {checkedIn ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-admin-30" />}
                            <p className="truncate font-semibold text-foreground">{ticket.attendee.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-admin-40">{ticket.attendee.email ?? 'No email'} · {ticket.attendee.phone ?? 'No phone'}</p>
                          <p className="mt-2 text-xs text-admin-40">{ticket.ticketTier ?? 'General'} · {ticket.ticketRefDisplay ?? 'Masked ref'}</p>
                        </div>
                        <Badge className={cn('w-fit border-admin bg-admin-surface text-admin-50', checkedIn && 'border-green-500/25 bg-green-500/10 text-green-400')}>
                          {checkedIn ? 'Checked in' : ticket.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}

function DeskIntro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-4">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-heading text-lg font-black text-foreground">{value}</p>
    </div>
  )
}

function DeskStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay px-4 py-2">
      <p className="text-[11px] text-admin-40">{label}</p>
      <p className="font-heading text-lg font-black text-foreground">{value.toLocaleString()}</p>
    </div>
  )
}
