import { Navigate } from 'react-router-dom'

export default function CustomerMyReservationsPage() {
  return <Navigate to="/app/tickets?tab=reservations" replace />
}
