import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tokens } from '../../utils'
import { apiFetch } from '../client'

const BASE: string = (import.meta as any).env?.VITE_API_BASE_URL ?? ''

export type FinancialStatementTargetType = 'EVENT' | 'LOCATION'
export type FinancialStatementScope = 'admin' | 'vendor'
export type FinancialStatementVisibility = 'ADMIN' | 'VENDOR'

export interface FinancialStatementSummary {
  grossTicketSales?: number
  reservationDeposits: number
  paidMenuRevenue: number
  refundsAndAdjustments: number
  paidOutAmount: number
  pendingPayoutAmount: number
  vendorNetPayable: number
  availableForPayout: number
  totalRevenue: number
  gleeCommission?: number
  platformRevenue?: number
  rawVendorNet?: number
}

export interface FinancialStatementSubject {
  name: string
  address?: string | null
  startsAt?: string | null
  endsAt?: string | null
  vendorName?: string | null
  vendorEmail?: string | null
}

export interface FinancialStatementLineItem {
  section: 'SALES' | 'RESERVATIONS' | 'PAYOUTS' | 'ADJUSTMENTS' | 'COMMISSION'
  label: string
  quantity?: number
  amount: number
  reference?: string | null
  occurredAt?: string | null
  meta?: Record<string, unknown>
}

export interface FinancialStatementNote {
  label: string
  value: string
  reference?: string | null
}

export interface FinancialStatementSnapshot {
  id?: string
  targetType: FinancialStatementTargetType
  targetId: string
  vendorId?: string | null
  visibility: FinancialStatementVisibility
  version: number
  currency: 'KES'
  title: string
  generatedAt: string
  subject: FinancialStatementSubject
  summary: FinancialStatementSummary
  lineItems: FinancialStatementLineItem[]
  notes: FinancialStatementNote[]
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export const financialStatementKeys = {
  byTarget: (scope: FinancialStatementScope, targetType: FinancialStatementTargetType, targetId: string) =>
    ['financial-statements', scope, targetType, targetId] as const,
}

const statementPathBuilders: Record<FinancialStatementScope, Record<FinancialStatementTargetType, (targetId: string) => string>> = {
  admin: {
    EVENT: targetId => `/api/v1/admin/events/${targetId}/financial-statement`,
    LOCATION: targetId => `/api/v1/admin/locations/${targetId}/financial-statement`,
  },
  vendor: {
    EVENT: targetId => `/api/v1/vendor/events/${targetId}/financial-statement`,
    LOCATION: targetId => `/api/v1/vendor/locations/${targetId}/financial-statement`,
  },
}

function statementBasePath(scope: FinancialStatementScope, targetType: FinancialStatementTargetType, targetId: string) {
  return statementPathBuilders[scope][targetType](targetId)
}

export async function getFinancialStatement(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
): Promise<FinancialStatementSnapshot | null> {
  return apiFetch<ApiEnvelope<FinancialStatementSnapshot | null>>(statementBasePath(scope, targetType, targetId)).then(res => res.data)
}

export async function regenerateFinancialStatement(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
): Promise<FinancialStatementSnapshot> {
  return apiFetch<ApiEnvelope<FinancialStatementSnapshot>>(statementBasePath(scope, targetType, targetId) + '/regenerate', {
    method: 'POST',
  }).then(res => res.data)
}

export async function downloadFinancialStatementPdf(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
): Promise<void> {
  const accessToken = tokens.getAccess()
  const response = await fetch(`${BASE}${statementBasePath(scope, targetType, targetId)}/download`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${targetType.toLowerCase()}-${targetId}-financial-statement.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function useFinancialStatement(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
  enabled = true,
) {
  return useQuery({
    queryKey: financialStatementKeys.byTarget(scope, targetType, targetId),
    queryFn: () => getFinancialStatement(targetType, targetId, scope),
    enabled: enabled && Boolean(targetId),
  })
}

export function useRegenerateFinancialStatement(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => regenerateFinancialStatement(targetType, targetId, scope),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialStatementKeys.byTarget(scope, targetType, targetId) })
    },
  })
}
