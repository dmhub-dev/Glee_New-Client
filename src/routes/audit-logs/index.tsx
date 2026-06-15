import { useMemo, useState } from 'react'
import { Activity, Filter, ShieldAlert } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@glee/ui'
import { useAuditLogs, useUsers } from '@glee/api'
import { ENABLE_RESERVATIONS } from '../../config/features'

const ENTITY_OPTIONS = [
  'User',
  'UserInvitation',
  'Role',
  'Permission',
  'Event',
  'Location',
  'Category',
  'Booking',
  'Payment',
  'Wallet',
]

const visibleEntityOptions = ENTITY_OPTIONS.filter(option => ENABLE_RESERVATIONS || option !== 'Booking')

const ACTION_OPTIONS = [
  'users.invite',
  'users.invite_accept',
  'users.invite_resend',
  'users.invite_revoke',
  'users.update',
  'users.delete',
  'roles.permissions_update',
  'locations.create',
  'locations.update',
  'locations.delete',
  'events.create',
  'events.update',
  'events.delete',
]

function formatDate(value: string) {
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

export default function AuditLogsPage() {
  const [action, setAction] = useState('all')
  const [entity, setEntity] = useState('all')
  const [actorId, setActorId] = useState('all')
  const [page, setPage] = useState(1)

  const filters = useMemo(() => ({
    action: action === 'all' ? '' : action,
    entity: entity === 'all' ? '' : entity,
    actorId: actorId === 'all' ? '' : actorId,
    page,
    limit: 50,
  }), [action, actorId, entity, page])

  const { data, isLoading, isError, error } = useAuditLogs(filters)
  const { data: users } = useUsers()
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const hasNextPage = data ? data.page * data.limit < data.total : false

  function resetFilters() {
    setAction('all')
    setEntity('all')
    setActorId('all')
    setPage(1)
  }

  return (
    <AdminLayout title="Audit Logs" subtitle="Track platform changes and sensitive account activity">
      <div className="space-y-6">
        <section className="rounded-lg border border-admin bg-admin-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-neon-pink" />
            <h2 className="text-sm font-semibold text-admin-90">Filters</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Select value={action} onValueChange={value => { setAction(value); setPage(1) }}>
              <SelectTrigger className="bg-admin-input border-admin text-foreground">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entity} onValueChange={value => { setEntity(value); setPage(1) }}>
              <SelectTrigger className="bg-admin-input border-admin text-foreground">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {visibleEntityOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actorId} onValueChange={value => { setActorId(value); setPage(1) }}>
              <SelectTrigger className="bg-admin-input border-admin text-foreground">
                <SelectValue placeholder="Actor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {(users ?? []).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name} - {user.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={resetFilters} className="border-admin">
              Clear
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-admin bg-admin-surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-admin px-4 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-neon-pink" />
              <h2 className="text-sm font-semibold text-admin-90">Recent activity</h2>
            </div>
            <Badge variant="outline" className="border-admin text-admin-50">
              {total} records
            </Badge>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex items-center gap-3 p-6 text-sm text-red-400">
              <ShieldAlert className="h-5 w-5" />
              <span>{error instanceof Error ? error.message : 'Unable to load audit logs'}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-admin-40">
              No audit logs match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">Entity ID</th>
                    <th className="px-4 py-3 font-medium">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin">
                  {items.map(log => (
                    <tr key={log.id} className="align-top hover:bg-admin-overlay/60">
                      <td className="whitespace-nowrap px-4 py-3 text-admin-60">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3">
                        {log.actor ? (
                          <div>
                            <p className="font-medium text-admin-90">{log.actor.name}</p>
                            <p className="text-xs text-admin-40">{log.actor.email}</p>
                          </div>
                        ) : (
                          <span className="text-admin-30">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="border border-neon-pink/30 bg-neon-pink/10 text-neon-pink">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-admin-70">{log.entity}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 font-mono text-xs text-admin-40">
                        {log.entityId ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <pre className="max-h-24 max-w-[360px] overflow-auto whitespace-pre-wrap rounded-md bg-admin-input p-2 font-mono text-xs text-admin-50">
                          {formatMetadata(log.metadata)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-admin px-4 py-3 text-sm text-admin-40">
            <span>Page {data?.page ?? page}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="border-admin"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!hasNextPage}
                onClick={() => setPage(p => p + 1)}
                className="border-admin"
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
