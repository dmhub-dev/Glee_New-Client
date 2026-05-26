import type { ReactNode } from 'react'

interface PageWrapperProps {
  children?: ReactNode
  fullWidthTop?: ReactNode
  fullWidthContent?: ReactNode
}

export default function PageWrapper({ children, fullWidthTop, fullWidthContent }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-glee-bg text-foreground">
      {fullWidthTop}
      {fullWidthContent}
      {children && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      )}
    </div>
  )
}
