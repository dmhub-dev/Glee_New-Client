import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Ticket, FileText, Calendar, BarChart2, Image, MessageSquare, LogOut, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@glee/ui'
import { useAdminUser } from '../../app/providers'
import { useAuth } from '../../lib/auth/AuthContext'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, active: true },
  { label: 'Events', to: '/dashboard/events', icon: CalendarDays, active: true },
  { label: 'Bookings', to: '/bookings', icon: Ticket, active: false },
  { label: 'Invoices', to: '/invoices', icon: FileText, active: false },
  { label: 'Calendar', to: '/dashboard/calendar', icon: Calendar, active: true },
  { label: 'Financials', to: '/financials', icon: BarChart2, active: false },
  { label: 'Gallery', to: '/gallery', icon: Image, active: false },
  { label: 'Feedback', to: '/feedback', icon: MessageSquare, active: false },
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
  const initials = user.name.split(' ').map((n: string) => n[0]).join('')

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
        isCollapsed ? 'w-14' : 'w-60',
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
          isCollapsed ? 'px-3 py-4 justify-center' : 'px-6 py-5 justify-between'
        )}>
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-lg bg-neon-pink flex items-center justify-center shrink-0">
              <span className="text-white font-black text-base leading-none">G</span>
            </div>
          ) : (
            <>
              <img src="/glee-logo-final.svg" alt="Glee" className="h-8" />
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
          {NAV_ITEMS.map(item => (
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

        {/* User chip */}
        {isCollapsed ? (
          <div className="py-4 border-t border-admin flex items-center justify-center">
            <div
              className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center text-neon-pink text-xs font-bold"
              title={user.name}
            >
              {initials}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 border-t border-admin">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center text-neon-pink text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-admin-90 truncate">{user.name}</p>
                <p className="text-xs text-admin-40 capitalize">{user.role}</p>
              </div>
              <button onClick={handleLogout} title="Sign out" className="text-admin-30 hover:text-neon-pink transition-colors shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
