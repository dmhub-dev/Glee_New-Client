import type { ReactNode } from 'react'
import Navbar from './Navbar'

interface PageWrapperProps {
  children: ReactNode
  fullWidthTop?: ReactNode
}

export default function PageWrapper({ children, fullWidthTop }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-glee-bg text-foreground">
      <Navbar />
      <div className="pt-16">
        {fullWidthTop}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
