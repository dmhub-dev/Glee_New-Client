import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  accessBookingAttendantDesk,
  bookingAttendantCheckIn,
  bookingAttendantLogout,
  getBookingAttendantDesk,
  getBookingAttendantReservations,
  type BookingAttendantDeskResult,
  type BookingAttendantReservation,
} from '../../../api'
import { ApiError } from '../../../api'
import { Badge, Button, Input, Label, Skeleton, useToast } from '../../../ui'
import { cn } from '../../../ui'
import { CheckCircle2, LogOut, Search, ShieldCheck, Table2, XCircle } from 'lucide-react'
import '../../../ui/globals.css'
import './access.css'

const storageKey = 'glee:booking-attendant-session'

function money(value: string | number | undefined) {
  return `KSh ${Number(value ?? 0).toLocaleString()}`
}

function statusLabel(status: string) {
  if (status === 'SEATED') return 'Seated'
  if (status === 'CONFIRMED') return 'Confirmed'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'NO_SHOW') return 'No-show'
  return status
}

export default function BookingAttendantAccessPage() {
  const [params] = useSearchParams()
  const inviteToken = params.get('token') ?? ''
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [sessionToken, setSessionToken] = useState(() => sessionStorage.getItem(storageKey) ?? '')
  const [desk, setDesk] = useState<BookingAttendantDeskResult | null>(null)
  const [reservations, setReservations] = useState<BookingAttendantReservation[]>([])
  const [reservationRef, setReservationRef] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(Boolean(sessionToken))
  const [checkingIn, setCheckingIn] = useState(false)
  const [accessing, setAccessing] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return reservations
    return reservations.filter(reservation =>
      `${reservation.reference} ${reservation.customer.name} ${reservation.customer.email ?? ''} ${reservation.customer.phone ?? ''} ${reservation.tableCategory}`.toLowerCase().includes(q),
    )
  }, [query, reservations])
  const seatedCount = reservations.filter(reservation => reservation.status === 'SEATED').length

  useEffect(() => {
    if (!sessionToken) return
    let cancelled = false
    async function loadDesk() {
      setLoading(true)
      try {
        const [deskResult, rows] = await Promise.all([
          getBookingAttendantDesk(sessionToken),
          getBookingAttendantReservations(sessionToken),
        ])
        if (cancelled) return
        setDesk(deskResult)
        setReservations(rows)
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
      const result = await accessBookingAttendantDesk({ token: inviteToken, name, email, pin })
      sessionStorage.setItem(storageKey, result.token)
      setSessionToken(result.token)
      setDesk({ attendant: result.attendant, location: result.location, canCheckIn: true })
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
    if (!reservationRef.trim()) return
    setCheckingIn(true)
    try {
      const updated = await bookingAttendantCheckIn({ sessionToken, reservationRef: reservationRef.trim(), source: 'MANUAL' })
      setReservations(rows => {
        const exists = rows.some(row => row.id === updated.id)
        return exists
          ? rows.map(row => row.id === updated.id ? updated : row)
          : [updated, ...rows]
      })
      setReservationRef('')
      toast({ title: 'Reservation seated', description: updated.customer.name })
    } catch (error) {
      toast({
        title: error instanceof ApiError && error.status === 409 ? 'Already seated' : 'Check-in failed',
        description: error instanceof Error ? error.message : 'Please verify the reservation reference.',
        variant: 'destructive',
      })
    } finally {
      setCheckingIn(false)
    }
  }

  async function handleLogout() {
    if (sessionToken) await bookingAttendantLogout(sessionToken).catch(() => undefined)
    sessionStorage.removeItem(storageKey)
    setSessionToken('')
    setDesk(null)
    setReservations([])
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
              <p className="ticket-attendant-kicker">Glee Booking Desk</p>
              <h1 className="ticket-attendant-title">Secure venue access for booking hostesses.</h1>
              <p className="ticket-attendant-copy">Enter the exact name and email from your invite, plus the PIN shared by the vendor.</p>
              <div className="ticket-attendant-intro-grid">
                <DeskIntro label="Location scoped" value="One venue" />
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
                  {accessing ? 'Opening...' : 'Open Booking Desk'}
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
              <Badge className="ticket-attendant-badge ticket-attendant-badge-pink">Booking Hostess</Badge>
              <Badge className={cn('ticket-attendant-badge ticket-attendant-badge-muted', desk?.canCheckIn && 'ticket-attendant-badge-green')}>
                {desk?.canCheckIn ? 'Check-in open' : 'Read only'}
              </Badge>
            </div>
            <h1 className="ticket-attendant-dashboard-title">{desk?.location.name ?? 'Booking Desk'}</h1>
            <p className="ticket-attendant-muted">{desk?.attendant.name ?? 'Hostess'} · {desk?.attendant.email ?? ''}</p>
          </div>
          <div className="ticket-attendant-actions">
            <DeskStat label="Bookings" value={reservations.length} />
            <DeskStat label="Seated" value={seatedCount} />
            <Button type="button" variant="outline" onClick={handleLogout} className="ticket-attendant-secondary-button">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="ticket-attendant-workspace">
          <section className="ticket-attendant-card">
            <div className="ticket-attendant-section-title">
              <Table2 className="h-4 w-4 text-neon-pink" />
              <h2>Check In</h2>
            </div>
            <form onSubmit={handleCheckIn} className="ticket-attendant-form-stack">
              <Input
                value={reservationRef}
                onChange={event => setReservationRef(event.target.value)}
                placeholder="Enter reservation reference"
                disabled={!desk?.canCheckIn}
                className="ticket-attendant-input ticket-attendant-scan-input"
              />
              <Button type="submit" disabled={checkingIn || !desk?.canCheckIn || !reservationRef.trim()} className="ticket-attendant-primary-button">
                {checkingIn ? 'Checking...' : 'Seat Reservation'}
              </Button>
            </form>
          </section>

          <section className="ticket-attendant-card">
            <div className="ticket-attendant-list-head">
              <div>
                <h2 className="ticket-attendant-card-title">Booking List</h2>
                <p className="ticket-attendant-small-muted">Limited operational view for this location.</p>
              </div>
              <div className="ticket-attendant-search">
                <Search className="ticket-attendant-search-icon" />
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search booking" className="ticket-attendant-input ticket-attendant-search-input" />
              </div>
            </div>

            {loading ? (
              <div className="ticket-attendant-form-stack">
                <Skeleton className="ticket-attendant-skeleton" />
                <Skeleton className="ticket-attendant-skeleton" />
              </div>
            ) : (
              <div className="ticket-attendant-list">
                {filtered.map(reservation => {
                  const seated = reservation.status === 'SEATED'
                  return (
                    <div key={reservation.id} className="ticket-attendant-row">
                      <div className="ticket-attendant-row-inner">
                        <div className="ticket-attendant-row-copy">
                          <div className="ticket-attendant-name-row">
                            {seated ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-admin-30" />}
                            <p>{reservation.customer.name}</p>
                            <span>{reservation.reference}</span>
                          </div>
                          <p className="ticket-attendant-small-muted">{reservation.customer.email ?? 'No email'} · {reservation.customer.phone ?? 'No phone'}</p>
                          <p className="ticket-attendant-small-muted">{reservation.table?.name ?? reservation.tableCategory} · {reservation.guestCount} guests · {money(reservation.depositAmount)} deposit</p>
                        </div>
                        <Badge className={cn('ticket-attendant-badge ticket-attendant-badge-muted', seated && 'ticket-attendant-badge-green')}>
                          {statusLabel(reservation.status)}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
                {filtered.length === 0 && <p className="ticket-attendant-muted">No bookings found.</p>}
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
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function DeskStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="ticket-attendant-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
