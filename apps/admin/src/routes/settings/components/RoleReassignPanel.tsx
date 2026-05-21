import { useState } from 'react'
import type { UserRole } from '@glee/types'
import {
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  AlertDialog,
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
import { ASSIGNABLE_ROLES } from '../../../lib/api/users'
import { useReassignUserRole } from '../../../lib/queries/roles'
import { useUsers } from '../../../lib/queries/users'
import { ROLE_LABELS, roleBadgeClass } from './roleConstants'

interface PendingReassign {
  userId: string
  userName: string
  currentRole: UserRole
  newRole: UserRole
}

export default function RoleReassignPanel() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [pendingReassign, setPendingReassign] = useState<PendingReassign | null>(null)

  const { data: users, isLoading } = useUsers()
  const reassignMutation = useReassignUserRole()

  const filtered = (users ?? []).filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleConfirmReassign() {
    if (!pendingReassign) return
    try {
      await reassignMutation.mutateAsync({ userId: pendingReassign.userId, role: pendingReassign.newRole })
      toast({
        title: 'Role updated',
        description: `${pendingReassign.userName} → ${ROLE_LABELS[pendingReassign.newRole]}`,
      })
      setPendingReassign(null)
    } catch {
      toast({ title: 'Failed to update role', variant: 'destructive' })
    }
  }

  return (
    <section className="bg-admin-surface border border-admin rounded-2xl p-6 shadow-admin">
      <h2 className="font-heading font-bold text-base text-foreground mb-4">Reassign User Role</h2>

      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full sm:w-72 h-8 text-sm px-3 rounded-lg bg-admin-input border border-admin text-foreground placeholder:text-admin-30 mb-4 outline-none focus:ring-1 focus:ring-neon-pink/40"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 20).map(u => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-4 py-3 bg-admin-overlay rounded-xl border border-admin"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-admin-80 font-medium truncate">{u.name}</p>
                <p className="text-xs text-admin-40 truncate">{u.email}</p>
              </div>
              <Badge className={`text-[10px] border shrink-0 ${roleBadgeClass(u.role)}`}>
                {ROLE_LABELS[u.role]}
              </Badge>
              <Select
                value=""
                onValueChange={newRole =>
                  setPendingReassign({
                    userId: u.id,
                    userName: u.name,
                    currentRole: u.role,
                    newRole: newRole as UserRole,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs bg-admin-input border-admin text-foreground w-36">
                  <SelectValue placeholder="Change role" />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.filter(r => r !== u.role).map(r => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-admin-30 text-center py-6">No users found.</p>
          )}
        </div>
      )}

      <AlertDialog
        open={pendingReassign !== null}
        onOpenChange={open => { if (!open) setPendingReassign(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReassign && (
                <>
                  Change <strong>{pendingReassign.userName}</strong> from{' '}
                  <strong>{ROLE_LABELS[pendingReassign.currentRole]}</strong> to{' '}
                  <strong>{ROLE_LABELS[pendingReassign.newRole]}</strong>?
                  This takes effect immediately.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReassign}
              disabled={reassignMutation.isPending}
              className="bg-neon-pink hover:bg-neon-pink/90 text-white"
            >
              {reassignMutation.isPending ? 'Saving…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
