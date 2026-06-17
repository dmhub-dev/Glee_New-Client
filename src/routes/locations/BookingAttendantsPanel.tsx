import { useState } from 'react'
import {
  useBookingAttendants,
  useCreateBookingAttendant,
  useResetBookingAttendantSession,
  useRevokeBookingAttendant,
  type Location,
} from '@glee/api'
import { Badge, Button, Input, Skeleton, useToast } from '@glee/ui'
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
      toast({ title: 'Hostess access revoked' })
    } catch (error) {
      toast({ title: 'Could not revoke access', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  const rows = attendants.data ?? []

  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-lg font-black text-foreground">
            <UserRoundCheck className="h-5 w-5 text-neon-pink" />
            Booking hostesses
          </h2>
          <p className="mt-1 text-sm text-admin-40">Invite check-in staff for this location only.</p>
        </div>
        <Badge className="border-admin bg-admin-overlay text-admin-50">{rows.length} invited</Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input value={name} onChange={event => setName(event.target.value)} placeholder="Full name" className="border-admin bg-admin-input" />
        <Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email address" className="border-admin bg-admin-input" />
        <Button onClick={invite} disabled={createAttendant.isPending} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
          <Plus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      {lastInvite && (
        <div className="mt-4 rounded-xl border border-neon-pink/25 bg-neon-pink/10 p-4 text-sm text-admin-70">
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

      <div className="mt-5 space-y-2">
        {attendants.isLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">No hostesses invited yet.</p>
        ) : rows.map(attendant => (
          <article key={attendant.id} className="flex flex-col gap-3 rounded-xl border border-admin bg-admin-overlay p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">{attendant.name}</p>
              <p className="mt-1 text-sm text-admin-40">{attendant.email}</p>
              <p className="mt-1 text-xs text-admin-30">{attendant.sessionActive ? 'Session active' : 'No active session'} · {attendant.status}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => reset(attendant.id)} className="gap-1.5 border-admin text-admin-60 hover:bg-admin-input">
                <RefreshCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button size="sm" variant="outline" onClick={() => revoke(attendant.id)} className="gap-1.5 border-red-500/30 text-red-300 hover:bg-red-500/10">
                <ShieldX className="h-3.5 w-3.5" />
                Revoke
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
