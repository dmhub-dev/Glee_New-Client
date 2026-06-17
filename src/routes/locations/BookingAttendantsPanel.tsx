import { useState } from 'react'
import {
  useBookingAttendants,
  useCreateBookingAttendant,
  useResetBookingAttendantSession,
  useRevokeBookingAttendant,
  type BookingAttendant,
  type Location,
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
  useToast,
} from '@glee/ui'
import { KeyRound, Plus, RefreshCcw, ShieldX, UserRoundCheck } from 'lucide-react'

export default function BookingAttendantsPanel({ location }: { location: Location }) {
  const { toast } = useToast()
  const attendants = useBookingAttendants(location.id)
  const createAttendant = useCreateBookingAttendant(location.id)
  const resetSession = useResetBookingAttendantSession(location.id)
  const revokeAttendant = useRevokeBookingAttendant(location.id)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [lastInvite, setLastInvite] = useState<{ pin?: string; inviteUrl?: string } | null>(null)
  const [pendingRevoke, setPendingRevoke] = useState<BookingAttendant | null>(null)

  async function invite() {
    if (!name.trim() || !email.trim()) {
      toast({ title: 'Name and email are required', variant: 'destructive' })
      return
    }
    try {
      const created = await createAttendant.mutateAsync({ locationId: location.id, name: name.trim(), email: email.trim() })
      setName('')
      setEmail('')
      setLastInvite({ pin: created.pin, inviteUrl: created.inviteUrl })
      toast({ title: 'Booking hostess invited' })
    } catch (error) {
      toast({ title: 'Could not invite hostess', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function reset(id: string) {
    try {
      await resetSession.mutateAsync({ locationId: location.id, id })
      toast({ title: 'Session reset' })
    } catch (error) {
      toast({ title: 'Could not reset session', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function revoke(id: string) {
    try {
      await revokeAttendant.mutateAsync({ locationId: location.id, id })
      setPendingRevoke(null)
      toast({ title: 'Hostess access revoked' })
    } catch (error) {
      toast({ title: 'Could not revoke access', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const rows = attendants.data ?? []
  const activeCount = rows.filter(attendant => attendant.status === 'ACTIVE').length
  const sessionCount = rows.filter(attendant => attendant.sessionActive).length

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-30">Check-in team</p>
            <h2 className="mt-2 flex items-center gap-2 font-heading text-xl font-black text-foreground">
              <UserRoundCheck className="h-5 w-5 text-neon-pink" />
              Booking hostesses
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-admin-50">Invite location staff who can view bookings and check in guests without full vendor access.</p>
          </div>
          <div className="grid shrink-0 grid-cols-1 gap-2 sm:min-w-[360px] sm:grid-cols-3">
            <AttendantStat label="Invited" value={rows.length.toLocaleString()} />
            <AttendantStat label="Active" value={activeCount.toLocaleString()} />
            <AttendantStat label="Sessions" value={sessionCount.toLocaleString()} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin">
            <div>
              <p className="text-sm font-semibold text-foreground">Invite hostess</p>
              <p className="mt-1 text-xs text-admin-40">The invite is scoped to {location.name}.</p>
            </div>
            <div className="mt-4 grid gap-3">
              <Input value={name} onChange={event => setName(event.target.value)} placeholder="Full name" className="border-admin bg-admin-input" />
              <Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email address" className="border-admin bg-admin-input" />
              <Button onClick={invite} disabled={createAttendant.isPending} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
                <Plus className="h-4 w-4" />
                Invite hostess
              </Button>
            </div>
          </div>

          {lastInvite && (
            <div className="rounded-xl border border-neon-pink/25 bg-neon-pink/10 p-4 text-sm text-admin-70">
              <p className="font-semibold text-foreground">Latest invite</p>
              {lastInvite.inviteUrl && <p className="mt-2 break-all font-mono text-xs">{lastInvite.inviteUrl}</p>}
              {lastInvite.pin && (
                <p className="mt-2 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-neon-pink" />
                  PIN: <span className="font-mono font-bold text-foreground">{lastInvite.pin}</span>
                </p>
              )}
            </div>
          )}
        </aside>

        <div className="overflow-hidden rounded-xl border border-admin bg-admin-surface shadow-admin">
          <div className="border-b border-admin px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Hostess access</p>
            <p className="mt-1 text-xs text-admin-40">Reset active sessions or revoke access from this location.</p>
          </div>
          {attendants.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-admin-40">No hostesses invited yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead className="bg-admin-overlay/70 text-left text-xs uppercase tracking-wide text-admin-40">
                  <tr>
                    <th className="px-4 py-3 font-medium">Hostess</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Session</th>
                    <th className="px-4 py-3 font-medium">Last Login</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin">
                  {rows.map(attendant => (
                    <tr key={attendant.id} className="transition hover:bg-admin-overlay/45">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{attendant.name}</p>
                        <p className="mt-1 text-xs text-admin-40">{attendant.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={attendant.status === 'ACTIVE' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : attendant.status === 'REVOKED' ? 'border-red-500/25 bg-red-500/10 text-red-300' : 'border-admin bg-admin-input text-admin-50'}>
                          {attendant.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-admin-50">{attendant.sessionActive ? 'Active' : 'No active session'}</td>
                      <td className="px-4 py-3 text-admin-50">
                        {attendant.lastLoginAt ? new Date(attendant.lastLoginAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => reset(attendant.id)} className="gap-1.5 border-admin bg-admin-surface text-admin-60 hover:bg-admin-input">
                            <RefreshCcw className="h-3.5 w-3.5" />
                            Reset
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setPendingRevoke(attendant)} className="gap-1.5 border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15">
                            <ShieldX className="h-3.5 w-3.5" />
                            Revoke
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={Boolean(pendingRevoke)} onOpenChange={open => { if (!open) setPendingRevoke(null) }}>
        <AlertDialogContent className="border-admin bg-admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke hostess access?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevoke ? `${pendingRevoke.name} will no longer be able to check in bookings for ${location.name}.` : 'This hostess will lose booking check-in access.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingRevoke && revoke(pendingRevoke.id)}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Revoke access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function AttendantStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-overlay px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-admin-30">{label}</p>
      <p className="mt-1 truncate font-heading text-sm font-black text-foreground">{value}</p>
    </div>
  )
}
