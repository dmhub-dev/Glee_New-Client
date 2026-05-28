import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { UserRole } from '@glee/types'
import { Skeleton } from '@glee/ui'
import ProtectedRoute from '../components/auth/ProtectedRoute'

const LoginPage          = lazy(() => import('../routes/login'))
const SignupPage         = lazy(() => import('../routes/signup'))
const AcceptInvitationPage = lazy(() => import('../routes/invitations/accept'))
const CompleteProfilePage  = lazy(() => import('../routes/complete-profile'))
const PublicHomePage     = lazy(() => import('../public/routes/index'))
const PublicEventPage    = lazy(() => import('../public/routes/events/$eventId'))
const PublicCheckoutPage = lazy(() => import('../public/routes/checkout/index'))
const EventTicketConfirmPage = lazy(() => import('../public/routes/payment/EventTicketConfirm'))
const DashboardPage      = lazy(() => import('../routes/index'))
const EventsListPage     = lazy(() => import('../routes/events/index'))
const EventFormPage      = lazy(() => import('../routes/events/$eventId'))
const EventDetailPage    = lazy(() => import('../routes/events/EventDetail'))
const EventAttendeesPage = lazy(() => import('../routes/events/EventAttendees'))
const BookingsPage       = lazy(() => import('../routes/bookings/index'))
const BookingEventPage   = lazy(() => import('../routes/bookings/$eventId'))
const MenuPricingPage    = lazy(() => import('../routes/menu-pricing/index'))
const SalesReportsPage   = lazy(() => import('../routes/sales-reports/index'))
const CalendarPage       = lazy(() => import('../routes/calendar/index'))
const SettingsPage       = lazy(() => import('../routes/settings/index'))
const UsersPage          = lazy(() => import('../routes/users/index'))
const RolesPage          = lazy(() => import('../routes/roles/index'))
const ProfilePage        = lazy(() => import('../routes/profile/index'))
const LocationDetailPage = lazy(() => import('../routes/locations/$locationId'))
const AuditLogsPage      = lazy(() => import('../routes/audit-logs/index'))
const CustomerDashboardPage = lazy(() => import('../customer/dashboard/index'))
const CustomerEventsPage = lazy(() => import('../customer/events/index'))
const CustomerEventPage  = lazy(() => import('../customer/events/$eventId'))
const CustomerTicketsPage = lazy(() => import('../customer/tickets/index'))
const CustomerTicketDetailPage = lazy(() => import('../customer/tickets/$eventId'))
const CustomerWalletPage = lazy(() => import('../customer/wallet/index'))
const CustomerProfilePage = lazy(() => import('../customer/profile/index'))

const DASHBOARD_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'operations_manager',
  'commercial_manager',
  'finance',
  'vendor',
  'vendor_staff',
  'customer_support',
  'content_manager',
]

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
        <Route path="/payment/event-ticket/confirm" element={<EventTicketConfirmPage />} />
        <Route path="/login" element={<LoginPage mode="dashboard" />} />
        <Route path="/user/login" element={<LoginPage mode="user" />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/invitations/accept/:token" element={<AcceptInvitationPage />} />
        <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
        <Route path="/app" element={<ProtectedRoute roles={['user']}><CustomerDashboardPage /></ProtectedRoute>} />
        <Route path="/app/events" element={<ProtectedRoute roles={['user']}><CustomerEventsPage /></ProtectedRoute>} />
        <Route path="/app/events/:eventId" element={<ProtectedRoute roles={['user']}><CustomerEventPage /></ProtectedRoute>} />
        <Route path="/app/tickets" element={<ProtectedRoute roles={['user']}><CustomerTicketsPage /></ProtectedRoute>} />
        <Route path="/app/tickets/:eventId" element={<ProtectedRoute roles={['user']}><CustomerTicketDetailPage /></ProtectedRoute>} />
        <Route path="/app/wallet" element={<ProtectedRoute roles={['user']}><CustomerWalletPage /></ProtectedRoute>} />
        <Route path="/app/profile" element={<ProtectedRoute roles={['user']}><CustomerProfilePage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute roles={DASHBOARD_ROLES}><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/events" element={<ProtectedRoute roles={DASHBOARD_ROLES}><EventsListPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/new" element={<ProtectedRoute roles={['super_admin', 'admin', 'vendor']}><EventFormPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:eventId/edit" element={<ProtectedRoute roles={DASHBOARD_ROLES}><EventFormPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:eventId/attendees" element={<ProtectedRoute roles={DASHBOARD_ROLES}><EventAttendeesPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:eventId" element={<ProtectedRoute roles={DASHBOARD_ROLES}><EventDetailPage /></ProtectedRoute>} />
        <Route
          path="/dashboard/bookings"
          element={
            <ProtectedRoute roles={['super_admin', 'admin', 'vendor', 'vendor_staff', 'customer_support']}>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/bookings/:eventId"
          element={
            <ProtectedRoute roles={['vendor', 'vendor_staff', 'admin', 'customer_support']}>
              <BookingEventPage />
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
            <ProtectedRoute roles={['super_admin', 'admin']}>
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
            <ProtectedRoute roles={DASHBOARD_ROLES}>
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
