import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../client'

export interface AuditLogActor {
  id: string
  name: string
  email: string
  role: string
}

export interface AuditLog {
  id: string
  actorId: string | null
  actor: AuditLogActor | null
  action: string
  entity: string
  entityId: string | null
  metadata: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface AuditLogFilters {
  actorId?: string
  action?: string
  entity?: string
  entityId?: string
  page?: number
  limit?: number
}

export interface AuditLogsResult {
  items: AuditLog[]
  total: number
  page: number
  limit: number
}

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  list: (filters: AuditLogFilters) => ['audit-logs', filters] as const,
}

function compactFilters(filters: AuditLogFilters): AuditLogFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as AuditLogFilters
}

export function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResult> {
  const params = new URLSearchParams()
  const clean = compactFilters({ page: 1, limit: 50, ...filters })

  Object.entries(clean).forEach(([key, value]) => {
    params.set(key, String(value))
  })

  return apiFetch<{ success: boolean; data: AuditLogsResult }>(`/api/v1/audit-logs?${params.toString()}`).then(r => ({
    items: r.data?.items ?? [],
    total: r.data?.total ?? 0,
    page: r.data?.page ?? clean.page ?? 1,
    limit: r.data?.limit ?? clean.limit ?? 50,
  }))
}

export function useAuditLogs(filters: AuditLogFilters = {}, options: { enabled?: boolean } = {}) {
  const clean = compactFilters({ page: 1, limit: 50, ...filters })
  return useQuery({
    queryKey: auditLogKeys.list(clean),
    queryFn: () => listAuditLogs(clean),
    enabled: options.enabled ?? true,
  })
}
