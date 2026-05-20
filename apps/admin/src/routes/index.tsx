import AdminLayout from '../components/layout/AdminLayout'
import { useAdminUser } from '../app/providers'

export default function DashboardPage() {
  const user = useAdminUser()
  const firstName = user.name?.split(' ')?.[0] ?? 'Admin'
  return (
    <AdminLayout title="Dashboard" subtitle={`Hello ${firstName}, welcome back!`}>
      <p className="text-white/40">Dashboard coming in next task.</p>
    </AdminLayout>
  )
}
