import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  FileText,
  Calendar,
  BarChart2,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldCheck,
  ScrollText,
  Settings,
  UserCircle,
} from 'lucide-react'
import { cn } from '@glee/ui'
import { useAdminUser } from '../../app/providers'
import { useAuth } from '../../lib/auth/AuthContext'
import type { UserRole } from '@glee/types'

type NavItem = {
  label: string
  to: string
  icon: typeof LayoutDashboard
  active: boolean
  roles?: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, active: true },
  { label: 'Events', to: '/dashboard/events', icon: CalendarDays, active: true },
  { label: 'Calendar', to: '/dashboard/calendar', icon: Calendar, active: true, roles: ['super_admin', 'admin', 'operations_manager'] },
  { label: 'Roles & Permissions', to: '/dashboard/roles', icon: ShieldCheck, active: true, roles: ['super_admin'] },
  { label: 'Audit Logs', to: '/dashboard/audit-logs', icon: ScrollText, active: true, roles: ['super_admin'] },
  { label: 'Settings', to: '/dashboard/settings', icon: Settings, active: true, roles: ['super_admin', 'admin'] },
  { label: 'Bookings', to: '/dashboard/bookings', icon: Ticket, active: true, roles: ['vendor', 'vendor_staff', 'admin', 'customer_support'] },
  { label: 'Menu & Pricing', to: '/dashboard/menu-pricing', icon: FileText, active: true, roles: ['vendor', 'vendor_staff', 'admin'] },
  { label: 'Sales Reports', to: '/dashboard/sales-reports', icon: BarChart2, active: true, roles: ['vendor', 'vendor_staff', 'admin', 'finance'] },
  { label: 'Financials', to: '/dashboard/financials', icon: BarChart2, active: true, roles: ['super_admin', 'admin', 'finance'] },
]

const ACCOUNT_NAV_ITEMS: NavItem[] = [
  { label: 'Users', to: '/dashboard/users', icon: Users, active: true, roles: ['super_admin', 'admin'] },
  { label: 'Staff', to: '/dashboard/users', icon: Users, active: true, roles: ['vendor'] },
  { label: 'Profile', to: '/dashboard/profile', icon: UserCircle, active: true },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const user = useAdminUser()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const visibleNavItems = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user.role))
  const visibleAccountItems = ACCOUNT_NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user.role))

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'fixed left-0 top-0 h-screen bg-admin-surface border-r border-admin flex flex-col z-40 transition-all duration-200',
        'shadow-admin-card',
        isCollapsed ? 'w-14' : 'w-64',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Collapse toggle — floating pill on right edge, desktop only */}
        <button
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute -right-3 top-[72px] w-6 h-6 items-center justify-center rounded-full bg-admin-surface border border-admin text-admin-40 hover:text-neon-pink hover:border-neon-pink/40 shadow-admin transition-colors z-50"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
        {/* Logo */}
        <div className={cn(
          'border-b border-admin flex items-center',
          isCollapsed ? 'px-3 py-4 justify-center' : 'px-5 py-5 justify-between'
        )}>
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-lg bg-neon-pink flex items-center justify-center shrink-0">
              <span className="text-white font-black text-base leading-none">G</span>
            </div>
          ) : (
            <>
              <img src="/glee-logo-final.svg" alt="Glee" className="h-29 max-w-[160px] object-contain" />
              <button
                onClick={onClose}
                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-admin-40 hover:text-admin-70 hover:bg-admin-overlay transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className={cn('flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto', isCollapsed ? 'px-2' : 'px-3')}>
          {visibleNavItems.map(item => (
            item.active ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={onClose}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  'flex items-center py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  isActive
                    ? 'bg-neon-pink/10 text-neon-pink'
                    : 'text-admin-50 hover:text-foreground hover:bg-admin-overlay'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && item.label}
              </NavLink>
            ) : (
              <div
                key={item.to}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center py-2.5 rounded-lg text-sm font-medium text-admin-30 cursor-not-allowed',
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    {item.label}
                    <span className="ml-auto text-[10px] bg-admin-overlay border border-admin text-admin-30 rounded px-1.5 py-0.5">
                      Soon
                    </span>
                  </>
                )}
              </div>
            )
          ))}
        </nav>

        <div className={cn('border-t border-admin py-3', isCollapsed ? 'px-2' : 'px-3')}>
          <div className="mb-2 flex flex-col gap-0.5">
            {visibleAccountItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={onClose}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => cn(
                  'flex items-center py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
                  isActive
                    ? 'bg-neon-pink/10 text-neon-pink'
                    : 'text-admin-50 hover:text-foreground hover:bg-admin-overlay',
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && item.label}
              </NavLink>
            ))}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : undefined}
            className={cn(
              'flex w-full items-center rounded-lg py-2.5 text-sm font-medium text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400',
              isCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && 'Logout'}
          </button>
        </div>
      </aside>
    </>
  )
}