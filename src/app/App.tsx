import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Skeleton } from '@glee/ui'
import ProtectedRoute from '../components/auth/ProtectedRoute'

const LoginPage          = lazy(() => import('../routes/login'))
const PublicHomePage     = lazy(() => import('../public/routes/index'))
const PublicEventPage    = lazy(() => import('../public/routes/events/$eventId'))
const PublicCheckoutPage = lazy(() => import('../public/routes/checkout/index'))
const DashboardPage      = lazy(() => import('../routes/index'))
const EventsListPage     = lazy(() => import('../routes/events/index'))
const EventFormPage      = lazy(() => import('../routes/events/$eventId'))
const EventDetailPage    = lazy(() => import('../routes/events/EventDetail'))
const BookingsPage       = lazy(() => import('../routes/bookings/index'))
const MenuPricingPage    = lazy(() => import('../routes/menu-pricing/index'))
const SalesReportsPage   = lazy(() => import('../routes/sales-reports/index'))
const CalendarPage       = lazy(() => import('../routes/calendar/index'))
const SettingsPage       = lazy(() => import('../routes/settings/index'))
const UsersPage          = lazy(() => import('../routes/users/index'))
const RolesPage          = lazy(() => import('../routes/roles/index'))
const ProfilePage        = lazy(() => import('../routes/profile/index'))
const LocationDetailPage = lazy(() => import('../routes/locations/$locationId'))
const AuditLogsPage      = lazy(() => import('../routes/audit-logs/index'))

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
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/events/:eventId" element={<PublicEventPage />} />
        <Route path="/checkout" element={<PublicCheckoutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/events" element={<ProtectedRoute><EventsListPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/new" element={<ProtectedRoute roles={['super_admin', 'admin', 'vendor']}><EventFormPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:eventId/edit" element={<ProtectedRoute><EventFormPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:eventId" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
        <Route
          path="/dashboard/bookings"
          element={
            <ProtectedRoute roles={['super_admin', 'admin', 'vendor', 'vendor_staff', 'customer_support']}>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/menu-pricing"
          element={
            <ProtectedRoute roles={['super_admin', 'admin', 'vendor', 'vendor_staff']}>
              <MenuPricingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/sales-reports"
          element={
            <ProtectedRoute roles={['super_admin', 'admin', 'vendor', 'vendor_staff', 'finance']}>
              <SalesReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/calendar"
          element={
            <ProtectedRoute roles={['super_admin', 'admin', 'operations_manager']}>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/users"
          element={
            <ProtectedRoute roles={['super_admin', 'admin', 'vendor']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/roles"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/audit-logs"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/locations/:locationId"
          element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <LocationDetailPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}
