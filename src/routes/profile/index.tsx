import AdminLayout from '../../components/layout/AdminLayout'
import ProfileTab from '../settings/ProfileTab'

export default function ProfilePage() {
  return (
    <AdminLayout title="My Profile" subtitle="Manage your profile preferences and account security">
      <ProfileTab />
    </AdminLayout>
  )
}
