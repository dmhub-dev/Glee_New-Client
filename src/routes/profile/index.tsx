import { useNavigate } from 'react-router-dom'
import { ApiError, useVendorPayoutProfile } from '@glee/api'
import { Button } from '@glee/ui'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminUser } from '../../app/providers'
import ProfileTab from '../settings/ProfileTab'

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = useAdminUser()
  const { data: payoutProfile, error: payoutProfileError } = useVendorPayoutProfile({ enabled: user.role === 'vendor' })
  const missingPayoutProfile = payoutProfileError instanceof ApiError && payoutProfileError.status === 404
  const needsPayoutProfileAction = user.role === 'vendor' && (
    missingPayoutProfile ||
    payoutProfile?.status === 'PENDING_VERIFICATION' ||
    payoutProfile?.status === 'REJECTED'
  )

  return (
    <AdminLayout title="My Profile" subtitle="Manage your profile preferences and account security">
      <div className="space-y-5">
        {needsPayoutProfileAction && (
          <section className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-heading text-base font-bold text-foreground">Payout profile needs attention</p>
                <p className="mt-1 text-sm text-amber-100/80">Update payout details from the Payouts workspace so Glee can verify them.</p>
              </div>
              <Button onClick={() => navigate('/dashboard/payouts')} className="bg-neon-pink text-white hover:bg-neon-pink/90">
                Open Payouts
              </Button>
            </div>
          </section>
        )}
        <ProfileTab />
      </div>
    </AdminLayout>
  )
}
