import { useNavigate, useParams } from 'react-router-dom'
import { useReservation } from '@glee/api'
import { BookingChatPanel } from '../../components/chat/BookingChatPanel'
import CustomerLayout from '../CustomerLayout'

export default function CustomerReservationChatPage() {
  const { reservationId = '' } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const { data: reservation } = useReservation(reservationId)

  return (
    <CustomerLayout title="Booking Chat" hidePageHeader>
      <div className="flex h-[100dvh] flex-col lg:h-[calc(100vh-0px)]">
        <BookingChatPanel
          reservation={reservation}
          viewer="CUSTOMER"
          viewerName={reservation?.user?.name ?? reservation?.guestName ?? 'Customer'}
          tone="customer"
          className="flex-1 overflow-hidden"
          onBack={() => navigate('/app/tickets?tab=reservations')}
        />
      </div>
    </CustomerLayout>
  )
}
