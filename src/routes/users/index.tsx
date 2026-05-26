import AdminLayout from '../../components/layout/AdminLayout'
import UsersTab from '../settings/UsersTab'

export default function UsersPage() {
  return (
    <AdminLayout title="Users" subtitle="Invite users, manage accounts, revoke access, and reassign roles">
      <UsersTab />
    </AdminLayout>
  )
}
