import { useState } from 'react'
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
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
  useToast,
  cn,
} from '@glee/ui'
import {
  useAuditLogs,
  useUsers,
  useSetUserStatus,
  useDeleteUser,
  useReassignUserRole,
  ASSIGNABLE_ROLES,
  type AdminUserRecord,
} from '@glee/api'
import { ROLE_LABELS, roleBadgeClass } from './roleConstants'

type DetailView = 'details' | 'audit'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatMetadata(value: unknown) {
  if (!value) return 'No metadata'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function UsersTable() {
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null)
  const [detailView, setDetailView] = useState<DetailView>('details')
  const [roleUser, setRoleUser] = useState<AdminUserRecord | null>(null)
  const [roleDraft, setRoleDraft] = useState<UserRole>('admin')
  const { toast } = useToast()

  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs({
    actorId: selectedUser?.id ?? 'none',
    limit: 20,
  })
  const statusMutation = useSetUserStatus()
  const deleteMutation = useDeleteUser()
  const reassignMutation = useReassignUserRole()

  async function handleToggleStatus(userId: string, currentStatus: 'active' | 'inactive') {
    const next = currentStatus === 'active' ? 'inactive' : 'active'
    setPendingStatusId(userId)
    try {
      await statusMutation.mutateAsync({ userId, status: next })
      toast({ title: `User ${next === 'active' ? 'activated' : 'deactivated'}` })
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    } finally {
      setPendingStatusId(null)
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

  function openRoleDialog(user: AdminUserRecord) {
    setRoleUser(user)
    setRoleDraft(user.role)
  }

  async function handleUpdateRole() {
    if (!roleUser) return
    try {
      await reassignMutation.mutateAsync({ userId: roleUser.id, role: roleDraft })
      toast({ title: 'Role updated', description: `${roleUser.name} is now ${ROLE_LABELS[roleDraft]}` })
      setRoleUser(null)
      if (selectedUser?.id === roleUser.id) setSelectedUser({ ...roleUser, role: roleDraft })
    } catch {
      toast({ title: 'Failed to update role', variant: 'destructive' })
    }
  }

  function openDetails(user: AdminUserRecord) {
    setSelectedUser(user)
    setDetailView('details')
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
    <section className="bg-admin-surface border border-admin rounded-2xl overflow-hidden shadow-admin">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-6 py-4 border-b border-admin">
        <h2 className="font-heading font-bold text-base text-foreground flex-1">Users</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search users..."
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
          <table className="w-full text-sm min-w-[820px]">
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
                <tr
                  key={u.id}
                  onClick={() => openDetails(u)}
                  className="border-b border-admin hover:bg-admin-overlay transition-colors cursor-pointer"
                >
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
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openRoleDialog(u)}
                        className="text-xs text-admin-40 hover:text-admin-80 h-7 px-2"
                      >
                        Update role
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(u.id, u.status)}
                        disabled={pendingStatusId === u.id}
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
                        <AlertDialogContent className="bg-admin-dialog border border-admin-dialog shadow-2xl">
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

      <Dialog open={selectedUser !== null} onOpenChange={open => { if (!open) setSelectedUser(null) }}>
        <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto border-admin bg-admin-surface p-0">
          {selectedUser && (
            <>
              <DialogHeader className="border-b border-admin px-6 py-5">
                <DialogTitle className="text-foreground">{selectedUser.name}</DialogTitle>
                <DialogDescription>{selectedUser.email}</DialogDescription>
              </DialogHeader>

              <div className="px-6 pt-4">
                <div className="inline-flex rounded-lg border border-admin bg-admin-overlay p-1">
                  {(['details', 'audit'] as DetailView[]).map(view => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setDetailView(view)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        detailView === view
                          ? 'bg-neon-pink/15 text-neon-pink'
                          : 'text-admin-40 hover:text-admin-80',
                      )}
                    >
                      {view === 'details' ? 'Details' : 'Audit logs'}
                    </button>
                  ))}
                </div>
              </div>

              {detailView === 'details' ? (
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  <div className="rounded-lg border border-admin bg-admin-overlay p-4">
                    <p className="text-xs uppercase tracking-wide text-admin-30">Name</p>
                    <p className="mt-1 text-sm font-medium text-admin-90">{selectedUser.name}</p>
                  </div>
                  <div className="rounded-lg border border-admin bg-admin-overlay p-4">
                    <p className="text-xs uppercase tracking-wide text-admin-30">Email</p>
                    <p className="mt-1 text-sm font-medium text-admin-90">{selectedUser.email}</p>
                  </div>
                  <div className="rounded-lg border border-admin bg-admin-overlay p-4">
                    <p className="text-xs uppercase tracking-wide text-admin-30">Role</p>
                    <Badge className={`mt-2 text-[10px] border ${roleBadgeClass(selectedUser.role)}`}>
                      {ROLE_LABELS[selectedUser.role]}
                    </Badge>
                  </div>
                  <div className="rounded-lg border border-admin bg-admin-overlay p-4">
                    <p className="text-xs uppercase tracking-wide text-admin-30">Status</p>
                    <p className="mt-1 text-sm font-medium capitalize text-admin-90">{selectedUser.status}</p>
                  </div>
                  <div className="rounded-lg border border-admin bg-admin-overlay p-4 sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-admin-30">Joined</p>
                    <p className="mt-1 text-sm font-medium text-admin-90">{formatDateTime(selectedUser.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  {auditLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-16 rounded-lg" />
                      ))}
                    </div>
                  ) : (auditLogs?.items ?? []).length === 0 ? (
                    <div className="rounded-lg border border-admin bg-admin-overlay p-6 text-center text-sm text-admin-40">
                      No audit logs found for this user.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(auditLogs?.items ?? []).map(log => (
                        <div key={log.id} className="rounded-lg border border-admin bg-admin-overlay p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <Badge className="border border-neon-pink/30 bg-neon-pink/10 text-neon-pink">
                                {log.action}
                              </Badge>
                              <p className="mt-2 text-sm text-admin-80">{log.entity}</p>
                            </div>
                            <p className="text-xs text-admin-40">{formatDateTime(log.createdAt)}</p>
                          </div>
                          <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap rounded-md bg-admin-input p-2 font-mono text-xs text-admin-50">
                            {formatMetadata(log.metadata)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={roleUser !== null} onOpenChange={open => { if (!open) setRoleUser(null) }}>
        <DialogContent className="max-w-md border-admin bg-admin-surface">
          <DialogHeader>
            <DialogTitle className="text-foreground">Update user role</DialogTitle>
            <DialogDescription>
              {roleUser ? `Change access level for ${roleUser.name}.` : 'Change user access level.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-admin-80">Role</label>
            <Select value={roleDraft} onValueChange={value => setRoleDraft(value as UserRole)}>
              <SelectTrigger className="bg-admin-input border-admin text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map(role => (
                  <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRoleUser(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpdateRole}
              disabled={reassignMutation.isPending || !roleUser || roleDraft === roleUser.role}
              className="bg-neon-pink text-white hover:bg-neon-pink/90"
            >
              {reassignMutation.isPending ? 'Saving...' : 'Update role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
