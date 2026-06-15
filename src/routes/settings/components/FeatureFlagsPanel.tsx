import { useState } from 'react'
import { Check, Lock, Save, ShieldCheck, Smartphone } from 'lucide-react'
import type { UserRole } from '@glee/types'
import { Button, Skeleton, Switch, useToast, cn } from '@glee/ui'
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  type FeatureKey,
  type RolePermissions,
  ASSIGNABLE_ROLES,
  useRolePermissions,
  useRoleSecurityPolicy,
  useSetRolePermissions,
  useSetRoleTwoFactorPolicy,
} from '@glee/api'
import { ROLE_LABELS, roleBadgeClass } from './roleConstants'

const VIEWABLE_ROLES: UserRole[] = ['super_admin', ...ASSIGNABLE_ROLES]

const PERMISSION_GROUPS: { label: string; description: string; keys: FeatureKey[] }[] = [
  {
    label: 'Events',
    description: 'Create, manage and operate event inventory',
    keys: ['manage_events', 'manage_venues', 'manage_menus'],
  },
  {
    label: 'Ticket Operations',
    description: 'Read ticket activity, support customers, and check attendees in',
    keys: ['manage_bookings', 'override_bookings', 'check_in_customers'],
  },
  {
    label: 'Finance',
    description: 'Financial visibility, exports and campaigns',
    keys: ['view_financials', 'export_reports', 'manage_discounts'],
  },
  {
    label: 'People & Platform',
    description: 'Users, vendors and administrative settings',
    keys: ['view_user_profiles', 'approve_vendors', 'access_admin_settings'],
  },
]

function buildDefaultPermissions(): RolePermissions {
  return Object.fromEntries(FEATURE_KEYS.map(k => [k, false])) as RolePermissions
}

function countEnabled(perms?: RolePermissions) {
  if (!perms) return 0
  return FEATURE_KEYS.filter(key => perms[key]).length
}

export default function FeatureFlagsPanel() {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin')
  const [localPerms, setLocalPerms] = useState<RolePermissions | null>(null)

  const { data: serverPermissions, isLoading } = useRolePermissions(selectedRole)
  const { data: securityPolicy, isLoading: securityLoading } = useRoleSecurityPolicy(selectedRole)
  const saveMutation = useSetRolePermissions(selectedRole)
  const twoFactorMutation = useSetRoleTwoFactorPolicy(selectedRole)

  const perms = localPerms ?? serverPermissions ?? buildDefaultPermissions()
  const isDirty = localPerms !== null
  const selectedRoleLocked = selectedRole === 'super_admin'

  function handleRoleChange(role: UserRole) {
    setSelectedRole(role)
    setLocalPerms(null)
  }

  function handleToggle(key: FeatureKey) {
    if (selectedRoleLocked) return
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

  async function handleTwoFactorPolicy(required: boolean) {
    try {
      await twoFactorMutation.mutateAsync(required)
      toast({
        title: required ? '2FA required' : '2FA optional',
        description: `Updated ${ROLE_LABELS[selectedRole]}`,
      })
    } catch {
      toast({ title: 'Failed to update 2FA policy', variant: 'destructive' })
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="rounded-lg border border-admin bg-admin-surface p-4">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-neon-pink" />
          <h2 className="font-heading text-base font-bold text-foreground">Roles</h2>
        </div>

        <div className="space-y-2">
          {VIEWABLE_ROLES.map(role => {
            const active = selectedRole === role
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleRoleChange(role)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  active
                    ? 'border-neon-pink/40 bg-neon-pink/10'
                    : 'border-admin bg-admin-overlay hover:border-admin-md hover:bg-admin-overlay-lg',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={cn('rounded-full border px-2 py-0.5 text-xs font-medium', roleBadgeClass(role))}>
                    {ROLE_LABELS[role]}
                  </span>
                  {role === 'super_admin' && <Lock className="h-3.5 w-3.5 text-admin-40" />}
                </div>
                <p className="mt-2 text-xs text-admin-40">
                  {active && isLoading ? 'Loading permissions...' : `${active ? countEnabled(perms) : 'View'} permission access`}
                </p>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="rounded-lg border border-admin bg-admin-surface">
        <div className="flex flex-col gap-3 border-b border-admin px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base font-bold text-foreground">{ROLE_LABELS[selectedRole]}</h2>
              {selectedRoleLocked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-admin bg-admin-overlay px-2 py-0.5 text-xs text-admin-50">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-admin-50">
              {countEnabled(perms)} of {FEATURE_KEYS.length} permissions enabled
            </p>
          </div>
          {isDirty && !selectedRoleLocked && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save permissions'}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="rounded-lg border border-admin bg-admin-overlay md:col-span-2">
              <div className="flex items-center justify-between gap-4 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neon-pink/10">
                    <Smartphone className="h-4 w-4 text-neon-pink" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-admin-80">Require two-factor authentication</p>
                    <p className="mt-0.5 text-xs text-admin-40">
                      Users with this role must verify email OTP at every login.
                    </p>
                  </div>
                </div>
                {securityLoading ? (
                  <Skeleton className="h-5 w-10 rounded-full" />
                ) : (
                  <Switch
                    checked={securityPolicy?.twoFactorRequired ?? false}
                    onCheckedChange={handleTwoFactorPolicy}
                    disabled={twoFactorMutation.isPending}
                    className="data-[state=checked]:bg-neon-pink"
                  />
                )}
              </div>
            </div>
            {PERMISSION_GROUPS.map(group => (
              <div key={group.label} className="rounded-lg border border-admin bg-admin-overlay">
                <div className="border-b border-admin p-4">
                  <h3 className="text-sm font-semibold text-admin-90">{group.label}</h3>
                  <p className="mt-1 text-xs text-admin-40">{group.description}</p>
                </div>
                <div className="divide-y divide-admin">
                  {group.keys.map(key => (
                    <div key={key} className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-admin-80">{FEATURE_LABELS[key]}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-admin-30">{key}</p>
                      </div>
                      {selectedRoleLocked ? (
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                            perms[key]
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : 'border-admin bg-admin-input text-admin-30',
                          )}
                        >
                          {perms[key] && <Check className="h-4 w-4" />}
                        </span>
                      ) : (
                        <Switch
                          checked={perms[key]}
                          onCheckedChange={() => handleToggle(key)}
                          className="data-[state=checked]:bg-neon-pink"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
