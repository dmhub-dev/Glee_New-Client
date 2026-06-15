import { Link, NavLink } from 'react-router-dom'
import { cn } from '@glee/ui'
import { ENABLE_RESERVATIONS } from '../../../config/features'

const navLinks = [
  { label: 'Events', to: '/events' },
  { label: 'Reservations', to: '/reservations' },
  { label: 'Sign in', to: '/login' },
]

export default function Navbar() {
  const visibleNavLinks = navLinks.filter(link => ENABLE_RESERVATIONS || link.to !== '/reservations')

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-glee-bg/80 px-6 backdrop-blur-md">
      <Link to="/">
        <img src="/glee-logo-final.svg" alt="Glee" className="h-8" />
      </Link>

      <div className="hidden items-center gap-1 lg:flex">
        {visibleNavLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-neon-pink/15 text-neon-pink'
                : 'text-foreground/60 hover:bg-white/8 hover:text-foreground',
            )}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
