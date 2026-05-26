import FeatureFlagsPanel from './components/FeatureFlagsPanel'
import RoleReassignPanel from './components/RoleReassignPanel'

export default function RolesTab() {
  return (
    <div className="space-y-8">
      <FeatureFlagsPanel />
      <RoleReassignPanel />
    </div>
  )
}
