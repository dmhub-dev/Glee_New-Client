import { useNavigate, useParams } from 'react-router-dom'
import { useEvent } from '@glee/api'
import CustomerLayout from '../CustomerLayout'
import { EventChatPanel } from '../../components/chat/EventChatPanel'

export default function CustomerEventChatPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: event } = useEvent(eventId ?? '')

  return (
    <CustomerLayout title="Event Chat" hidePageHeader>
      {/* Full-height flex container so the chat panel fills the content area */}
      <div className="flex h-[100dvh] flex-col lg:h-[calc(100vh-0px)]">
        <EventChatPanel
          eventId={eventId ?? ''}
          eventTitle={event?.title ?? 'Event Chat'}
          eventImage={event?.flyerSquareUrl ?? event?.flyerPortraitUrl}
          tone="customer"
          className="flex-1 overflow-hidden"
          onBack={() => navigate(`/app/events/${eventId ?? ''}`)}
        />
      </div>
    </CustomerLayout>
  )
}
