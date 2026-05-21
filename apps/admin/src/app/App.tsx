import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Skeleton } from '@glee/ui'
import ProtectedRoute from '../components/auth/ProtectedRoute'

const LoginPage       = lazy(() => import('../routes/login'))
const DashboardPage   = lazy(() => import('../routes/index'))
const EventsListPage  = lazy(() => import('../routes/events/index'))
const EventFormPage   = lazy(() => import('../routes/events/$eventId'))
const EventDetailPage = lazy(() => import('../routes/events/EventDetail'))
const SettingsPage    = lazy(() => import('../routes/settings/index'))

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-admin-body flex items-center justify-center">
      <div className="space-y-4 w-full max-w-lg px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><EventsListPage /></ProtectedRoute>} />
        <Route path="/events/new" element={<ProtectedRoute><EventFormPage /></ProtectedRoute>} />
        <Route path="/events/:eventId/edit" element={<ProtectedRoute><EventFormPage /></ProtectedRoute>} />
        <Route path="/events/:eventId" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}
