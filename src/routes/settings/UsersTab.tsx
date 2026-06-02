import InvitePanel from './components/InvitePanel'
import UsersTable from './components/UsersTable'

export default function UsersTab({ vendorStaffOnly = false }: { vendorStaffOnly?: boolean }) {
  return (
    <div className="space-y-8">
      <InvitePanel vendorStaffOnly={vendorStaffOnly} />
      {!vendorStaffOnly && <UsersTable />}
    </div>
  )
}
