import AdminLayout from '../../components/layout/AdminLayout'
import RolesTab from '../settings/RolesTab'

export default function RolesPage() {
  return (
    <AdminLayout title="Roles & Permissions" subtitle="Review every role and manage permission access">
      <RolesTab />
    </AdminLayout>
  )
}
