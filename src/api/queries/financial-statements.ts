import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tokens } from '../../utils'
import { apiFetch } from '../client'

const BASE: string = (import.meta as any).env?.VITE_API_BASE_URL ?? ''

export type FinancialStatementTargetType = 'EVENT' | 'LOCATION'
export type FinancialStatementScope = 'admin' | 'vendor'
export type FinancialStatementVisibility = 'ADMIN' | 'VENDOR'
export type FinancialStatementPeriodPreset = 'ALL_TIME' | 'WEEKLY' | 'MONTHLY'

export interface FinancialStatementPeriodOptions {
  period?: FinancialStatementPeriodPreset
  periodDate?: string
}

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
  reportPeriod?: {
    preset: FinancialStatementPeriodPreset
    label: string
    startsAt?: string | null
    endsAt?: string | null
    anchorDate?: string | null
  }
  subject: FinancialStatementSubject
  summary: FinancialStatementSummary
  lineItems: FinancialStatementLineItem[]
  notes: FinancialStatementNote[]
}

type ApiEnvelope<T> = { success: boolean; data: T; message?: string }

export const financialStatementKeys = {
  byTarget: (
    scope: FinancialStatementScope,
    targetType: FinancialStatementTargetType,
    targetId: string,
    options?: FinancialStatementPeriodOptions,
  ) => ['financial-statements', scope, targetType, targetId, options?.period ?? 'ALL_TIME', options?.periodDate ?? ''] as const,
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

function statementQuery(options?: FinancialStatementPeriodOptions) {
  const params = new URLSearchParams()
  if (options?.period) params.set('period', options.period)
  if (options?.periodDate) params.set('periodDate', options.periodDate)
  const query = params.toString()
  return query ? `?${query}` : ''
}

function fallbackFinancialStatementPdfFilename(
  targetType: FinancialStatementTargetType,
  targetId: string,
) {
  return `${targetType.toLowerCase()}-${targetId}-financial-statement.pdf`
}

export function resolveFinancialStatementPdfFilename(
  contentDisposition: string | null,
  fallbackFilename: string,
) {
  if (!contentDisposition) return fallbackFilename

  const encodedMatch = contentDisposition.match(
    /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i,
  )
  if (encodedMatch?.[1]) {
    const encodedFilename = encodedMatch[1].trim().replace(/^"|"$/g, '')
    try {
      return sanitizePdfFilename(
        decodeURIComponent(encodedFilename),
        fallbackFilename,
      )
    } catch {
      return sanitizePdfFilename(encodedFilename, fallbackFilename)
    }
  }

  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i)
  if (quotedMatch?.[1]) {
    return sanitizePdfFilename(quotedMatch[1], fallbackFilename)
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i)
  return sanitizePdfFilename(plainMatch?.[1], fallbackFilename)
}

function sanitizePdfFilename(
  filename: string | undefined,
  fallbackFilename: string,
) {
  const cleaned = filename?.replace(/[/\\?%*:|"<>]/g, '-').trim()
  if (!cleaned) return fallbackFilename
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`
}

export async function getFinancialStatement(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
  options?: FinancialStatementPeriodOptions,
): Promise<FinancialStatementSnapshot | null> {
  return apiFetch<ApiEnvelope<FinancialStatementSnapshot | null>>(
    statementBasePath(scope, targetType, targetId) + statementQuery(options),
  ).then(res => res.data)
}

export async function regenerateFinancialStatement(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
  options?: FinancialStatementPeriodOptions,
): Promise<FinancialStatementSnapshot> {
  return apiFetch<ApiEnvelope<FinancialStatementSnapshot>>(
    statementBasePath(scope, targetType, targetId) + '/regenerate' + statementQuery(options),
    {
      method: 'POST',
    },
  ).then(res => res.data)
}

export async function downloadFinancialStatementPdf(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
  options?: FinancialStatementPeriodOptions,
): Promise<void> {
  const accessToken = tokens.getAccess()
  const response = await fetch(`${BASE}${statementBasePath(scope, targetType, targetId)}/download${statementQuery(options)}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const fallbackFilename = fallbackFinancialStatementPdfFilename(
    targetType,
    targetId,
  )
  link.href = url
  link.download = resolveFinancialStatementPdfFilename(
    response.headers.get('content-disposition'),
    fallbackFilename,
  )
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
  options?: FinancialStatementPeriodOptions,
) {
  return useQuery({
    queryKey: financialStatementKeys.byTarget(scope, targetType, targetId, options),
    queryFn: () => getFinancialStatement(targetType, targetId, scope, options),
    enabled: enabled && Boolean(targetId),
  })
}

export function useRegenerateFinancialStatement(
  targetType: FinancialStatementTargetType,
  targetId: string,
  scope: FinancialStatementScope,
  options?: FinancialStatementPeriodOptions,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => regenerateFinancialStatement(targetType, targetId, scope, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialStatementKeys.byTarget(scope, targetType, targetId, options) })
    },
  })
}
