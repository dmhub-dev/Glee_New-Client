import InvitePanel from './components/InvitePanel'
import RoleReassignPanel from './components/RoleReassignPanel'
import UsersTable from './components/UsersTable'

export default function UsersTab() {
  return (
    <div className="space-y-8">
      <InvitePanel />
      <RoleReassignPanel />
      <UsersTable />
    </div>
  )
}
