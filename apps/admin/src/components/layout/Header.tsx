import { Bell, Settings, Search } from 'lucide-react'
import { Input } from '@glee/ui'

interface HeaderProps {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 bg-glee-bg border-b border-white/5 flex items-center gap-4 px-6 sticky top-0 z-10">
      <div className="flex-1">
        <h1 className="font-heading font-black text-xl text-foreground leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
      </div>
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
        <Input
          placeholder="Search anything..."
          className="pl-8 h-8 text-sm bg-white/5 border-white/10 rounded-full focus-visible:ring-neon-pink/30"
        />
      </div>
      <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors relative">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-neon-pink rounded-full" />
      </button>
      <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
        <Settings className="w-4 h-4" />
      </button>
    </header>
  )
}
