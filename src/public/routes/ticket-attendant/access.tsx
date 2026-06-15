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
} from '../../../api'
import { ApiError } from '../../../api'
import { Badge, Button, Input, Label, Skeleton, useToast } from '../../../ui'
import { cn } from '../../../ui'
import { CheckCircle2, LogOut, Search, ShieldCheck, Ticket, XCircle } from 'lucide-react'
import '../../../ui/globals.css'
import './access.css'

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
      <main className="ticket-attendant-page">
        <div className="ticket-attendant-shell">
          <div className="ticket-attendant-access-grid">
            <section className="ticket-attendant-card ticket-attendant-intro-card">
              <div className="ticket-attendant-icon">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <p className="ticket-attendant-kicker">Glee Check-in Desk</p>
              <h1 className="ticket-attendant-title">
                Secure event access for ticket attendants.
              </h1>
              <p className="ticket-attendant-copy">
                Enter the exact name and email from your invite, plus the PIN shared by the event admin or vendor.
              </p>
              <div className="ticket-attendant-intro-grid">
                <DeskIntro label="Event scoped" value="One event" />
                <DeskIntro label="PIN protected" value="Unique code" />
                <DeskIntro label="Session" value="One device" />
              </div>
            </section>

            <form onSubmit={handleAccess} className="ticket-attendant-card ticket-attendant-form-card">
              <h2 className="ticket-attendant-card-title">Open Desk</h2>
              <p className="ticket-attendant-muted">Your access link is already attached to this page.</p>
              <div className="ticket-attendant-form-stack">
                <label className="ticket-attendant-field">
                  <Label className="ticket-attendant-label">Full name</Label>
                  <Input value={name} onChange={event => setName(event.target.value)} className="ticket-attendant-input" />
                </label>
                <label className="ticket-attendant-field">
                  <Label className="ticket-attendant-label">Email</Label>
                  <Input type="email" value={email} onChange={event => setEmail(event.target.value)} className="ticket-attendant-input" />
                </label>
                <label className="ticket-attendant-field">
                  <Label className="ticket-attendant-label">PIN</Label>
                  <Input inputMode="numeric" maxLength={6} value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="ticket-attendant-input ticket-attendant-pin" />
                </label>
                <Button type="submit" disabled={accessing || !inviteToken} className="ticket-attendant-primary-button">
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
    <main className="ticket-attendant-page">
      <div className="ticket-attendant-dashboard">
        <header className="ticket-attendant-card ticket-attendant-header">
          <div>
            <div className="ticket-attendant-badge-row">
              <Badge className="ticket-attendant-badge ticket-attendant-badge-pink">Ticket Attendant</Badge>
              <Badge className={cn('ticket-attendant-badge ticket-attendant-badge-muted', desk?.canCheckIn && 'ticket-attendant-badge-green')}>
                {desk?.event.status ?? 'Loading'}
              </Badge>
            </div>
            <h1 className="ticket-attendant-dashboard-title">{desk?.event.name ?? 'Check-in Desk'}</h1>
            <p className="ticket-attendant-muted">{desk?.attendant.name ?? 'Attendant'} · {desk?.attendant.email ?? ''}</p>
          </div>
          <div className="ticket-attendant-actions">
            <DeskStat label="Attendees" value={attendees.length} />
            <DeskStat label="Checked in" value={checkedInCount} />
            <Button type="button" variant="outline" onClick={handleLogout} className="ticket-attendant-secondary-button">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="ticket-attendant-workspace">
          <section className="ticket-attendant-card">
            <div className="ticket-attendant-section-title">
              <Ticket className="h-4 w-4 text-neon-pink" />
              <h2>Scan or Enter QR Code</h2>
            </div>
            <form onSubmit={handleCheckIn} className="ticket-attendant-form-stack">
              <Input
                value={ticketRef}
                onChange={event => setTicketRef(event.target.value)}
                placeholder="Paste or scan ticket QR reference"
                disabled={!desk?.canCheckIn}
                className="ticket-attendant-input ticket-attendant-scan-input"
                />
              <Button type="submit" disabled={checkingIn || !desk?.canCheckIn || !ticketRef.trim()} className="ticket-attendant-primary-button">
                {checkingIn ? 'Checking...' : 'Check In Ticket'}
              </Button>
            </form>
            {!desk?.canCheckIn && (
              <p className="ticket-attendant-warning">
                Check-in opens when this event is Live.
              </p>
            )}
          </section>

          <section className="ticket-attendant-card">
            <div className="ticket-attendant-list-head">
              <div>
                <h2 className="ticket-attendant-card-title">Attendee List</h2>
                <p className="ticket-attendant-small-muted">Limited operational view. Ticket refs are masked until scanned.</p>
              </div>
              <div className="ticket-attendant-search">
                <Search className="ticket-attendant-search-icon" />
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search attendee" className="ticket-attendant-input ticket-attendant-search-input" />
              </div>
            </div>

            {loading ? (
              <div className="ticket-attendant-form-stack">
                <Skeleton className="ticket-attendant-skeleton" />
                <Skeleton className="ticket-attendant-skeleton" />
              </div>
            ) : (
              <div className="ticket-attendant-list">
                {filteredAttendees.map(ticket => {
                  const checkedIn = ticket.status === 'USED' || Boolean(ticket.checkedInAt)
                  return (
                    <div key={ticket.id} className="ticket-attendant-row">
                      <div className="ticket-attendant-row-inner">
                        <div className="ticket-attendant-row-copy">
                          <div className="ticket-attendant-name-row">
                            {checkedIn ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-admin-30" />}
                            <p>{ticket.attendee.name}</p>
                          </div>
                          <p className="ticket-attendant-small-muted">{ticket.attendee.email ?? 'No email'} · {ticket.attendee.phone ?? 'No phone'}</p>
                          <p className="ticket-attendant-small-muted">{ticket.ticketTier ?? 'General'} · {ticket.ticketRefDisplay ?? 'Masked ref'}</p>
                        </div>
                        <Badge className={cn('ticket-attendant-badge ticket-attendant-badge-muted', checkedIn && 'ticket-attendant-badge-green')}>
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
    <div className="ticket-attendant-mini-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function DeskStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="ticket-attendant-stat">
      <p>{label}</p>
      <strong>{value.toLocaleString()}</strong>
    </div>
  )
}
