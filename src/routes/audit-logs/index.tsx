import { useMemo, useState } from 'react'
import { Activity, Search, ShieldAlert } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { Badge, Button, Input, Skeleton } from '@glee/ui'
import { useAuditLogs } from '@glee/api'

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
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [actorId, setActorId] = useState('')
  const [page, setPage] = useState(1)

  const filters = useMemo(() => ({
    action: action.trim(),
    entity: entity.trim(),
    actorId: actorId.trim(),
    page,
    limit: 50,
  }), [action, actorId, entity, page])

  const { data, isLoading, isError, error } = useAuditLogs(filters)
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const hasNextPage = data ? data.page * data.limit < data.total : false

  function resetFilters() {
    setAction('')
    setEntity('')
    setActorId('')
    setPage(1)
  }

  return (
    <AdminLayout title="Audit Logs" subtitle="Track platform changes and sensitive account activity">
      <div className="space-y-6">
        <section className="rounded-lg border border-admin bg-admin-surface p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-30" />
              <Input
                value={action}
                onChange={e => { setAction(e.target.value); setPage(1) }}
                placeholder="Filter by action"
                className="bg-admin-input border-admin pl-9"
              />
            </div>
            <Input
              value={entity}
              onChange={e => { setEntity(e.target.value); setPage(1) }}
              placeholder="Filter by entity"
              className="bg-admin-input border-admin"
            />
            <Input
              value={actorId}
              onChange={e => { setActorId(e.target.value); setPage(1) }}
              placeholder="Filter by actor ID"
              className="bg-admin-input border-admin"
            />
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
