import AdminLayout from '../../components/layout/AdminLayout'
import LocationsTab from '../settings/LocationsTab'

export default function LocationsPage() {
  return (
    <AdminLayout
      title="Locations"
      subtitle="Manage clubs, restaurants, reservation rules, table inventory, and menu documents."
    >
      <LocationsTab />
    </AdminLayout>
  )
}
