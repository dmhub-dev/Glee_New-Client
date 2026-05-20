import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Ticket, FileText, Calendar, BarChart2, Image, MessageSquare, LogOut } from 'lucide-react'
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

export default function Sidebar() {
  const user = useAdminUser()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[#0f0f15] border-r border-white/5 flex flex-col z-20">
      <div className="px-6 py-6 border-b border-white/5">
        <img src="/glee-logo-final.svg" alt="Glee" className="h-9" />
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          item.active ? (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-neon-pink/10 text-neon-pink border-l-2 border-neon-pink -ml-px pl-[11px]'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ) : (
            <div
              key={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/20 cursor-not-allowed"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              <span className="ml-auto text-[10px] bg-white/5 text-white/30 rounded px-1.5 py-0.5">Soon</span>
            </div>
          )
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center text-neon-pink text-xs font-bold shrink-0">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/90 truncate">{user.name}</p>
            <p className="text-xs text-white/40 capitalize">{user.role}</p>
          </div>
          <LogOut className="w-4 h-4 text-white/30 hover:text-white/60 cursor-pointer shrink-0" />
        </div>
      </div>
    </aside>
  )
}
