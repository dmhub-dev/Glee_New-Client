import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { ADMIN_ROLES, CUSTOMER_ROLES, DASHBOARD_ROLES } from '../types'
import type { UserRole } from '../types'
import { Skeleton } from '../ui'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import { useAuth } from '../lib/auth/AuthContext'

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  if (isLoading) return null
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'user' ? '/app' : '/dashboard'} replace />
  }
  return <>{children}</>
}

const LoginPage          = lazy(() => import('../routes/login'))
const SignupPage         = lazy(() => import('../routes/signup'))
const AcceptInvitationPage = lazy(() => import('../routes/invitations/accept'))
const CompleteProfilePage  = lazy(() => import('../routes/complete-profile'))
const PublicHomePage     = lazy(() => import('../public/routes/index'))
const PublicEventsPage   = lazy(() => import('../public/routes/events/index'))
const PublicEventPage    = lazy(() => import('../public/routes/events/$eventId'))
const EventTicketConfirmPage = lazy(() => import('../public/routes/payment/EventTicketConfirm'))
const ReservationCallbackPage = lazy(() => import('../public/routes/reservations/ReservationCallback'))
const PublicReservationDetailPage = lazy(() => import('../public/routes/reservations/$token'))
const TicketAttendantAccessPage = lazy(() => import('../public/routes/ticket-attendant/access'))
const BookingAttendantAccessPage = lazy(() => import('../public/routes/booking-attendant/access'))
const PublicTicketPassPage = lazy(() => import('../public/routes/tickets/$token'))
const PrivacyPolicyPage   = lazy(() => import('../public/routes/legal/privacy-policy'))
const TermsPage           = lazy(() => import('../public/routes/legal/terms'))
const RefundPolicyPage    = lazy(() => import('../public/routes/legal/refund-policy'))
const DashboardPage      = lazy(() => import('../routes/index'))
const EventsListPage     = lazy(() => import('../routes/events/index'))
const EventFormPage      = lazy(() => import('../routes/events/$eventId'))
const EventDetailPage    = lazy(() => import('../routes/events/EventDetail'))
const EventAttendeesPage = lazy(() => import('../routes/events/EventAttendees'))
const BookingsPage       = lazy(() => import('../routes/bookings/index'))
const BookingEventPage   = lazy(() => import('../routes/bookings/$eventId'))
const ReservationsPage   = lazy(() => import('../routes/reservations/index'))
const ReservationDetailPage = lazy(() => import('../routes/reservations/$reservationId'))
const BookingChatsPage = lazy(() => import('../routes/booking-chats/index'))
const MenuPricingPage    = lazy(() => import('../routes/menu-pricing/index'))
const SalesReportsPage   = lazy(() => import('../routes/sales-reports/index'))
const FinancialsPage     = lazy(() => import('../routes/financials/index'))
const PayoutsPage        = lazy(() => import('../routes/payouts/index'))
const CalendarPage       = lazy(() => import('../routes/calendar/index'))
const SettingsPage       = lazy(() => import('../routes/settings/index'))
const UsersPage          = lazy(() => import('../routes/users/index'))
const RolesPage          = lazy(() => import('../routes/roles/index'))
const ProfilePage        = lazy(() => import('../routes/profile/index'))
const LocationsPage      = lazy(() => import('../routes/locations/index'))
const NewLocationPage    = lazy(() => import('../routes/locations/new'))
const LocationDetailPage = lazy(() => import('../routes/locations/$locationId'))
const AuditLogsPage      = lazy(() => import('../routes/audit-logs/index'))
const CustomerDashboardPage = lazy(() => import('../customer/dashboard/index'))
const CustomerEventsPage = lazy(() => import('../customer/events/index'))
const CustomerEventPage  = lazy(() => import('../customer/events/$eventId'))
const CustomerEventChatPage = lazy(() => import('../customer/events/EventChat'))
const CustomerTicketsPage = lazy(() => import('../customer/tickets/index'))
const CustomerTicketDetailPage = lazy(() => import('../customer/tickets/$eventId'))
const CustomerWalletPage = lazy(() => import('../customer/wallet/index'))
const WalletCallbackPage = lazy(() => import('../customer/wallet/callback'))
const CustomerProfilePage = lazy(() => import('../customer/profile/index'))
const CustomerReservationsPage = lazy(() => import('../customer/reservations/index'))
const CustomerReservationVenuePage = lazy(() => import('../customer/reservations/$locationId'))
const CustomerMyReservationsPage = lazy(() => import('../customer/reservations/my'))
const CustomerReservationDetailPage = lazy(() => import('../customer/reservations/$reservationId'))

const EVENT_CREATE_ROLES: UserRole[] = [...ADMIN_ROLES, 'vendor']
const BOOKINGS_ROLES: UserRole[] = [...ADMIN_ROLES, 'vendor', 'vendor_staff', 'customer_support']
const BOOKING_EVENT_ROLES: UserRole[] = ['vendor', 'vendor_staff', 'admin', 'customer_support']
const RESERVATION_ROLES: UserRole[] = [...ADMIN_ROLES, 'operations_manager', 'vendor', 'vendor_staff']
const LOCATION_ROLES: UserRole[] = [...ADMIN_ROLES, 'vendor', 'vendor_staff']
const LOCATION_CREATE_ROLES: UserRole[] = [...ADMIN_ROLES, 'vendor']
const MENU_PRICING_ROLES: UserRole[] = [...ADMIN_ROLES, 'vendor', 'vendor_staff']
const SALES_REPORT_ROLES: UserRole[] = [...ADMIN_ROLES, 'vendor', 'vendor_staff', 'finance']
const FINANCIALS_ROLES: UserRole[] = [...ADMIN_ROLES, 'finance']
const PAYOUTS_ROLES: UserRole[] = [...ADMIN_ROLES, 'finance', 'vendor', 'vendor_staff']
const CALENDAR_ROLES: UserRole[] = [...ADMIN_ROLES, 'operations_manager']

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

function NotFoundRoute() {
  const { isAuthenticated, isLoading, user } = useAuth()
  if (isLoading) return <PageSkeleton />
  return <Navigate to={isAuthenticated && user ? (user.role === 'user' ? '/app' : '/dashboard') : '/'} replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<PublicOnlyRoute><PublicHomePage /></PublicOnlyRoute>} />
        <Route path="/events" element={<PublicEventsPage />} />
        <Route path="/events/:eventId" element={<PublicEventPage />} />
        <Route path="/checkout" element={<Navigate to="/events" replace />} />
        <Route path="/payment/event-ticket/confirm" element={<EventTicketConfirmPage />} />
        <Route path="/reservation/callback" element={<ReservationCallbackPage />} />
        <Route path="/reservation/:token" element={<PublicReservationDetailPage />} />
        <Route path="/reservations" element={<CustomerReservationsPage />} />
        <Route path="/ticket-attendant/access" element={<TicketAttendantAccessPage />} />
        <Route path="/booking-attendant/access" element={<BookingAttendantAccessPage />} />
        <Route path="/t/:token" element={<PublicTicketPassPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage mode="dashboard" /></PublicOnlyRoute>} />
        <Route path="/user/login" element={<PublicOnlyRoute><LoginPage mode="user" /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
        <Route path="/invitations/accept/:token" element={<AcceptInvitationPage />} />
        <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
        <Route path="/app" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerDashboardPage /></ProtectedRoute>} />
        <Route path="/app/events" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerEventsPage /></ProtectedRoute>} />
        <Route path="/app/events/:eventId" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerEventPage /></ProtectedRoute>} />
        <Route path="/app/events/:eventId/chat" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerEventChatPage /></ProtectedRoute>} />
        <Route path="/app/tickets" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerTicketsPage /></ProtectedRoute>} />
        <Route path="/app/tickets/:eventId" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerTicketDetailPage /></ProtectedRoute>} />
        <Route path="/app/wallet" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerWalletPage /></ProtectedRoute>} />
        <Route path="/app/wallet/callback" element={<ProtectedRoute roles={CUSTOMER_ROLES}><WalletCallbackPage /></ProtectedRoute>} />
        <Route path="/app/profile" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerProfilePage /></ProtectedRoute>} />
        <Route path="/app/reservations" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerReservationsPage /></ProtectedRoute>} />
        <Route path="/app/reservations/my" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerMyReservationsPage /></ProtectedRoute>} />
        <Route path="/reservations/:locationId" element={<CustomerReservationVenuePage />} />
        <Route path="/app/reservations/:locationId" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerReservationVenuePage /></ProtectedRoute>} />
        <Route path="/app/reservations/detail/:reservationId" element={<ProtectedRoute roles={CUSTOMER_ROLES}><CustomerReservationDetailPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute roles={DASHBOARD_ROLES}><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard/events" element={<ProtectedRoute roles={DASHBOARD_ROLES}><EventsListPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/new" element={<ProtectedRoute roles={EVENT_CREATE_ROLES}><EventFormPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:eventId/edit" element={<ProtectedRoute roles={DASHBOARD_ROLES}><EventFormPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:eventId/attendees" element={<ProtectedRoute roles={DASHBOARD_ROLES}><EventAttendeesPage /></ProtectedRoute>} />
        <Route path="/dashboard/events/:eventId" element={<ProtectedRoute roles={DASHBOARD_ROLES}><EventDetailPage /></ProtectedRoute>} />
        <Route
          path="/dashboard/locations"
          element={
            <ProtectedRoute roles={LOCATION_ROLES}>
              <LocationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/bookings"
          element={
            <ProtectedRoute roles={BOOKINGS_ROLES}>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/bookings/:eventId"
          element={
            <ProtectedRoute roles={BOOKING_EVENT_ROLES}>
              <BookingEventPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/reservations"
          element={
            <ProtectedRoute roles={RESERVATION_ROLES}>
              <ReservationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/booking-chats"
          element={
            <ProtectedRoute roles={RESERVATION_ROLES}>
              <BookingChatsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/reservations/:reservationId"
          element={
            <ProtectedRoute roles={RESERVATION_ROLES}>
              <ReservationDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/menu-pricing"
          element={
            <ProtectedRoute roles={MENU_PRICING_ROLES}>
              <MenuPricingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/sales-reports"
          element={
            <ProtectedRoute roles={SALES_REPORT_ROLES}>
              <SalesReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/financials"
          element={
            <ProtectedRoute roles={FINANCIALS_ROLES}>
              <FinancialsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/payouts"
          element={
            <ProtectedRoute roles={PAYOUTS_ROLES}>
              <PayoutsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/calendar"
          element={
            <ProtectedRoute roles={CALENDAR_ROLES}>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/users"
          element={
            <ProtectedRoute roles={EVENT_CREATE_ROLES}>
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
          path="/dashboard/locations/new"
          element={
            <ProtectedRoute roles={LOCATION_CREATE_ROLES}>
              <NewLocationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/locations/:locationId"
          element={
            <ProtectedRoute roles={LOCATION_ROLES}>
              <LocationDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </Suspense>
  )
}
