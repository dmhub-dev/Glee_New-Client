// apps/admin/src/routes/settings/components/SecuritySection.tsx
import { useState } from 'react'
import { Shield, Monitor, Laptop, Smartphone, MapPin, Clock, LogOut, AlertTriangle } from 'lucide-react'
import { Button, Switch, Skeleton, useToast } from '@glee/ui'
import { useSecurityInfo, useToggle2FA, useRevokeSession, useRevokeAllOtherSessions } from '@glee/api'
import { formatDistanceToNow } from 'date-fns'

function DeviceIcon({ device }: { device: string }) {
  const lower = device.toLowerCase()
  if (lower.includes('mobile') || lower.includes('phone') || lower.includes('ios') || lower.includes('android')) {
    return <Smartphone className="w-4 h-4 text-admin-50" />
  }
  if (lower.includes('tablet') || lower.includes('ipad')) {
    return <Monitor className="w-4 h-4 text-admin-50" />
  }
  return <Laptop className="w-4 h-4 text-admin-50" />
}

export function SecuritySection() {
  const { toast } = useToast()
  const { data: security, isLoading } = useSecurityInfo()
  const toggle2FA       = useToggle2FA()
  const revokeSession   = useRevokeSession()
  const revokeAll       = useRevokeAllOtherSessions()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function handle2FAToggle(enabled: boolean) {
    try {
      await toggle2FA.mutateAsync(enabled)
      toast({ title: enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled' })
    } catch {
      toast({ title: 'Failed to update 2FA settings', variant: 'destructive' })
    }
  }

  async function handleRevoke(sessionId: string) {
    setRevokingId(sessionId)
    try {
      await revokeSession.mutateAsync(sessionId)
      toast({ title: 'Session revoked' })
    } catch {
      toast({ title: 'Failed to revoke session', variant: 'destructive' })
    } finally {
      setRevokingId(null)
    }
  }

  async function handleRevokeAll() {
    try {
      await revokeAll.mutateAsync()
      toast({ title: 'All other sessions revoked' })
    } catch {
      toast({ title: 'Failed to revoke sessions', variant: 'destructive' })
    }
  }

  return (
    <div className="bg-admin-surface border border-admin rounded-2xl shadow-admin overflow-hidden">
      <div className="px-6 py-4 border-b border-admin flex items-center gap-2">
        <Shield className="w-4 h-4 text-neon-pink" />
        <h2 className="font-heading font-bold text-base text-foreground">Security</h2>
      </div>

      <div className="divide-y divide-admin">
        {/* Last login */}
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-admin-40 shrink-0" />
            <div>
              <p className="text-sm font-medium text-admin-80">Last sign-in</p>
              {isLoading ? (
                <Skeleton className="h-4 w-40 mt-1" />
              ) : security?.lastLoginAt ? (
                <p className="text-xs text-admin-50">
                  {formatDistanceToNow(new Date(security.lastLoginAt), { addSuffix: true })}
                  {security.lastLoginIp && (
                    <span className="ml-2 font-mono text-admin-40">{security.lastLoginIp}</span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-admin-40">No record available</p>
              )}
            </div>
          </div>
        </div>

        {/* 2FA */}
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-admin-40 shrink-0" />
            <div>
              <p className="text-sm font-medium text-admin-80">Two-factor authentication</p>
              <p className="text-xs text-admin-50">
                {isLoading
                  ? 'Loading…'
                  : security?.twoFactorEnabled
                    ? 'Active — your account has an extra layer of protection'
                    : 'Disabled — enable to secure your account with a second step'}
              </p>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-5 w-10 rounded-full" />
          ) : (
            <Switch
              checked={security?.twoFactorEnabled ?? false}
              onCheckedChange={handle2FAToggle}
              disabled={toggle2FA.isPending}
              className="data-[state=checked]:bg-neon-pink shrink-0"
            />
          )}
        </div>

        {/* Active sessions */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-admin-40" />
              <p className="text-sm font-medium text-admin-80">Active sessions</p>
            </div>
            {(security?.activeSessions?.filter(s => !s.isCurrent).length ?? 0) > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRevokeAll}
                disabled={revokeAll.isPending}
                className="h-7 text-xs text-red-500/70 hover:text-red-500 hover:bg-red-500/10 gap-1"
              >
                <LogOut className="w-3 h-3" />
                {revokeAll.isPending ? 'Revoking…' : 'Revoke all others'}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (security?.activeSessions ?? []).length === 0 ? (
            <p className="text-xs text-admin-40 py-2">No active sessions found.</p>
          ) : (
            <div className="space-y-2">
              {(security?.activeSessions ?? []).map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-admin-overlay border border-admin"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <DeviceIcon device={session.device} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-admin-80 font-medium truncate">{session.device}</p>
                        {session.isCurrent && (
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-neon-pink/15 text-neon-pink border border-neon-pink/30">
                            This device
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-admin-40">
                        {session.location && (
                          <>
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{session.location}</span>
                            <span>·</span>
                          </>
                        )}
                        <span>
                          {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!session.isCurrent && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revokingId === session.id}
                      className="h-7 w-7 p-0 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isLoading && (security?.activeSessions ?? []).length === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-500/70 mt-2">
              <AlertTriangle className="w-3 h-3" />
              <span>Session data unavailable — contact your administrator.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
