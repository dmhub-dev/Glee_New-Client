import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Clock,
  Mail,
  MapPin,
  Phone,
  Power,
  Shield,
  Trash2,
  UserRoundCog,
} from 'lucide-react'
import type { UserRole } from '@glee/types'
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  cn,
  useToast,
} from '@glee/ui'
import {
  ASSIGNABLE_ROLES,
  useAuditLogs,
  useDeleteUser,
  useReassignUserRole,
  useSetUserStatus,
  useUser,
  useUsers,
  type AdminUserRecord,
} from '@glee/api'
import { SlidePanel } from '../../../components/ui/SlidePanel'
import { ROLE_LABELS, roleBadgeClass } from './roleConstants'
import { useAdminUser } from '../../../app/providers'

type DetailView = 'details' | 'audit'
type SortKey = 'name' | 'email' | 'role' | 'status' | 'lastLoginAt' | 'createdAt'
type SortDirection = 'asc' | 'desc'

const FILTER_ROLES: UserRole[] = ['super_admin', ...ASSIGNABLE_ROLES]

function userInitials(user: Pick<AdminUserRecord, 'name' | 'email'>) {
  const parts = user.name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0]?.[0] ?? user.email[0] ?? '?').toUpperCase()
}

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null) {
  if (!value) return 'Never'
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

function compareUser(a: AdminUserRecord, b: AdminUserRecord, key: SortKey) {
  const left = a[key] ?? ''
  const right = b[key] ?? ''
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5" />
  return direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
}

export default function UsersTable() {
  const currentUser = useAdminUser()
  const isSuperAdmin = currentUser.role === 'super_admin'
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailView, setDetailView] = useState<DetailView>('details')
  const [roleUser, setRoleUser] = useState<AdminUserRecord | null>(null)
  const [roleDraft, setRoleDraft] = useState<UserRole>('admin')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const { toast } = useToast()

  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: selectedUser } = useUser(selectedUserId)
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs({
    actorId: selectedUserId ?? 'none',
    limit: 20,
  }, { enabled: isSuperAdmin && Boolean(selectedUserId) })
  const statusMutation = useSetUserStatus()
  const deleteMutation = useDeleteUser()
  const reassignMutation = useReassignUserRole()

  const selectedUserFromList = users?.find(user => user.id === selectedUserId) ?? null
  const panelUser = selectedUser ?? selectedUserFromList
  const visibleRoleFilters = isSuperAdmin ? FILTER_ROLES : ASSIGNABLE_ROLES

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(current => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

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
      if (selectedUserId === userId) setSelectedUserId(null)
    } catch {
      toast({ title: 'Failed to delete user', variant: 'destructive' })
    }
  }

  function openRoleDialog(user: AdminUserRecord) {
    setRoleUser(user)
    setRoleDraft(user.role === 'super_admin' ? 'admin' : user.role)
  }

  async function handleUpdateRole() {
    if (!roleUser) return
    try {
      await reassignMutation.mutateAsync({ userId: roleUser.id, role: roleDraft })
      toast({ title: 'Role updated', description: `${roleUser.name} is now ${ROLE_LABELS[roleDraft]}` })
      setRoleUser(null)
    } catch {
      toast({ title: 'Failed to update role', variant: 'destructive' })
    }
  }

  function openDetails(user: AdminUserRecord) {
    setSelectedUserId(user.id)
    setDetailView('details')
  }

  const filteredUsers = useMemo(() => {
    const output = (users ?? []).filter(u => {
      if (!isSuperAdmin && u.role === 'super_admin') return false
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesSearch =
        !search ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone ?? '').toLowerCase().includes(search.toLowerCase())
      return matchesRole && matchesSearch
    })

    return [...output].sort((a, b) => {
      const result = compareUser(a, b, sortKey)
      return sortDirection === 'asc' ? result : -result
    })
  }, [isSuperAdmin, roleFilter, search, sortDirection, sortKey, users])

  const headers: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'User' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'lastLoginAt', label: 'Last login' },
    { key: 'createdAt', label: 'Joined' },
  ]

  return (
    <section className="overflow-hidden rounded-lg border border-admin bg-admin-surface shadow-admin">
      <div className="flex flex-col gap-4 border-b border-admin px-5 py-4 lg:flex-row lg:items-center">
        <div className="flex-1">
          <h2 className="font-heading text-base font-bold text-foreground">Users</h2>
          <p className="mt-1 text-xs text-admin-40">{filteredUsers.length} visible accounts</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Search name, email or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 min-w-64 bg-admin-input border-admin text-sm text-foreground placeholder:text-admin-30"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 bg-admin-input border-admin text-sm text-foreground sm:w-48">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {visibleRoleFilters.map(role => (
                <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        {usersLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-admin-overlay">
              <tr className="border-b border-admin">
                {headers.map(header => (
                  <th key={header.key} className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => handleSort(header.key)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-admin-40 hover:text-admin-80"
                    >
                      {header.label}
                      <SortIcon active={sortKey === header.key} direction={sortDirection} />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-admin-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin">
              {filteredUsers.map(user => (
                (() => {
                  const canManageUser = isSuperAdmin || user.role !== 'super_admin'
                  return (
                <tr
                  key={user.id}
                  onClick={() => openDetails(user)}
                  className="cursor-pointer transition-colors hover:bg-admin-overlay/70"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-admin">
                        {user.profileImage && <AvatarImage src={user.profileImage} alt={user.name} />}
                        <AvatarFallback className="bg-neon-pink/10 text-xs font-bold text-neon-pink">
                          {userInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-admin-90">{user.name}</p>
                        <p className="text-xs text-admin-40">{user.phone ?? 'No phone'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-admin-50">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge className={`border text-[10px] ${roleBadgeClass(user.role)}`}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                        user.status === 'active'
                          ? 'bg-green-500/10 text-green-500 border-green-500/30'
                          : 'bg-red-500/10 text-red-500 border-red-500/30',
                      )}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-admin-50">{formatDate(user.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-xs text-admin-40">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3" onClick={event => event.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title="Update role"
                        onClick={() => openRoleDialog(user)}
                        disabled={!canManageUser}
                        className="h-8 w-8 text-admin-40 hover:text-neon-pink"
                      >
                        <UserRoundCog className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}
                        onClick={() => handleToggleStatus(user.id, user.status)}
                        disabled={pendingStatusId === user.id || !canManageUser}
                        className="h-8 w-8 text-admin-40 hover:text-admin-80"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            title="Delete user"
                            disabled={!canManageUser}
                            className="h-8 w-8 text-red-500/60 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-admin-dialog border border-admin-dialog shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the user and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(user.id)}
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
                  )
                })()
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-admin-30">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <SlidePanel
        open={selectedUserId !== null}
        onClose={() => setSelectedUserId(null)}
        title={panelUser ? panelUser.name : 'User details'}
        width="sm:max-w-2xl"
      >
        {panelUser ? (
          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-admin px-6 py-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16 border border-admin">
                  {panelUser.profileImage && <AvatarImage src={panelUser.profileImage} alt={panelUser.name} />}
                  <AvatarFallback className="bg-neon-pink/10 text-lg font-black text-neon-pink">
                    {userInitials(panelUser)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold text-foreground">{panelUser.name}</p>
                  <p className="mt-1 truncate text-sm text-admin-50">{panelUser.email}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className={`border text-[10px] ${roleBadgeClass(panelUser.role)}`}>
                      {ROLE_LABELS[panelUser.role]}
                    </Badge>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
                        panelUser.status === 'active'
                          ? 'bg-green-500/10 text-green-500 border-green-500/30'
                          : 'bg-red-500/10 text-red-500 border-red-500/30',
                      )}
                    >
                      {panelUser.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 inline-flex rounded-lg border border-admin bg-admin-overlay p-1">
                {(['details', ...(isSuperAdmin ? ['audit'] as const : [])] as DetailView[]).map(view => (
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
              <div className="space-y-5 p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard icon={Mail} label="Email" value={panelUser.email} />
                  <InfoCard icon={Phone} label="Phone" value={panelUser.phone ?? 'Not provided'} />
                  <InfoCard icon={MapPin} label="Address" value={panelUser.address ?? 'Not provided'} />
                  <InfoCard icon={Clock} label="Last login" value={formatDateTime(panelUser.lastLoginAt)} />
                  <InfoCard icon={CalendarDays} label="Joined" value={formatDateTime(panelUser.createdAt)} />
                  <InfoCard icon={CalendarDays} label="Updated" value={formatDateTime(panelUser.updatedAt)} />
                </div>

                <section className="rounded-lg border border-admin bg-admin-overlay p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-neon-pink" />
                    <h3 className="text-sm font-semibold text-admin-90">Access details</h3>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-admin-30">Role</dt>
                      <dd className="mt-1 text-admin-80">{ROLE_LABELS[panelUser.role]}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-admin-30">Status</dt>
                      <dd className="mt-1 capitalize text-admin-80">{panelUser.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-admin-30">Invited at</dt>
                      <dd className="mt-1 text-admin-80">{formatDateTime(panelUser.invitedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-admin-30">Invited by</dt>
                      <dd className="mt-1 text-admin-80">{panelUser.invitedBy?.email ?? 'Direct account'}</dd>
                    </div>
                  </dl>
                </section>
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
          </div>
        ) : (
          <div className="p-6">
            <Skeleton className="h-40 rounded-lg" />
          </div>
        )}
      </SlidePanel>

      <Dialog open={roleUser !== null} onOpenChange={open => { if (!open) setRoleUser(null) }}>
        <DialogContent className="max-w-md border-admin bg-admin-surface">
          <DialogHeader>
            <DialogTitle className="text-foreground">Update user role</DialogTitle>
            <DialogDescription>
              {roleUser ? `Change access level for ${roleUser.name}.` : 'Change user access level.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium text-admin-80">Role</p>
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

function InfoCard({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-overlay p-4">
      <div className="mb-2 flex items-center gap-2 text-admin-30">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className="break-words text-sm font-medium text-admin-90">{value}</p>
    </div>
  )
}
