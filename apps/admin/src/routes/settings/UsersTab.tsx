import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { UserRole } from '@glee/types'
import {
  Button,
  Input,
  Badge,
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
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Skeleton,
  useToast,
} from '@glee/ui'
import {
  useUsers,
  usePendingInvites,
  useInviteUser,
  useRevokeInvite,
  useSetUserStatus,
  useDeleteUser,
} from '../../lib/queries/users'
import { ASSIGNABLE_ROLES } from '../../lib/api/users'

const inviteSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(ASSIGNABLE_ROLES as [UserRole, ...UserRole[]]),
})
type InviteFormValues = z.infer<typeof inviteSchema>

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  operations_manager: 'Operations Manager',
  commercial_manager: 'Commercial Manager',
  finance: 'Finance',
  vendor: 'Vendor',
  vendor_staff: 'Vendor Staff',
  customer_support: 'Customer Support',
  content_manager: 'Content Manager',
}

function roleBadgeClass(role: UserRole): string {
  const map: Partial<Record<UserRole, string>> = {
    admin: 'bg-neon-pink/10 text-neon-pink border-neon-pink/30',
    super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    vendor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    finance: 'bg-green-500/10 text-green-400 border-green-500/30',
  }
  return map[role] ?? 'bg-admin-overlay text-admin-60 border-admin'
}

export default function UsersTab() {
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: invites, isLoading: invitesLoading } = usePendingInvites()
  const inviteMutation = useInviteUser()
  const revokeMutation = useRevokeInvite()
  const statusMutation = useSetUserStatus()
  const deleteMutation = useDeleteUser()

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
    try {
      await revokeMutation.mutateAsync(inviteId)
      toast({ title: 'Invite revoked', description: email })
    } catch {
      toast({ title: 'Failed to revoke invite', variant: 'destructive' })
    }
  }

  async function handleToggleStatus(userId: string, currentStatus: 'active' | 'inactive') {
    const next = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await statusMutation.mutateAsync({ userId, status: next })
      toast({ title: `User ${next === 'active' ? 'activated' : 'deactivated'}` })
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  async function handleDelete(userId: string) {
    try {
      await deleteMutation.mutateAsync(userId)
      toast({ title: 'User deleted' })
    } catch {
      toast({ title: 'Failed to delete user', variant: 'destructive' })
    }
  }

  const filteredUsers = (users ?? []).filter(u => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchesRole && matchesSearch
  })

  return (
    <div className="space-y-8">

      {/* Invite panel */}
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

        {/* Pending invites */}
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
                  disabled={revokeMutation.isPending}
                  className="text-admin-40 hover:text-red-400 text-xs"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Users table */}
      <section className="bg-admin-surface border border-admin rounded-2xl overflow-hidden shadow-admin">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b border-admin">
          <h2 className="font-heading font-bold text-base text-foreground flex-1">Users</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="Search users…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-sm bg-admin-input border-admin text-foreground placeholder:text-admin-30 w-48"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-8 text-sm bg-admin-input border-admin text-foreground w-40">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ASSIGNABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {usersLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-admin">
                  {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs text-admin-30 font-medium px-5 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className="border-b border-admin hover:bg-admin-overlay transition-colors">
                    <td className="px-5 py-3 text-sm text-admin-80 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-xs text-admin-50">{u.email}</td>
                    <td className="px-5 py-3">
                      <Badge className={`text-[10px] border ${roleBadgeClass(u.role)}`}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          u.status === 'active'
                            ? 'bg-green-500/10 text-green-500 border-green-500/30'
                            : 'bg-red-500/10 text-red-500 border-red-500/30'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-admin-40 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(u.id, u.status)}
                          disabled={statusMutation.isPending}
                          className="text-xs text-admin-40 hover:text-admin-80 h-7 px-2"
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-red-500/60 hover:text-red-500 h-7 px-2"
                            >
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {u.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the user and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(u.id)}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-admin-30">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
