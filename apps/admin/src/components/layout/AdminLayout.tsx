import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface AdminLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-glee-bg text-foreground">
      <Sidebar />
      <div className="ml-60 flex flex-col min-h-screen">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
