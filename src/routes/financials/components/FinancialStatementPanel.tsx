import { Download, FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'
import {
  downloadFinancialStatementPdf,
  useFinancialStatement,
  useRegenerateFinancialStatement,
  type FinancialStatementPeriodOptions,
  type FinancialStatementPeriodPreset,
  type FinancialStatementScope,
  type FinancialStatementTargetType,
} from '@glee/api'
import { Button, Skeleton, useToast } from '@glee/ui'
import { formatDateTime, formatKes } from '../../payouts/utils'

export default function FinancialStatementPanel({
  targetType,
  targetId,
  scope,
  canGenerate,
  title = 'Financial Statement',
}: {
  targetType: FinancialStatementTargetType
  targetId: string
  scope: FinancialStatementScope
  canGenerate: boolean
  title?: string
}) {
  const { toast } = useToast()
  const [locationPeriod, setLocationPeriod] = useState<FinancialStatementPeriodPreset>('ALL_TIME')
  const [periodDate, setPeriodDate] = useState(() => new Date().toISOString().slice(0, 10))
  const periodOptions: FinancialStatementPeriodOptions | undefined =
    targetType === 'LOCATION'
      ? {
          period: locationPeriod,
          periodDate: locationPeriod === 'ALL_TIME' ? undefined : periodDate,
        }
      : undefined
  const statement = useFinancialStatement(targetType, targetId, scope, Boolean(targetId), periodOptions)
  const regenerate = useRegenerateFinancialStatement(targetType, targetId, scope, periodOptions)
  const [isPreparingPdf, setIsPreparingPdf] = useState(false)
  const data = statement.data

  async function handlePreparePdf() {
    if (!targetId) return

    setIsPreparingPdf(true)
    try {
      if (canGenerate) {
        await regenerate.mutateAsync()
      }
      await downloadFinancialStatementPdf(targetType, targetId, scope, periodOptions)
      toast({ title: canGenerate ? 'Financial statement generated and downloaded' : 'Financial statement downloaded' })
    } catch (error) {
      toast({
        title: canGenerate ? 'Could not generate statement' : 'Could not download statement',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsPreparingPdf(false)
    }
  }

  if (statement.isLoading) return <Skeleton className="h-52 rounded-2xl" />

  return (
    <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
            <FileText className="h-4 w-4 text-neon-pink" />
            {title}
          </h2>
          <p className="mt-1 text-sm text-admin-40">
            {data
              ? `Version ${data.version} generated ${formatDateTime(data.generatedAt)}${data.reportPeriod?.label ? ` · ${data.reportPeriod.label}` : ''}`
              : 'No statement generated yet.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {targetType === 'LOCATION' && (
            <>
              <select
                value={locationPeriod}
                onChange={event => setLocationPeriod(event.target.value as FinancialStatementPeriodPreset)}
                disabled={isPreparingPdf}
                className="h-10 rounded-xl border border-admin bg-admin-input px-3 text-sm text-admin-90 outline-none transition focus:border-neon-pink"
              >
                <option value="ALL_TIME">All time</option>
                <option value="WEEKLY">Weekly report</option>
                <option value="MONTHLY">Monthly report</option>
              </select>
              {locationPeriod !== 'ALL_TIME' && (
                <input
                  type="date"
                  value={periodDate}
                  onChange={event => setPeriodDate(event.target.value)}
                  disabled={isPreparingPdf}
                  className="h-10 rounded-xl border border-admin bg-admin-input px-3 text-sm text-admin-90 outline-none transition focus:border-neon-pink"
                />
              )}
            </>
          )}
          <Button
            onClick={handlePreparePdf}
            disabled={isPreparingPdf || !targetId || (!canGenerate && !data)}
            className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90"
          >
            {isPreparingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isPreparingPdf ? 'Preparing PDF...' : canGenerate ? 'Generate & Download PDF' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {data ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatementMetric label="Total revenue" value={formatKes(data.summary.totalRevenue)} />
          <StatementMetric label="Reservation deposits" value={formatKes(data.summary.reservationDeposits)} />
          <StatementMetric label="Paid out" value={formatKes(data.summary.paidOutAmount)} />
          <StatementMetric label="Available payout" value={formatKes(data.summary.availableForPayout)} />
          {data.summary.gleeCommission !== undefined && (
            <StatementMetric label="Glee commission" value={formatKes(data.summary.gleeCommission)} />
          )}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-admin bg-admin-overlay p-4 text-sm text-admin-40">
          {canGenerate ? 'Generate a statement to snapshot current earnings, payouts, deposits, and notes.' : 'A statement has not been generated for this record yet.'}
        </p>
      )}
    </section>
  )
}

function StatementMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-admin bg-admin-overlay p-3">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-admin-90">{value}</p>
    </div>
  )
}
