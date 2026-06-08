import { useNavigate, useParams } from 'react-router-dom'
import { useEvent } from '@glee/api'
import { EventChatPanel } from '../../components/chat/EventChatPanel'

export default function CustomerEventChatPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { data: event } = useEvent(eventId ?? '')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050017]">
      <EventChatPanel
        eventId={eventId ?? ''}
        eventTitle={event?.title ?? 'Event Chat'}
        tone="customer"
        className="flex-1 overflow-hidden"
        onBack={() => navigate(-1)}
      />
    </div>
  )
}
