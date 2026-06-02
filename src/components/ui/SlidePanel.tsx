// Custom slide-in panel that does NOT use Radix UI portals.
// Renders directly in the React tree with a fixed overlay + panel via CSS.
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@glee/ui'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export function SlidePanel({ open, onClose, title, children, width = 'sm:max-w-lg' }: SlidePanelProps) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col w-full bg-admin-dialog shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          width,
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-admin shrink-0">
          <h2 className="font-heading font-bold text-base text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-admin-40 hover:text-admin-80 hover:bg-admin-overlay transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body + footer live here */}
        <div className="flex flex-col flex-1 min-h-0">
          {children}
        </div>
      </div>
    </>
  )
}
