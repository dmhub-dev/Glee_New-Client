import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { CalendarDays, LayoutDashboard, LogOut, Moon, Sun, Ticket, UserCircle, Wallet } from 'lucide-react'
import { cn } from '@glee/ui'
import { useAuth } from '../lib/auth/AuthContext'
import { useTheme, type Theme } from '../app/providers'

const navItems = [
  { label: 'Dashboard', to: '/app', icon: LayoutDashboard, end: true },
  { label: 'Events', to: '/app/events', icon: CalendarDays },
  { label: 'My Tickets', to: '/app/tickets', icon: Ticket },
  { label: 'Wallet', to: '/app/wallet', icon: Wallet },
  { label: 'Profile', to: '/app/profile', icon: UserCircle },
]

const themeOptions: Array<{ value: Theme; label: string; icon: typeof Moon }> = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
]

export default function CustomerLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-admin-body text-foreground">
      <header className="sticky top-0 z-30 border-b border-admin bg-admin-body/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1680px] items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8 2xl:px-10">
          <NavLink to="/app" className="flex items-center gap-3">
            <img src="/glee-logo-final.svg" alt="Glee" className="h-9 sm:h-11" />
          </NavLink>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-neon-pink/15 text-neon-pink' : 'text-admin-60 hover:bg-admin-overlay hover:text-admin-90',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex rounded-full border border-admin bg-admin-overlay p-1 md:ml-0">
            {themeOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                title={`${option.label} theme`}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors sm:h-8 sm:w-8',
                  theme === option.value ? 'bg-neon-pink text-white shadow-neon' : 'text-admin-50 hover:bg-admin-overlay-lg hover:text-admin-90',
                )}
              >
                <option.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full border border-admin text-admin-60 hover:bg-admin-overlay hover:text-admin-90 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] px-3 pb-28 pt-6 sm:px-6 sm:pb-8 sm:py-8 lg:px-8 2xl:px-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-neon-pink">Customer account</p>
          <h1 className="mt-2 font-heading text-2xl font-black text-foreground sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-admin-50">{subtitle.replace('{name}', user?.name?.split(' ')[0] ?? 'there')}</p>}
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-admin bg-admin-body/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.28)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-semibold leading-none transition-colors',
                isActive ? 'bg-neon-pink/15 text-neon-pink' : 'text-admin-50 hover:bg-admin-overlay hover:text-admin-80',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate">{item.label === 'My Tickets' ? 'Tickets' : item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
