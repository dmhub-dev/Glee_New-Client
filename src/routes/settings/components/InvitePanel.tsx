import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { UserRole } from '@glee/types'
import {
  CalendarClock,
  MailPlus,
  Send,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
} from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  useToast,
} from '@glee/ui'
import { ApiError } from '@glee/api'
import { useInviteUser, useRevokeInvite, usePendingInvites, ASSIGNABLE_ROLES } from '@glee/api'
import { ROLE_LABELS } from './roleConstants'

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(ASSIGNABLE_ROLES as [UserRole, ...UserRole[]]),
})
type InviteFormValues = z.infer<typeof inviteSchema>

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(value: string | null) {
  if (!value) return 'No expiry'
  const diff = new Date(value).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return `${days} day${days === 1 ? '' : 's'} left`
}

export default function InvitePanel() {
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: invites, isLoading: invitesLoading } = usePendingInvites()
  const inviteMutation = useInviteUser()
  const revokeMutation = useRevokeInvite()

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'vendor' },
  })

  async function onInviteSubmit(values: InviteFormValues) {
    try {
      await inviteMutation.mutateAsync(values)
      form.reset()
      toast({ title: 'Invite sent', description: `Invited ${values.email} as ${ROLE_LABELS[values.role]}` })
    } catch {
      toast({ title: 'Failed to send invite', variant: 'destructive' })
    }
  }

  async function handleRevoke(inviteId: string, email: string) {
    if (!window.confirm(`Revoke invite for ${email}?`)) return
    setPendingRevokeId(inviteId)
    try {
      await revokeMutation.mutateAsync(inviteId)
      toast({ title: 'Invite revoked', description: email })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Please try again.'
      toast({ title: 'Failed to revoke invite', description: message, variant: 'destructive' })
    } finally {
      setPendingRevokeId(null)
    }
  }

  return (
    <section className="bg-admin-surface border border-admin rounded-2xl p-6 shadow-admin">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading font-bold text-base text-foreground">Invite User</h2>
          <p className="mt-1 text-xs text-admin-40">Send role-based dashboard access and track pending invitations.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
          <UserRoundPlus className="h-5 w-5" />
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onInviteSubmit)} className="flex flex-col sm:flex-row gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="colleague@example.com"
                    type="email"
                    className="bg-admin-input border-admin text-foreground placeholder:text-admin-30"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="w-full sm:w-52">
                <FormLabel className="sr-only">Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-admin-input border-admin text-foreground">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={inviteMutation.isPending}
            className="gap-2 bg-neon-pink hover:bg-neon-pink/90 text-white shrink-0"
          >
            {inviteMutation.isPending ? (
              'Sending...'
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Invite
              </>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6 overflow-hidden rounded-xl border border-admin bg-admin-overlay">
        <div className="flex items-center justify-between border-b border-admin px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-admin-40">Pending Invites</p>
            <p className="mt-0.5 text-xs text-admin-30">{(invites ?? []).length} awaiting acceptance</p>
          </div>
          <MailPlus className="h-4 w-4 text-neon-pink" />
        </div>
        {invitesLoading ? (
          <div className="space-y-2 p-4">
            <div className="h-10 rounded-lg bg-admin-surface/70" />
            <div className="h-10 rounded-lg bg-admin-surface/70" />
            <div className="h-10 rounded-lg bg-admin-surface/70" />
          </div>
        ) : (invites ?? []).length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-admin-70">No pending invites</p>
            <p className="mt-1 text-xs text-admin-40">New invitations will appear here until the user accepts them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-admin-surface/70 text-left text-xs uppercase tracking-wide text-admin-40">
                <tr>
                  <th className="px-4 py-3 font-medium">Invitee</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Invited By</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin">
                {(invites ?? []).map(inv => (
                  <tr key={inv.id} className="hover:bg-admin-surface/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-pink/10 text-xs font-bold uppercase text-neon-pink">
                          {inv.email.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-admin-90">{inv.email}</p>
                          <p className="text-xs text-admin-40">Pending acceptance</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-admin bg-admin-input px-2.5 py-1 text-xs font-medium text-admin-70">
                        <ShieldCheck className="h-3.5 w-3.5 text-neon-pink" />
                        {ROLE_LABELS[inv.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-admin-50">{inv.invitedBy?.email ?? '-'}</td>
                    <td className="px-4 py-3 text-admin-50">{formatDate(inv.invitedAt)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-admin-50">
                        <CalendarClock className="h-3.5 w-3.5 text-admin-30" />
                        {daysUntil(inv.expiresAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevoke(inv.id, inv.email)}
                        disabled={pendingRevokeId === inv.id}
                        className="gap-1.5 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {pendingRevokeId === inv.id ? 'Revoking...' : 'Revoke'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
