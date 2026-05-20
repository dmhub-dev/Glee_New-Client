import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Skeleton } from '@glee/ui'

const DashboardPage = lazy(() => import('../routes/index'))
const EventsListPage = lazy(() => import('../routes/events/index'))
const EventFormPage = lazy(() => import('../routes/events/$eventId'))

function PageSkeleton() {
  return (
    <div className="ml-60 pt-16 p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/events" element={<EventsListPage />} />
        <Route path="/events/new" element={<EventFormPage />} />
        <Route path="/events/:eventId/edit" element={<EventFormPage />} />
      </Routes>
    </Suspense>
  )
}
