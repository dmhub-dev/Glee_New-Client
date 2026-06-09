import { AlertTriangle, CalendarDays, CheckCircle2, Copy, Mail, MapPin, Phone, QrCode, Share2, Ticket, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../api/client'
import { usePublicTicketPass } from '../../../api/queries/tickets'

function formatDateTime(value?: string | null) {
  if (!value) return 'Date to be confirmed'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date to be confirmed'
  return new Intl.DateTimeFormat('en-KE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function money(value?: number | null) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function statusTone(status?: string) {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'ACTIVE') return 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100'
  if (normalized === 'USED') return 'border-sky-400/40 bg-sky-400/15 text-sky-100'
  if (normalized === 'EXPIRED') return 'border-amber-400/40 bg-amber-400/15 text-amber-100'
  return 'border-rose-400/40 bg-rose-400/15 text-rose-100'
}

function qrImageSrc(ticket: { qrDataUrl?: string | null; ticketRef: string }) {
  // Prefer server-generated inline data URL — no external dependency
  if (ticket.qrDataUrl) return ticket.qrDataUrl
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(ticket.ticketRef)}`
}

export default function PublicTicketPassPage() {
  const { token } = useParams<{ token: string }>()
  const { data, isLoading, error } = usePublicTicketPass(token)
  const [copied, setCopied] = useState(false)

  const shareUrl = useMemo(() => {
    if (data?.ticket.publicUrl?.startsWith('http')) return data.ticket.publicUrl
    if (typeof window === 'undefined') return data?.ticket.publicUrl ?? ''
    return window.location.href
  }, [data?.ticket.publicUrl])

  async function shareTicket() {
    if (!shareUrl || !data) return
    const title = `${data.event.name} ticket`
    if (navigator.share) {
      await navigator.share({ title, text: `Open my Glee ticket for ${data.event.name}`, url: shareUrl })
      return
    }
    await navigator.clipboard?.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#090b0f] px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
          <div className="w-full animate-pulse rounded-[28px] border border-white/10 bg-white/[0.06] p-5">
            <div className="mx-auto h-72 w-72 rounded-3xl bg-white/10" />
            <div className="mt-6 h-7 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-2/3 rounded-full bg-white/10" />
          </div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    const message = error instanceof ApiError ? error.message : 'This ticket link could not be opened.'
    return (
      <main className="min-h-screen bg-[#090b0f] px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl shadow-black/40">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-300" />
            <h1 className="mt-4 text-2xl font-black">Ticket unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-white/62">{message}</p>
            <Link to="/" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950">
              Go to Glee
            </Link>
          </section>
        </div>
      </main>
    )
  }

  const { ticket, event, attendee } = data
  const venue = event.location?.name ?? event.location?.address ?? 'Venue to be confirmed'
  const status = String(ticket.status ?? 'ACTIVE').toUpperCase()
  const isQrEnabled = ticket.qrEnabled && status === 'ACTIVE'

  return (
    <main className="min-h-screen bg-[#090b0f] text-white">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 gap-0 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.24),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.20),transparent_34%)]" />
          <div className="relative w-full max-w-md rounded-[32px] border border-white/12 bg-white/[0.075] p-4 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-1 pb-3">
              <div>
                <p className="text-xs font-black uppercase text-white/45">Glee Ticket</p>
                <h1 className="mt-1 line-clamp-2 text-xl font-black leading-tight text-white">{event.name}</h1>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusTone(status)}`}>{status}</span>
            </div>

            <div className="rounded-[28px] bg-white p-4 text-slate-950 shadow-xl">
              <div className="relative mx-auto aspect-square max-w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-3">
                <img className="h-full w-full object-contain" src={qrImageSrc(ticket)} alt="Ticket QR code" />
                {!isQrEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/88 p-6 text-center backdrop-blur-[2px]">
                    <div>
                      <AlertTriangle className="mx-auto h-9 w-9 text-amber-600" />
                      <p className="mt-2 text-sm font-black text-slate-950">QR not valid for entry</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Status: {status}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <div>
                  <p className="text-[11px] font-black uppercase text-white/45">Ticket Ref</p>
                  <p className="mt-1 break-all text-sm font-black">{ticket.ticketRef}</p>
                </div>
                <QrCode className="h-6 w-6 shrink-0 text-cyan-200" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button onClick={shareTicket} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black text-slate-950 shadow-lg shadow-black/20">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? 'Copied' : 'Share'}
              </button>
              <button onClick={() => navigator.clipboard?.writeText(ticket.ticketRef)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/14 bg-white/[0.06] text-sm font-black text-white">
                <Copy className="h-4 w-4" />
                Ref
              </button>
            </div>
          </div>
        </div>

        <div className="flex min-h-screen items-center px-4 pb-8 pt-0 sm:px-6 lg:px-8 lg:py-8">
          <div className="w-full space-y-4">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase text-cyan-200/80">{event.category?.name ?? 'Event'}</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-white sm:text-4xl">{event.name}</h2>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-right text-slate-950">
                  <p className="text-xs font-black uppercase text-slate-500">Ticket</p>
                  <p className="text-lg font-black">#{ticket.ticketNumber}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoLine icon={<CalendarDays className="h-5 w-5" />} label="Date" value={formatDateTime(event.startDate)} />
                <InfoLine icon={<MapPin className="h-5 w-5" />} label="Venue" value={venue} />
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <DetailPanel title="Attendee" icon={<UserRound className="h-5 w-5" />}>
                <Detail label="Name" value={attendee.name ?? 'Guest'} />
                <Detail label="Email" value={attendee.email ?? 'No email'} icon={<Mail className="h-4 w-4" />} />
                <Detail label="Phone" value={attendee.phone ?? 'No phone'} icon={<Phone className="h-4 w-4" />} />
              </DetailPanel>
              <DetailPanel title="Ticket" icon={<Ticket className="h-5 w-5" />}>
                <Detail label="Type" value={ticket.ticketType ?? ticket.ticketCategory?.name ?? 'Event ticket'} />
                <Detail label="Paid" value={money(ticket.payment?.amountPaid)} />
                <Detail label="Payment" value={`${ticket.payment?.method ?? 'Payment'} · ${ticket.payment?.status ?? status}`} />
              </DetailPanel>
            </section>

            {(ticket.menuItems?.length ?? 0) > 0 && (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
                <h3 className="text-lg font-black">Menu add-ons</h3>
                <div className="mt-4 space-y-3">
                  {ticket.menuItems?.map((item, index) => (
                    <div key={`${item.id ?? item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.06] px-4 py-3">
                      <div>
                        <p className="font-black text-white">{item.name}</p>
                        <p className="text-xs font-semibold text-white/45">Qty {item.quantity}</p>
                      </div>
                      <p className="text-sm font-black text-cyan-100">{money(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/[0.07] p-4">
      <div className="mt-0.5 text-cyan-200">{icon}</div>
      <div>
        <p className="text-xs font-black uppercase text-white/40">{label}</p>
        <p className="mt-1 text-sm font-bold leading-5 text-white">{value}</p>
      </div>
    </div>
  )
}

function DetailPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-white">
        <span className="text-cyan-200">{icon}</span>
        <h3 className="text-lg font-black">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.06] px-4 py-3">
      <p className="text-[11px] font-black uppercase text-white/40">{label}</p>
      <div className="mt-1 flex items-center gap-2 text-sm font-bold leading-5 text-white">
        {icon ? <span className="text-white/45">{icon}</span> : null}
        <span className="break-all">{value}</span>
      </div>
    </div>
  )
}
