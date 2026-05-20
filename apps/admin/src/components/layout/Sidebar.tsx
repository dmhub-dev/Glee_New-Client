import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Ticket, FileText, Calendar, BarChart2, Image, MessageSquare, LogOut, X } from 'lucide-react'
import { cn } from '@glee/ui'
import { useAdminUser } from '../../app/providers'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, active: true },
  { label: 'Events', to: '/events', icon: CalendarDays, active: true },
  { label: 'Bookings', to: '/bookings', icon: Ticket, active: false },
  { label: 'Invoices', to: '/invoices', icon: FileText, active: false },
  { label: 'Calendar', to: '/calendar', icon: Calendar, active: false },
  { label: 'Financials', to: '/financials', icon: BarChart2, active: false },
  { label: 'Gallery', to: '/gallery', icon: Image, active: false },
  { label: 'Feedback', to: '/feedback', icon: MessageSquare, active: false },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useAdminUser()
  const initials = user.name.split(' ').map((n: string) => n[0]).join('')

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
        'fixed left-0 top-0 h-screen w-60 bg-admin-surface border-r border-admin flex flex-col z-40 transition-transform duration-200',
        'shadow-admin-card',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-admin flex items-center justify-between">
          <img src="/glee-logo-final.svg" alt="Glee" className="h-8" />
          <button
            onClick={onClose}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-admin-40 hover:text-admin-70 hover:bg-admin-overlay transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            item.active ? (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-neon-pink/10 text-neon-pink border-l-2 border-neon-pink -ml-px pl-[11px]'
                    : 'text-admin-50 hover:text-foreground hover:bg-admin-overlay'
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            ) : (
              <div
                key={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-admin-30 cursor-not-allowed"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                <span className="ml-auto text-[10px] bg-admin-overlay border border-admin text-admin-30 rounded px-1.5 py-0.5">
                  Soon
                </span>
              </div>
            )
          ))}
        </nav>

        {/* User chip */}
        <div className="px-4 py-4 border-t border-admin">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center text-neon-pink text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-admin-90 truncate">{user.name}</p>
              <p className="text-xs text-admin-40 capitalize">{user.role}</p>
            </div>
            <LogOut className="w-4 h-4 text-admin-30 hover:text-neon-pink cursor-pointer shrink-0 transition-colors" />
          </div>
        </div>
      </aside>
    </>
  )
}
