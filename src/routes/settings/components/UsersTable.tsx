import { useState } from 'react'
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
  Skeleton,
  useToast,
} from '@glee/ui'
import { useUsers, useSetUserStatus, useDeleteUser, ASSIGNABLE_ROLES } from '@glee/api'
import { ROLE_LABELS, roleBadgeClass } from './roleConstants'

export default function UsersTable() {
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: users, isLoading: usersLoading } = useUsers()
  const statusMutation = useSetUserStatus()
  const deleteMutation = useDeleteUser()

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
    </section>
  )
}
