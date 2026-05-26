import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { UserRole } from '@glee/types'
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
import { useInviteUser, useRevokeInvite, usePendingInvites, ASSIGNABLE_ROLES } from '@glee/api'
import { ROLE_LABELS } from './roleConstants'

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(ASSIGNABLE_ROLES as [UserRole, ...UserRole[]]),
})
type InviteFormValues = z.infer<typeof inviteSchema>

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
    setPendingRevokeId(inviteId)
    try {
      await revokeMutation.mutateAsync(inviteId)
      toast({ title: 'Invite revoked', description: email })
    } catch {
      toast({ title: 'Failed to revoke invite', variant: 'destructive' })
    } finally {
      setPendingRevokeId(null)
    }
  }

  return (
    <section className="bg-admin-surface border border-admin rounded-2xl p-6 shadow-admin">
      <h2 className="font-heading font-bold text-base text-foreground mb-4">Invite User</h2>
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
            className="bg-neon-pink hover:bg-neon-pink/90 text-white shrink-0"
          >
            {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
          </Button>
        </form>
      </Form>

      {!invitesLoading && (invites ?? []).length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-xs text-admin-40 font-medium uppercase tracking-wider">Pending Invites</p>
          {(invites ?? []).map(inv => (
            <div key={inv.id} className="flex items-center justify-between py-2 border-b border-admin last:border-0">
              <div>
                <p className="text-sm text-admin-70">{inv.email}</p>
                <p className="text-xs text-admin-40">{ROLE_LABELS[inv.role]}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRevoke(inv.id, inv.email)}
                disabled={pendingRevokeId === inv.id}
                className="text-admin-40 hover:text-red-400 text-xs"
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
