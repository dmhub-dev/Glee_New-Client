import { useMemo, useState } from 'react'
import { Banknote, Clock, HandCoins, WalletCards } from 'lucide-react'
import {
  ApiError,
  useAdminEvents,
  useCancelVendorPayoutRequest,
  useCreateVendorPayoutRequest,
  useUpdateVendorPayoutProfile,
  useVendorEventEarnings,
  useVendorPayoutProfile,
  useVendorPayoutRequests,
} from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import { Button, Input, Skeleton, useToast } from '@glee/ui'
import PayoutMetricCard from './components/PayoutMetricCard'
import PayoutProfileForm from './components/PayoutProfileForm'
import PayoutRequestTable from './components/PayoutRequestTable'
import { canManageVendorPayouts, formatKes } from './utils'

export default function VendorPayoutsPage() {
  const user = useAdminUser()
  const canManage = canManageVendorPayouts(user.role)
  const { toast } = useToast()
  const { data: profile, error: profileError } = useVendorPayoutProfile()
  const { data: requests = [], isLoading: requestsLoading } = useVendorPayoutRequests()
  const { data: events = [], isLoading: eventsLoading } = useAdminEvents({ vendorScoped: true })
  const [selectedEventId, setSelectedEventId] = useState('')
  const selectedEvent = events.find(event => event.id === selectedEventId) ?? events[0]
  const eventId = selectedEvent?.id ?? ''
  const { data: earnings, isLoading: earningsLoading } = useVendorEventEarnings(eventId, Boolean(eventId))
  const updateProfile = useUpdateVendorPayoutProfile()
  const createRequest = useCreateVendorPayoutRequest(eventId)
  const cancelRequest = useCancelVendorPayoutRequest()
  const [requestAmount, setRequestAmount] = useState('')

  const missingProfile = profileError instanceof ApiError && profileError.status === 404
  const verifiedProfile = profile?.status === 'VERIFIED'
  const requestDisabled = !canManage || !verifiedProfile || !earnings || earnings.availableForPayout <= 0 || createRequest.isPending

  const totals = useMemo(() => {
    return requests.reduce((acc, request) => {
      acc.requested += request.requestedAmount
      acc.approved += request.approvedAmount ?? 0
      acc.paid += request.paidAmount ?? 0
      return acc
    }, { requested: 0, approved: 0, paid: 0 })
  }, [requests])

  async function handleCreateRequest() {
    const amount = Number(requestAmount)
    if (!eventId || !Number.isFinite(amount) || amount <= 0) return
    try {
      await createRequest.mutateAsync({ amount })
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

  return (
    <AdminLayout title="Payouts" subtitle={canManage ? 'Manage payout profile and request event payouts' : 'Read-only payout status for your vendor account'}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {earningsLoading || requestsLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />) : (
            <>
              <PayoutMetricCard label="Available" value={formatKes(earnings?.availableForPayout ?? 0)} detail={selectedEvent?.title ?? 'Select an event'} icon={HandCoins} />
              <PayoutMetricCard label="Net Payable" value={formatKes(earnings?.vendorNetPayable ?? 0)} detail="After Glee terms and visible adjustments" icon={WalletCards} />
              <PayoutMetricCard label="Pending Requests" value={formatKes(earnings?.pendingPayoutAmount ?? totals.requested - totals.paid)} detail={`${requests.length} total requests`} icon={Clock} />
              <PayoutMetricCard label="Paid Out" value={formatKes(earnings?.paidOutAmount ?? totals.paid)} detail="Recorded payouts" icon={Banknote} />
            </>
          )}
        </div>

        <PayoutProfileForm
          profile={missingProfile ? null : profile}
          readOnly={!canManage}
          isSaving={updateProfile.isPending}
          onSubmit={payload => updateProfile.mutate(payload, {
            onSuccess: () => toast({ title: 'Payout details submitted for verification' }),
            onError: error => toast({
              title: 'Could not save payout details',
              description: error instanceof Error ? error.message : 'Please try again.',
              variant: 'destructive',
            }),
          })}
        />

        <section className="rounded-lg border border-admin bg-admin-surface p-5 shadow-admin">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-heading text-base font-bold text-foreground">Event Earnings</h2>
              <p className="mt-1 text-sm text-admin-40">Vendor view shows payable amounts only. Glee platform revenue is not shown here.</p>
            </div>
            <select
              value={eventId}
              onChange={event => setSelectedEventId(event.target.value)}
              className="h-10 rounded-md border border-admin bg-admin-input px-3 text-sm text-foreground"
            >
              {events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}
            </select>
          </div>
          {eventsLoading || earningsLoading ? <Skeleton className="h-32 rounded-lg" /> : (
            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="rounded-lg border border-admin bg-admin-overlay p-4">
                <p className="text-xs text-admin-40">Available for payout</p>
                <p className="mt-1 font-heading text-3xl font-black text-neon-pink">{formatKes(earnings?.availableForPayout ?? 0)}</p>
                <p className="mt-2 text-sm text-admin-40">
                  Paid out: {formatKes(earnings?.paidOutAmount ?? 0)} · Pending: {formatKes(earnings?.pendingPayoutAmount ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-admin bg-admin-overlay p-4">
                <p className="text-sm font-semibold text-admin-90">Request Payout</p>
                <Input
                  value={requestAmount}
                  onChange={event => setRequestAmount(event.target.value)}
                  type="number"
                  min={1}
                  disabled={requestDisabled}
                  placeholder="Amount in KES"
                  className="mt-3 border-admin bg-admin-input"
                />
                <Button onClick={handleCreateRequest} disabled={requestDisabled} className="mt-3 w-full bg-neon-pink text-white hover:bg-neon-pink/90">
                  Request Payout
                </Button>
                {!verifiedProfile && <p className="mt-2 text-xs text-amber-300">Verified payout profile is required before requesting payouts.</p>}
                {!canManage && <p className="mt-2 text-xs text-admin-40">Vendor staff can view payout status but cannot request payouts.</p>}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">Payout Requests</h2>
            <p className="mt-1 text-sm text-admin-40">Track request status across your vendor events.</p>
          </div>
          <PayoutRequestTable
            requests={requests}
            canCancel={canManage}
            onCancel={request => cancelRequest.mutate({ id: request.id, reason: 'Cancelled by vendor' })}
          />
        </section>
      </div>
    </AdminLayout>
  )
}
