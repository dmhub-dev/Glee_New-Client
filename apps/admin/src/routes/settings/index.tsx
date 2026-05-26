import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import UsersTab from './UsersTab'
import RolesTab from './RolesTab'
import CategoriesTab from './CategoriesTab'
import LocationsTab from './LocationsTab'
import ProfileTab from './ProfileTab'

type TabKey = 'users' | 'roles' | 'categories' | 'locations' | 'profile'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'users',      label: 'Users' },
  { key: 'roles',      label: 'Roles & Permissions' },
  { key: 'categories', label: 'Categories' },
  { key: 'locations',  label: 'Locations' },
  { key: 'profile',    label: 'My Profile' },
]

const VALID_TABS = new Set<string>(TABS.map(t => t.key))

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') ?? ''
  const activeTab: TabKey = VALID_TABS.has(rawTab) ? (rawTab as TabKey) : 'users'

  // Normalise missing/invalid tab param to default
  useEffect(() => {
    if (!VALID_TABS.has(rawTab)) {
      setSearchParams({ tab: 'users' }, { replace: true })
    }
  }, [rawTab, setSearchParams])

  function handleTabChange(key: TabKey) {
    setSearchParams({ tab: key })
  }

  return (
    <AdminLayout title="Settings" subtitle="Manage users, roles, categories and your profile">
      <div className="space-y-6">
        {/* Tab nav */}
        <div className="border-b border-admin">
          <nav className="flex gap-1 overflow-x-auto pb-0.5">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-neon-pink text-foreground'
                    : 'border-transparent text-admin-40 hover:text-admin-70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Active tab content */}
        <div>
          {activeTab === 'users'      && <UsersTab />}
          {activeTab === 'roles'      && <RolesTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'locations'  && <LocationsTab />}
          {activeTab === 'profile'    && <ProfileTab />}
        </div>
      </div>
    </AdminLayout>
  )
}
