import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@glee/ui'
import Sidebar from './Sidebar'
import Header from './Header'

interface AdminLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem('glee-admin-sidebar-collapsed') === 'true'
  )

  function toggleCollapse() {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('glee-admin-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <div className="min-h-screen bg-admin-body text-foreground">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className={cn(
        'flex flex-col min-h-screen transition-all duration-200',
        sidebarCollapsed ? 'lg:ml-14' : 'lg:ml-60'
      )}>
        <Header
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
