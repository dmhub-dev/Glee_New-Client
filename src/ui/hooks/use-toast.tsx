import * as React from 'react'
import { toast as notify, type Id } from 'react-toastify'
import type { ToastActionElement } from '../components/ui/toast'

type ToastVariant = 'default' | 'destructive'

interface ToastInput {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: ToastVariant
}

function renderContent({ title, description }: ToastInput) {
  return (
    <div>
      {title && <p className="text-sm font-semibold">{title}</p>}
      {description && <p className="mt-1 text-sm opacity-80">{description}</p>}
    </div>
  )
}

function toast(props: ToastInput) {
  const id = props.variant === 'destructive'
    ? notify.error(renderContent(props))
    : notify.success(renderContent(props))

  return {
    id: String(id),
    dismiss: () => notify.dismiss(id),
    update: (next: ToastInput & { id?: string }) => notify.update((next.id ?? id) as Id, {
      render: renderContent(next),
      type: next.variant === 'destructive' ? 'error' : 'success',
    }),
  }
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => notify.dismiss(toastId),
  }
}

export { useToast, toast }
