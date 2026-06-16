import { useEffect, useState } from 'react'
import { Banknote, HandCoins, Percent, WalletCards } from 'lucide-react'
import {
  useAdminEventCommission,
  useAdminEventEarnings,
  useCreatePayoutAdjustment,
  useCreateVendorPayoutRequest,
  useUpdateEventCommission,
  useVendorEventEarnings,
  useVendorEventPayoutTerms,
} from '@glee/api'
import type { CommissionType, PayoutTimingType } from '@glee/api'
import type { Event, UserRole } from '@glee/types'
import { Button, Input, Skeleton, Textarea, useToast } from '@glee/ui'
import PayoutMetricCard from '../payouts/components/PayoutMetricCard'
import PayoutRequestTable from '../payouts/components/PayoutRequestTable'
import { canManageVendorPayouts, canViewAdminPayouts, canViewPayoutEarnings, canViewVendorPayouts, formatKes, formatSignedKes } from '../payouts/utils'

export default function EventEarningsPanel({ event, userRole }: { event: Event; userRole: UserRole }) {
  const isAdminView = canViewAdminPayouts(userRole)
  const isVendorView = canViewVendorPayouts(userRole)
  const canViewEarnings = canViewPayoutEarnings(userRole)
  const canVendorRequest = canManageVendorPayouts(userRole)
  const { toast } = useToast()
  const vendorEarnings = useVendorEventEarnings(event.id, isVendorView)
  const vendorTerms = useVendorEventPayoutTerms(event.id, isVendorView)
  const adminEarnings = useAdminEventEarnings(event.id, isAdminView)
  const adminTerms = useAdminEventCommission(event.id, isAdminView)
  const createRequest = useCreateVendorPayoutRequest(event.id)
  const createAdjustment = useCreatePayoutAdjustment()
  const updateCommission = useUpdateEventCommission(event.id)
  const [requestAmount, setRequestAmount] = useState('')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [commissionType, setCommissionType] = useState<CommissionType>('PERCENTAGE')
  const [commissionValue, setCommissionValue] = useState('')
  const [payoutTimingType, setPayoutTimingType] = useState<PayoutTimingType>('BEFORE_EVENT')
  const [payoutTimingDays, setPayoutTimingDays] = useState('5')
  const earnings = isAdminView ? adminEarnings.data : isVendorView ? vendorEarnings.data : undefined
  const terms = isAdminView ? adminTerms.data : isVendorView ? vendorTerms.data : undefined
  const isLoading = isAdminView ? adminEarnings.isLoading || adminTerms.isLoading : isVendorView ? vendorEarnings.isLoading || vendorTerms.isLoading : false
  const commissionLocked = Boolean(terms?.commissionLockedAt)

  useEffect(() => {
    if (!isAdminView || !terms) return
    if (terms.commissionType) setCommissionType(terms.commissionType)
    if (terms.commissionValue !== null && terms.commissionValue !== undefined) setCommissionValue(String(terms.commissionValue))
    setPayoutTimingType(terms.payoutTimingType ?? 'BEFORE_EVENT')
    setPayoutTimingDays(String(terms.payoutTimingDays ?? 5))
  }, [isAdminView, terms])

  async function requestPayout() {
    try {
      await createRequest.mutateAsync({ amount: Number(requestAmount) })
      setRequestAmount('')
      toast({ title: 'Payout request created' })
    } catch (error) {
      toast({
        title: 'Could not request payout',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function addAdjustment() {
    try {
      await createAdjustment.mutateAsync({
        eventId: event.id,
        amount: Number(adjustmentAmount),
        reason: adjustmentReason,
        vendorVisible: true,
      })
      setAdjustmentAmount('')
      setAdjustmentReason('')
      toast({ title: 'Adjustment added' })
    } catch (error) {
      toast({
        title: 'Could not add adjustment',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function saveCommissionOverride() {
    try {
      await updateCommission.mutateAsync({
        type: commissionType,
        value: Number(commissionValue),
        currency: 'KES',
        payoutTimingType,
        payoutTimingDays: Number(payoutTimingDays),
      })
      toast({ title: 'Event commission updated' })
    } catch (error) {
      toast({
        title: 'Could not update commission',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (!canViewEarnings) {
    return (
      <section className="rounded-lg border border-admin bg-admin-surface p-5 text-sm text-admin-40 shadow-admin">
        You do not have access to event payout earnings.
      </section>
    )
  }

  if (isLoading) return <Skeleton className="h-72 rounded-lg" />

  return (
    <section className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PayoutMetricCard
          label={isAdminView ? 'Gross Ticket Base Sales' : 'Net Payable'}
          value={formatKes(isAdminView ? earnings?.grossTicketBaseSales : earnings?.vendorNetPayable)}
          detail="Ticket base price only"
          icon={WalletCards}
        />
        <PayoutMetricCard label="Available Payout" value={formatKes(earnings?.availableForPayout)} detail="Available after pending requests" icon={HandCoins} />
        <PayoutMetricCard label="Pending Payout" value={formatKes(earnings?.pendingPayoutAmount)} detail="Held by active requests" icon={Banknote} />
        <PayoutMetricCard
          label={isAdminView ? 'Glee Commission' : 'Paid Out'}
          value={formatKes(isAdminView ? adminEarnings.data?.gleeCommission : earnings?.paidOutAmount)}
          detail={isAdminView ? 'Platform revenue' : 'Recorded payouts'}
          icon={Percent}
        />
      </div>

      <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
        <h2 className="font-heading text-base font-bold text-foreground">Payout Terms</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow label="Commission Type" value={terms?.commissionType ?? 'Not configured'} />
          <InfoRow label="Commission Value" value={terms?.commissionValue === null ? '-' : String(terms?.commissionValue ?? '-')} />
          <InfoRow label="Timing" value={`${terms?.payoutTimingType ?? 'BEFORE_EVENT'} · ${terms?.payoutTimingDays ?? 5} days`} />
          <InfoRow label="Lock" value={commissionLocked ? 'Locked after first paid ticket' : 'Editable before first paid ticket'} />
        </div>
      </section>

      {isVendorView && (
        <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
          <h2 className="font-heading text-base font-bold text-foreground">Request Payout</h2>
          <p className="mt-1 text-sm text-admin-40">Vendor staff can view this balance but only vendor owners can request payouts.</p>
          <div className="mt-4 flex max-w-md gap-3">
            <Input
              value={requestAmount}
              onChange={inputEvent => setRequestAmount(inputEvent.target.value)}
              disabled={!canVendorRequest || !earnings?.availableForPayout}
              type="number"
              min={1}
              className="border-admin bg-admin-input"
            />
            <Button onClick={requestPayout} disabled={!canVendorRequest || !requestAmount || createRequest.isPending} className="bg-neon-pink text-white hover:bg-neon-pink/90">
              Request Payout
            </Button>
          </div>
        </section>
      )}

      {isAdminView && adminEarnings.data && (
        <>
          <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
            <h2 className="font-heading text-base font-bold text-foreground">Admin Earnings Breakdown</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <InfoRow label="Ticket Commission" value={formatKes(adminEarnings.data.ticketCommission)} />
              <InfoRow label="Fixed Event Commission" value={formatKes(adminEarnings.data.fixedEventCommission)} />
              <InfoRow label="Vendor Net Payable" value={formatKes(adminEarnings.data.vendorNetPayable)} />
              <InfoRow label="Adjustment Total" value={formatSignedKes(adminEarnings.data.adjustmentTotal)} />
            </div>
          </section>

          <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
            <h2 className="font-heading text-base font-bold text-foreground">Payout Requests</h2>
            <div className="mt-4">
              <PayoutRequestTable requests={adminEarnings.data.payoutRequests} showAdminColumns />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
              <h2 className="font-heading text-base font-bold text-foreground">Add Adjustment</h2>
              <div className="mt-4 space-y-3">
                <Input
                  value={adjustmentAmount}
                  onChange={inputEvent => setAdjustmentAmount(inputEvent.target.value)}
                  type="number"
                  placeholder="Amount, e.g. -500 or 1000"
                  className="border-admin bg-admin-input"
                />
                <Textarea value={adjustmentReason} onChange={inputEvent => setAdjustmentReason(inputEvent.target.value)} placeholder="Reason" className="border-admin bg-admin-input" />
                <Button onClick={addAdjustment} disabled={!adjustmentAmount || !adjustmentReason} className="bg-neon-pink text-white hover:bg-neon-pink/90">
                  Add Adjustment
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
              <h2 className="font-heading text-base font-bold text-foreground">Event Commission Override</h2>
              {commissionLocked ? (
                <p className="mt-3 rounded-lg border border-admin bg-admin-overlay px-4 py-3 text-sm text-admin-40">
                  Event commission is locked after the first paid ticket.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  <select value={commissionType} onChange={inputEvent => setCommissionType(inputEvent.target.value as CommissionType)} className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground">
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED_PER_TICKET">Fixed Per Ticket</option>
                    <option value="FIXED_PER_EVENT">Fixed Per Event</option>
                  </select>
                  <Input value={commissionValue} onChange={inputEvent => setCommissionValue(inputEvent.target.value)} type="number" placeholder="Value" className="border-admin bg-admin-input" />
                  <select value={payoutTimingType} onChange={inputEvent => setPayoutTimingType(inputEvent.target.value as PayoutTimingType)} className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground">
                    <option value="BEFORE_EVENT">Before Event</option>
                    <option value="AFTER_EVENT">After Event</option>
                    <option value="MANUAL_ONLY">Manual Only</option>
                  </select>
                  <Input value={payoutTimingDays} onChange={inputEvent => setPayoutTimingDays(inputEvent.target.value)} type="number" className="border-admin bg-admin-input" />
                  <Button onClick={saveCommissionOverride} disabled={!commissionValue} className="bg-neon-pink text-white hover:bg-neon-pink/90">
                    Save Override
                  </Button>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-admin bg-admin-overlay p-3">
      <p className="text-xs text-admin-40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-admin-90">{value}</p>
    </div>
  )
}
