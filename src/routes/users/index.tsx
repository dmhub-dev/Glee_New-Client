import AdminLayout from '../../components/layout/AdminLayout'
import UsersTab from '../settings/UsersTab'
import { useAdminUser } from '../../app/providers'
import { ApiError, useDeleteUser, useSetUserStatus, useUsers } from '@glee/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Skeleton,
  useToast,
} from '@glee/ui'
import { Mail, ShieldCheck, Trash2, UserCheck, UserRoundCheck, UserX } from 'lucide-react'
import { ROLE_LABELS } from '../settings/components/roleConstants'

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function VendorStaffList() {
  const { data: users, isLoading } = useUsers()
  const { toast } = useToast()
  const statusMutation = useSetUserStatus()
  const deleteMutation = useDeleteUser()
  const staff = users ?? []

  async function handleStatusChange(userId: string, nextStatus: 'active' | 'inactive', email: string) {
    try {
      await statusMutation.mutateAsync({ userId, status: nextStatus })
      toast({ title: nextStatus === 'active' ? 'Staff restored' : 'Staff access revoked', description: email })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Please try again.'
      toast({ title: 'Failed to update staff', description: message, variant: 'destructive' })
    }
  }

  async function handleDelete(userId: string, email: string) {
    try {
      await deleteMutation.mutateAsync(userId)
      toast({ title: 'Staff deleted', description: email })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Please try again.'
      toast({ title: 'Failed to delete staff', description: message, variant: 'destructive' })
    }
  }

  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-6 shadow-admin">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-foreground">Staff Members</h2>
          <p className="mt-1 text-xs text-admin-40">Accepted vendor staff accounts connected to your vendor profile.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-pink/10 text-neon-pink">
          <UserRoundCheck className="h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-xl border border-admin bg-admin-overlay px-4 py-10 text-center">
          <p className="text-sm font-medium text-admin-70">No staff members yet</p>
          <p className="mt-1 text-xs text-admin-40">Accepted invitations will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-admin bg-admin-overlay">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-admin-surface/70 text-left text-xs uppercase tracking-wide text-admin-40">
              <tr>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Last Login</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {staff.map(member => (
                <tr key={member.id} className="hover:bg-admin-surface/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neon-pink/10 text-xs font-bold uppercase text-neon-pink">
                        {member.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-admin-90">{member.name}</p>
                        <p className="flex items-center gap-1 text-xs text-admin-40">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-admin bg-admin-input px-2.5 py-1 text-xs font-medium text-admin-70">
                      <ShieldCheck className="h-3.5 w-3.5 text-neon-pink" />
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={member.status === 'active' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-admin bg-admin-input text-admin-50'}>
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-admin-50">{formatDate(member.createdAt)}</td>
                  <td className="px-4 py-3 text-admin-50">{formatDate(member.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {member.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={statusMutation.isPending}
                          onClick={() => handleStatusChange(member.id, 'inactive', member.email)}
                          className="gap-1.5 text-xs text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-400"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={statusMutation.isPending}
                          onClick={() => handleStatusChange(member.id, 'active', member.email)}
                          className="gap-1.5 text-xs text-green-400/80 hover:bg-green-500/10 hover:text-green-400"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Restore
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deleteMutation.isPending}
                            className="gap-1.5 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-admin bg-admin-dialog">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete staff account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.email} will lose access to this vendor dashboard.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(member.id, member.email)}
                              className="bg-red-500 text-white hover:bg-red-600"
                            >
                              Delete staff
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function UsersPage() {
  const user = useAdminUser()
  const isVendor = user.role === 'vendor'

  return (
    <AdminLayout
      title={isVendor ? 'Staff' : 'Users'}
      subtitle={isVendor ? 'Invite and view vendor staff connected to your account' : 'Invite users, manage accounts, revoke access, and reassign roles'}
    >
      {isVendor ? (
        <div className="space-y-8">
          <UsersTab vendorStaffOnly />
          <VendorStaffList />
        </div>
      ) : (
        <UsersTab />
      )}
    </AdminLayout>
  )
}
