import InvitePanel from './components/InvitePanel'
import UsersTable from './components/UsersTable'

export default function UsersTab() {
  return (
    <div className="space-y-8">
      <InvitePanel />
      <UsersTable />
    </div>
  )
}
