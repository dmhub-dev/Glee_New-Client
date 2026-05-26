import { Bell, Settings, Search, Sun, Moon, Menu } from 'lucide-react'
import { Input } from '@glee/ui'
import { useTheme } from '../../app/providers'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  subtitle?: string
  onToggleSidebar?: () => void
}

export default function Header({ title, subtitle, onToggleSidebar }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-admin-body border-b border-admin flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-10">
      {/* Hamburger — mobile only */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-admin-overlay hover:bg-admin-overlay text-admin-60 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="font-heading font-black text-lg lg:text-xl text-foreground leading-none truncate">{title}</h1>
        {subtitle && <p className="text-xs text-admin-40 mt-0.5 hidden sm:block">{subtitle}</p>}
      </div>

      {/* Search — hidden on small screens */}
      <div className="relative hidden md:block w-48 lg:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-admin-30" />
        <Input
          placeholder="Search anything..."
          className="pl-8 h-8 text-sm bg-admin-input border-admin rounded-full focus-visible:ring-neon-pink/30 text-foreground placeholder:text-admin-30"
        />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-admin-overlay hover:bg-admin-overlay-lg border border-admin text-admin-60 hover:text-neon-pink transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <button className="w-8 h-8 flex items-center justify-center rounded-full bg-admin-overlay hover:bg-admin-overlay-lg border border-admin text-admin-60 hover:text-foreground transition-colors relative">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-neon-pink rounded-full" />
      </button>

      <button
        onClick={() => navigate('/dashboard/settings')}
        title="Settings"
        className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-admin-overlay hover:bg-admin-overlay-lg border border-admin text-admin-60 hover:text-foreground transition-colors"
      >
        <Settings className="w-4 h-4" />
      </button>
    </header>
  )
}
