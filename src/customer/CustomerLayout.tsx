import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Home, Search, Ticket, UserCircle, Wallet, LogOut } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage, cn } from '@glee/ui'
import { useAuth } from '../lib/auth/AuthContext'

type CustomerNavItem = {
  label: string
  to: string
  icon: typeof Home
  end?: boolean
  isActive?: (pathname: string) => boolean
}

const navItems = [
  { label: 'Home',    to: '/app',         icon: Home,       end: true },
  {
    label: 'Explore',
    to: '/app/events',
    icon: Search,
    isActive: (pathname: string) =>
      pathname === '/app/events' ||
      (pathname.startsWith('/app/events/') && !pathname.endsWith('/chat')) ||
      (pathname.startsWith('/app/reservations/') && !pathname.startsWith('/app/reservations/detail/')),
  },
  {
    label: 'Tickets',
    to: '/app/tickets',
    icon: Ticket,
    isActive: (pathname: string) =>
      pathname === '/app/tickets' ||
      pathname.startsWith('/app/tickets/') ||
      pathname.startsWith('/app/reservations/detail/') ||
      /^\/app\/events\/[^/]+\/chat$/.test(pathname),
  },
  { label: 'Wallet',  to: '/app/wallet',  icon: Wallet },
  { label: 'Profile', to: '/app/profile', icon: UserCircle },
] satisfies CustomerNavItem[]

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
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const isEventDetail = location.pathname.startsWith('/app/events/') && !location.pathname.endsWith('/chat')
  const isReservationBookingDetail = location.pathname.startsWith('/app/reservations/detail/')
  const isReservationVenueDetail = location.pathname.startsWith('/app/reservations/') && !isReservationBookingDetail
  const hideNav = isEventDetail || isReservationVenueDetail

  const initials = (user?.name ?? 'U')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(p => p[0].toUpperCase()).join('')

  return (
    <div className="min-h-screen bg-[#050017] text-white selection:bg-neon-pink/30 lg:flex">

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      {!hideNav && (
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col lg:flex"
          style={{ background: 'linear-gradient(180deg,#0c0820 0%,#080012 100%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Logo row — same height as page top content */}
          <div className="flex h-16 shrink-0 items-center px-5">
            <img
              src="/glee-logo-final.svg"
              alt="Glee"
              className="h-7 brightness-0 invert"
              onError={e => {
                const el = e.target as HTMLImageElement
                el.style.display = 'none'
                el.insertAdjacentHTML('afterend', '<span class="text-xl font-black tracking-tight text-white">Glee</span>')
              }}
            />
          </div>

          {/* Nav — starts at the same vertical position as page content */}
          <nav className="flex-1 px-3 pt-1 space-y-0.5">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {({ isActive }) => {
                  const active = item.isActive ? item.isActive(location.pathname) : isActive
                  return (
                    <span className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                      active
                        ? 'bg-neon-pink/12 text-neon-pink'
                        : 'text-white/45 hover:bg-white/5 hover:text-white',
                    )}>
                      <item.icon
                        className={cn('h-[18px] w-[18px] shrink-0 transition-colors', active ? 'text-neon-pink' : 'text-white/35 group-hover:text-white/70')}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      {item.label}
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neon-pink" />
                      )}
                    </span>
                  )
                }}
              </NavLink>
            ))}
          </nav>

          {/* User strip at bottom */}
          <div className="shrink-0 border-t border-white/6 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                onClick={() => navigate('/app/profile')}
              >
                <Avatar className="h-8 w-8 shrink-0 border border-white/10">
                  <AvatarImage src={user?.avatarUrl ?? undefined} className="object-cover" />
                  <AvatarFallback className="bg-neon-pink/20 text-[11px] font-bold text-neon-pink">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white/80">{user?.name ?? 'User'}</p>
                  <p className="truncate text-[11px] text-white/35">{user?.email ?? ''}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => logout().then(() => navigate('/user/login'))}
                className="shrink-0 rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ── Page content ─────────────────────────────────────────────── */}
      <div className={cn('min-h-screen w-full bg-[#050017]', !hideNav && 'lg:pl-64')}>
        <main className={cn('relative min-h-screen overflow-x-hidden', !hideNav && 'pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-0')}>
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

      {/* ── Mobile bottom pill nav ────────────────────────────────────── */}
      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 px-3 lg:hidden">
          <div className="mx-auto flex h-[68px] max-w-[22rem] items-center justify-around rounded-full bg-[#110A23]/72 px-2 shadow-[0_18px_55px_rgba(0,0,0,0.42)] backdrop-blur-2xl md:max-w-[30rem]">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="group flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1"
              >
                {({ isActive }) => {
                  const active = item.isActive ? item.isActive(location.pathname) : isActive
                  return (
                    <>
                      <div className={cn(
                        'rounded-full p-2 transition-all duration-300',
                        active
                          ? 'bg-neon-pink text-white shadow-[0_0_20px_rgba(255,0,122,0.45)]'
                          : 'text-white/50 group-hover:bg-white/10 group-hover:text-white',
                      )}>
                        <item.icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                      </div>
                      <span className={cn(
                        'max-w-12 truncate text-[10px] font-semibold leading-none transition-colors',
                        active ? 'text-white' : 'text-white/45',
                      )}>
                        {item.label}
                      </span>
                    </>
                  )
                }}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
