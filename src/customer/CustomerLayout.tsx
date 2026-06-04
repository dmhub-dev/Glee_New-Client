import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Home, Search, Ticket, UserCircle, Wallet } from 'lucide-react'
import { cn } from '@glee/ui'

const navItems = [
  { label: 'Home', to: '/app', icon: Home, end: true },
  { label: 'Explore', to: '/app/events', icon: Search },
  { label: 'Tickets', to: '/app/tickets', icon: Ticket },
  { label: 'Wallet', to: '/app/wallet', icon: Wallet },
  { label: 'Profile', to: '/app/profile', icon: UserCircle },
]

export default function CustomerLayout({
  title,
  subtitle,
  children,
  hidePageHeader = false,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  hidePageHeader?: boolean
}) {
  const location = useLocation()
  const hideNav = location.pathname.startsWith('/app/events/')

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050017] text-white selection:bg-neon-pink/30">
      <div className="mx-auto flex min-h-screen w-full justify-center">
        <main className="relative z-0 min-h-screen w-full overflow-x-hidden bg-[#050017]">
          {!hidePageHeader && (
            <div className="px-4 pb-2 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-neon-pink">Customer account</p>
              <h1 className="mt-2 font-heading text-2xl font-black text-white sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-white/55">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>

      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 px-3">
          <div className="mx-auto flex h-[68px] max-w-[22rem] items-center justify-around rounded-full border border-white/12 bg-[#110A23]/72 px-2 shadow-[0_18px_55px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:max-w-[30rem]">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="group flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1"
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      'rounded-full p-2 transition-all duration-300',
                      isActive ? 'bg-neon-pink text-white shadow-[0_0_20px_rgba(255,0,122,0.45)]' : 'text-white/50 group-hover:bg-white/10 group-hover:text-white',
                    )}
                    >
                      <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                    </div>
                    <span className={cn('max-w-12 truncate text-[10px] font-semibold leading-none transition-colors', isActive ? 'text-white' : 'text-white/45')}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
