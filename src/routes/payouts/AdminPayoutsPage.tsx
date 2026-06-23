import { useMemo, useState } from 'react'
import { Banknote, CheckCircle2, HandCoins, ShieldCheck } from 'lucide-react'
import {
  useAdminPayoutRequests,
  useApprovePayoutRequest,
  useCancelAdminPayoutRequest,
  useMarkPayoutRequestPaid,
  useRejectPayoutRequest,
  useUpsertVendorCommission,
  useUsers,
  useVerifyVendorPayoutProfile,
} from '@glee/api'
import type { AdminPayoutRequest, CommissionType, PayoutMethod, PayoutTimingType } from '@glee/api'
import AdminLayout from '../../components/layout/AdminLayout'
import { Button, Input, Label, Skeleton, Textarea, useToast } from '@glee/ui'
import PayoutMetricCard from './components/PayoutMetricCard'
import PayoutRequestTable from './components/PayoutRequestTable'
import { formatKes } from './utils'

export default function AdminPayoutsPage() {
  const { toast } = useToast()
  const { data: requests = [], isLoading } = useAdminPayoutRequests()
  const { data: users = [] } = useUsers()
  const vendors = users.filter(user => user.role === 'vendor')
  const [selectedRequest, setSelectedRequest] = useState<AdminPayoutRequest | null>(null)
  const [vendorId, setVendorId] = useState('')
  const [commissionType, setCommissionType] = useState<CommissionType>('PERCENTAGE')
  const [commissionValue, setCommissionValue] = useState('15')
  const [payoutTimingType, setPayoutTimingType] = useState<PayoutTimingType>('BEFORE_EVENT')
  const [payoutTimingDays, setPayoutTimingDays] = useState('5')
  const [approvedAmount, setApprovedAmount] = useState('')
  const [requestAdminNote, setRequestAdminNote] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16))
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('BANK_TRANSFER')
  const [transactionReference, setTransactionReference] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const upsertTerms = useUpsertVendorCommission()
  const verifyProfile = useVerifyVendorPayoutProfile()
  const approveRequest = useApprovePayoutRequest()
  const rejectRequest = useRejectPayoutRequest()
  const cancelRequest = useCancelAdminPayoutRequest()
  const markPaid = useMarkPayoutRequestPaid()

  const totals = useMemo(() => {
    return requests.reduce((acc, request) => {
      acc.requested += request.requestedAmount
      acc.approved += request.approvedAmount ?? 0
      acc.paid += request.paidAmount ?? 0
      if (request.status === 'REQUESTED' || request.status === 'ELIGIBLE' || request.status === 'PENDING_ELIGIBILITY') acc.open += 1
      return acc
    }, { requested: 0, approved: 0, paid: 0, open: 0 })
  }, [requests])
  const approvedAmountNumber = Number(approvedAmount)
  const paidAmountNumber = Number(paidAmount)
  const selectedApprovedAmount = Number(selectedRequest?.approvedAmount ?? selectedRequest?.requestedAmount ?? 0)
  const validPaidAt = Boolean(paidAt) && !Number.isNaN(new Date(paidAt).getTime())
  const canApprove = Boolean(
    selectedRequest &&
    Number.isFinite(approvedAmountNumber) &&
    approvedAmountNumber > 0 &&
    (selectedRequest.status === 'REQUESTED' || selectedRequest.status === 'ELIGIBLE'),
  )
  const canReject = Boolean(
    selectedRequest &&
    rejectionReason.trim() &&
    (selectedRequest.status === 'REQUESTED' || selectedRequest.status === 'PENDING_ELIGIBILITY' || selectedRequest.status === 'ELIGIBLE'),
  )
  const canCancel = Boolean(
    selectedRequest &&
    cancellationReason.trim() &&
    (selectedRequest.status === 'REQUESTED' || selectedRequest.status === 'PENDING_ELIGIBILITY' || selectedRequest.status === 'ELIGIBLE' || selectedRequest.status === 'APPROVED'),
  )
  const canMarkPaid = Boolean(
    selectedRequest &&
    selectedRequest.status === 'APPROVED' &&
    paidAmount.trim() &&
    Number.isFinite(paidAmountNumber) &&
    paidAmountNumber > 0 &&
    paidAmountNumber <= selectedApprovedAmount &&
    validPaidAt &&
    payoutMethod &&
    transactionReference.trim(),
  )

  async function saveTerms() {
    if (!vendorId) return
    try {
      await upsertTerms.mutateAsync({
        vendorId,
        payload: {
          type: commissionType,
          value: Number(commissionValue),
          currency: 'KES',
          payoutTimingType,
          payoutTimingDays: Number(payoutTimingDays),
        },
      })
      toast({ title: 'Vendor terms saved' })
    } catch (error) {
      toast({
        title: 'Could not save vendor terms',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function markSelectedPaid() {
    if (!selectedRequest || !canMarkPaid) {
      toast({ title: 'Payment details required', description: 'Paid amount must be up to the approved amount, with paid at, payout method, and transaction reference.', variant: 'destructive' })
      return
    }
    try {
      await markPaid.mutateAsync({
        id: selectedRequest.id,
        payload: {
          paidAmount: paidAmountNumber,
          paidAt: new Date(paidAt).toISOString(),
          payoutMethod,
          transactionReference: transactionReference.trim(),
          adminNote: adminNote.trim() || undefined,
        },
      })
      setTransactionReference('')
      setAdminNote('')
      toast({ title: 'Payout marked paid' })
    } catch (error) {
      toast({
        title: 'Could not mark payout paid',
        description: error instanceof Error ? error.message : 'Please check payment details.',
        variant: 'destructive',
      })
    }
  }

  function approveSelectedRequest() {
    if (!selectedRequest || !canApprove) return
    approveRequest.mutate({
      id: selectedRequest.id,
      payload: {
        approvedAmount: approvedAmountNumber,
        adminNote: requestAdminNote.trim() || undefined,
      },
    })
  }

  function rejectSelectedRequest() {
    if (!selectedRequest || !canReject) return
    rejectRequest.mutate({ id: selectedRequest.id, payload: { reason: rejectionReason.trim() } })
  }

  function cancelSelectedRequest() {
    if (!selectedRequest || !canCancel) return
    cancelRequest.mutate({ id: selectedRequest.id, reason: cancellationReason.trim() })
  }

  return (
    <AdminLayout title="Payouts" subtitle="Review vendor payout requests, terms, verification, and paid history">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />) : (
            <>
              <PayoutMetricCard label="Open Requests" value={totals.open.toLocaleString()} detail={`${requests.length} total requests`} icon={HandCoins} />
              <PayoutMetricCard label="Requested" value={formatKes(totals.requested)} detail="Across payout queue" icon={Banknote} />
              <PayoutMetricCard label="Approved" value={formatKes(totals.approved)} detail="Awaiting payment" icon={CheckCircle2} />
              <PayoutMetricCard label="Paid" value={formatKes(totals.paid)} detail="Audited payout records" icon={ShieldCheck} />
            </>
          )}
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">Payout Queue</h2>
            <p className="mt-1 text-sm text-admin-40">Approve, reject, cancel, and mark vendor payout requests paid.</p>
          </div>
          <PayoutRequestTable
            requests={requests}
            showAdminColumns
            onSelect={request => {
              const nextRequest = request as AdminPayoutRequest
              setSelectedRequest(nextRequest)
              const selectedAmount = String(nextRequest.approvedAmount ?? nextRequest.requestedAmount)
              setApprovedAmount(selectedAmount)
              setRequestAdminNote(nextRequest.adminNote ?? '')
              setRejectionReason('')
              setCancellationReason('')
              setPaidAmount(selectedAmount)
              setTransactionReference('')
              setAdminNote('')
            }}
          />
        </section>

        {selectedRequest && (
          <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin-card">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-heading text-base font-bold text-foreground">Request Details</h2>
                <p className="mt-1 text-sm text-admin-40">Selected request {selectedRequest.id}</p>
              </div>
            </div>
            <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Approved Amount</Label>
                <Input type="number" min={1} value={approvedAmount} onChange={event => setApprovedAmount(event.target.value)} required className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1 md:col-span-2 xl:col-span-3">
                <Label className="text-xs text-admin-50">Approval Note</Label>
                <Input value={requestAdminNote} onChange={event => setRequestAdminNote(event.target.value)} className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-admin-50">Rejection Reason</Label>
                <Textarea value={rejectionReason} onChange={event => setRejectionReason(event.target.value)} placeholder="Required before rejecting" required className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-admin-50">Cancellation Reason</Label>
                <Textarea value={cancellationReason} onChange={event => setCancellationReason(event.target.value)} placeholder="Required before cancelling" required className="border-admin bg-admin-input" />
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
                <Button variant="outline" disabled={!canApprove || approveRequest.isPending} onClick={approveSelectedRequest}>
                  Approve
                </Button>
                <Button variant="outline" disabled={!canReject || rejectRequest.isPending} onClick={rejectSelectedRequest}>
                  Reject
                </Button>
                <Button variant="outline" disabled={!canCancel || cancelRequest.isPending} onClick={cancelSelectedRequest}>
                  Cancel
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Paid Amount</Label>
                <Input type="number" min={1} max={selectedApprovedAmount || undefined} value={paidAmount} onChange={event => setPaidAmount(event.target.value)} required className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Paid At</Label>
                <Input type="datetime-local" value={paidAt} onChange={event => setPaidAt(event.target.value)} required className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Payout Method</Label>
                <select value={payoutMethod} onChange={event => setPayoutMethod(event.target.value as PayoutMethod)} required className="h-10 w-full rounded-xl border border-admin bg-admin-input px-3 text-sm text-foreground">
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-admin-50">Transaction Reference</Label>
                <Input value={transactionReference} onChange={event => setTransactionReference(event.target.value)} required className="border-admin bg-admin-input" />
              </div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4">
                <Label className="text-xs text-admin-50">Admin Note</Label>
                <Textarea value={adminNote} onChange={event => setAdminNote(event.target.value)} className="border-admin bg-admin-input" />
              </div>
            </div>
            <Button onClick={markSelectedPaid} disabled={!canMarkPaid || markPaid.isPending} className="mt-4 bg-neon-pink text-white hover:bg-neon-pink/90">
              Mark Paid
            </Button>
          </section>
        )}

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin-card">
          <div className="mb-4">
            <h2 className="font-heading text-base font-bold text-foreground">Vendor Terms</h2>
            <p className="mt-1 text-sm text-admin-40">Set required vendor commission defaults before events can be approved.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1 xl:col-span-2">
              <Label className="text-xs text-admin-50">Vendor</Label>
              <select value={vendorId} onChange={event => setVendorId(event.target.value)} className="h-10 w-full rounded-xl border border-admin bg-admin-input px-3 text-sm text-foreground">
                <option value="">Select vendor...</option>
                {vendors.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.name} · {vendor.email}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-admin-50">Commission Type</Label>
              <select value={commissionType} onChange={event => setCommissionType(event.target.value as CommissionType)} className="h-10 w-full rounded-xl border border-admin bg-admin-input px-3 text-sm text-foreground">
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_PER_TICKET">Fixed Per Ticket</option>
                <option value="FIXED_PER_EVENT">Fixed Per Event</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-admin-50">Value</Label>
              <Input type="number" value={commissionValue} onChange={event => setCommissionValue(event.target.value)} className="border-admin bg-admin-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-admin-50">Currency</Label>
              <Input value="KES" readOnly className="border-admin bg-admin-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-admin-50">Timing</Label>
              <select value={payoutTimingType} onChange={event => setPayoutTimingType(event.target.value as PayoutTimingType)} className="h-10 w-full rounded-xl border border-admin bg-admin-input px-3 text-sm text-foreground">
                <option value="BEFORE_EVENT">Before Event</option>
                <option value="AFTER_EVENT">After Event</option>
                <option value="MANUAL_ONLY">Manual Only</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-admin-50">Days</Label>
              <Input type="number" value={payoutTimingDays} onChange={event => setPayoutTimingDays(event.target.value)} className="border-admin bg-admin-input" />
            </div>
          </div>
          <Button onClick={saveTerms} disabled={!vendorId || upsertTerms.isPending} className="mt-4 bg-neon-pink text-white hover:bg-neon-pink/90">
            Save Vendor Terms
          </Button>
        </section>

        <section className="rounded-2xl border border-admin bg-admin-surface p-5 shadow-admin-card">
          <h2 className="font-heading text-base font-bold text-foreground">Profile Verification</h2>
          <p className="mt-1 text-sm text-admin-40">Use the selected vendor to mark payout details verified or rejected when backend profile details are available.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={!vendorId} variant="outline" onClick={() => verifyProfile.mutate({ vendorId, payload: { status: 'VERIFIED' } })}>
              Mark Verified
            </Button>
            <Button disabled={!vendorId} variant="outline" onClick={() => verifyProfile.mutate({ vendorId, payload: { status: 'REJECTED', rejectionReason: 'Details could not be verified' } })}>
              Reject Profile
            </Button>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}
