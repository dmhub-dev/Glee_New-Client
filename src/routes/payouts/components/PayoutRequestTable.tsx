import type { AdminPayoutRequest, VendorPayoutRequest } from '@glee/api'
import { Button } from '@glee/ui'
import { formatDateTime, formatKes, isVendorCancellableStatus } from '../utils'
import PayoutStatusBadge from './PayoutStatusBadge'

export default function PayoutRequestTable({
  requests,
  showAdminColumns = false,
  canCancel = false,
  onCancel,
  onSelect,
}: {
  requests: Array<VendorPayoutRequest | AdminPayoutRequest>
  showAdminColumns?: boolean
  canCancel?: boolean
  onCancel?: (request: VendorPayoutRequest | AdminPayoutRequest) => void
  onSelect?: (request: VendorPayoutRequest | AdminPayoutRequest) => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-admin bg-admin-surface">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-admin-overlay text-left text-xs uppercase tracking-wide text-admin-40">
          <tr>
            <th className="px-4 py-3 font-medium">Request</th>
            <th className="px-4 py-3 font-medium">Event</th>
            <th className="px-4 py-3 font-medium">Requested</th>
            <th className="px-4 py-3 font-medium">Approved</th>
            <th className="px-4 py-3 font-medium">Paid</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
            {showAdminColumns && <th className="px-4 py-3 font-medium">Reference</th>}
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-admin">
          {requests.map(request => {
            const adminRequest = request as AdminPayoutRequest
            return (
              <tr key={request.id} className="hover:bg-admin-overlay/50">
                <td className="px-4 py-3 font-mono text-xs text-admin-70">{request.id.slice(0, 12)}</td>
                <td className="px-4 py-3 font-mono text-xs text-admin-50">{request.eventId.slice(0, 12)}</td>
                <td className="px-4 py-3 font-mono text-admin-70">{formatKes(request.requestedAmount)}</td>
                <td className="px-4 py-3 font-mono text-admin-70">{request.approvedAmount === null ? '-' : formatKes(request.approvedAmount)}</td>
                <td className="px-4 py-3 font-mono text-admin-70">{request.paidAmount === null ? '-' : formatKes(request.paidAmount)}</td>
                <td className="px-4 py-3"><PayoutStatusBadge status={request.status} /></td>
                <td className="px-4 py-3 text-admin-50">{formatDateTime(request.createdAt)}</td>
                {showAdminColumns && <td className="px-4 py-3 font-mono text-xs text-admin-50">{adminRequest.transactionReference ?? '-'}</td>}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {onSelect && <Button size="sm" variant="ghost" onClick={() => onSelect(request)}>Details</Button>}
                    {canCancel && isVendorCancellableStatus(request.status) && (
                      <Button size="sm" variant="ghost" onClick={() => onCancel?.(request)} className="text-red-400 hover:text-red-300">
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
          {requests.length === 0 && (
            <tr>
              <td colSpan={showAdminColumns ? 9 : 8} className="px-4 py-10 text-center text-sm text-admin-40">
                No payout requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
