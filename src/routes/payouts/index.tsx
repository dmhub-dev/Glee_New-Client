import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import { canViewAdminPayouts, canViewVendorPayouts } from './utils'
import VendorPayoutsPage from './VendorPayoutsPage'
import AdminPayoutsPage from './AdminPayoutsPage'

export default function PayoutsPage() {
  const user = useAdminUser()

  if (canViewVendorPayouts(user.role)) return <VendorPayoutsPage />
  if (canViewAdminPayouts(user.role)) return <AdminPayoutsPage />

  return (
    <AdminLayout title="Payouts">
      <div className="rounded-2xl border border-admin bg-admin-surface p-8 text-center text-sm text-admin-40">
        You do not have access to payout tools.
      </div>
    </AdminLayout>
  )
}
