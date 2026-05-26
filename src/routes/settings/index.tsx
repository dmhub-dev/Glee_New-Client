import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import UsersTab from './UsersTab'
import RolesTab from './RolesTab'
import CategoriesTab from './CategoriesTab'
import LocationsTab from './LocationsTab'
import ProfileTab from './ProfileTab'
import { useAdminUser } from '../../app/providers'

export type TabKey = 'users' | 'roles' | 'categories' | 'locations' | 'profile'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'users',      label: 'Users' },
  { key: 'roles',      label: 'Roles & Permissions' },
  { key: 'categories', label: 'Categories' },
  { key: 'locations',  label: 'Locations' },
  { key: 'profile',    label: 'My Profile' },
]

const VALID_TABS = new Set<string>(TABS.map(t => t.key))

interface SettingsPageProps {
  defaultTab?: TabKey
}

const PAGE_COPY: Record<TabKey, { title: string; subtitle: string }> = {
  users: {
    title: 'Users',
    subtitle: 'Invite users, manage accounts and control access status',
  },
  roles: {
    title: 'Roles & Permissions',
    subtitle: 'Review role access and update permission groups',
  },
  categories: {
    title: 'Settings',
    subtitle: 'Manage categories, locations and platform configuration',
  },
  locations: {
    title: 'Settings',
    subtitle: 'Manage event locations and venue details',
  },
  profile: {
    title: 'Profile',
    subtitle: 'Manage your account details and security preferences',
  },
}

function canUseTab(role: string, tab: TabKey) {
  if (tab === 'roles') return role === 'super_admin'
  if (tab === 'users' || tab === 'categories' || tab === 'locations') {
    return role === 'super_admin' || role === 'admin'
  }
  return true
}

export default function SettingsPage({ defaultTab = 'categories' }: SettingsPageProps) {
  const user = useAdminUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab') ?? ''
  const allowedTabs = TABS.filter(tab => canUseTab(user.role, tab.key))
  const allowedTabKeys = new Set<string>(allowedTabs.map(tab => tab.key))
  const fallbackTab = allowedTabKeys.has(defaultTab) ? defaultTab : 'profile'
  const activeTab: TabKey = VALID_TABS.has(rawTab) && allowedTabKeys.has(rawTab) ? (rawTab as TabKey) : fallbackTab
  const copy = PAGE_COPY[activeTab]

  // Normalise missing/invalid tab param to default
  useEffect(() => {
    if (!VALID_TABS.has(rawTab) || !allowedTabKeys.has(rawTab)) {
      setSearchParams({ tab: fallbackTab }, { replace: true })
    }
  }, [allowedTabKeys, fallbackTab, rawTab, setSearchParams])

  function handleTabChange(key: TabKey) {
    setSearchParams({ tab: key })
  }

  return (
    <AdminLayout title={copy.title} subtitle={copy.subtitle}>
      <div className="space-y-6">
        {/* Tab nav */}
        <div className="border-b border-admin">
          <nav className="flex gap-1 overflow-x-auto pb-0.5">
            {allowedTabs.map(tab => (
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
