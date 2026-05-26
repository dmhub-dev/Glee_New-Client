import { useState } from 'react'
import type { UserRole } from '@glee/types'
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Skeleton,
  useToast,
} from '@glee/ui'
import { FEATURE_KEYS, FEATURE_LABELS, type RolePermissions, ASSIGNABLE_ROLES, useRolePermissions, useSetRolePermissions } from '@glee/api'
import { ROLE_LABELS } from './roleConstants'

function buildDefaultPermissions(): RolePermissions {
  return Object.fromEntries(FEATURE_KEYS.map(k => [k, false])) as RolePermissions
}

export default function FeatureFlagsPanel() {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin')
  const [localPerms, setLocalPerms] = useState<RolePermissions | null>(null)

  const { data: serverPermissions, isLoading } = useRolePermissions(selectedRole)
  const saveMutation = useSetRolePermissions(selectedRole)

  const perms = localPerms ?? serverPermissions ?? buildDefaultPermissions()
  const isDirty = localPerms !== null

  function handleRoleChange(role: UserRole) {
    setSelectedRole(role)
    setLocalPerms(null)
  }

  function handleToggle(key: keyof RolePermissions) {
    setLocalPerms(prev => {
      const base = prev ?? serverPermissions ?? buildDefaultPermissions()
      return { ...base, [key]: !base[key] }
    })
  }

  async function handleSave() {
    try {
      await saveMutation.mutateAsync(perms)
      setLocalPerms(null)
      toast({ title: 'Permissions saved', description: `Updated ${ROLE_LABELS[selectedRole]}` })
    } catch {
      toast({ title: 'Failed to save permissions', variant: 'destructive' })
    }
  }

  return (
    <section className="bg-admin-surface border border-admin rounded-2xl p-6 shadow-admin">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="font-heading font-bold text-base text-foreground">Role Feature Flags</h2>
        <div className="flex items-center gap-3">
          <Select value={selectedRole} onValueChange={v => handleRoleChange(v as UserRole)}>
            <SelectTrigger className="h-9 text-sm bg-admin-input border-admin text-foreground w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map(r => (
                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isDirty && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-neon-pink hover:bg-neon-pink/90 text-white"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURE_KEYS.map(key => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3 bg-admin-overlay rounded-xl border border-admin"
            >
              <span className="text-sm text-admin-70">{FEATURE_LABELS[key]}</span>
              <Switch
                checked={perms[key]}
                onCheckedChange={() => handleToggle(key)}
                className="data-[state=checked]:bg-neon-pink"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
