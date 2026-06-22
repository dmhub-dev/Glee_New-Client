import { useNavigate } from 'react-router-dom'
import { cn } from '@glee/ui'
import type { UserRole } from '@glee/types'
import { canViewPayoutEarnings } from '../payouts/utils'

type EventDetailTab = 'details' | 'earnings' | 'complimentary' | 'attendants' | 'attendees' | 'updates' | 'chat' | 'reservations'

interface EventDetailTabsProps {
  eventId: string
  activeTab: EventDetailTab
  userRole: UserRole
  onSelectLocalTab?: (tab: 'details' | 'earnings' | 'complimentary' | 'attendants' | 'updates' | 'chat' | 'reservations') => void
}

export default function EventDetailTabs({ eventId, activeTab, userRole, onSelectLocalTab }: EventDetailTabsProps) {
  const navigate = useNavigate()
  const canIssueComplimentaryTickets = ['super_admin', 'admin', 'vendor'].includes(userRole)
  const canManageAttendants = ['super_admin', 'admin', 'vendor'].includes(userRole)
  const canViewEarnings = canViewPayoutEarnings(userRole)

  function selectLocal(tab: 'details' | 'earnings' | 'complimentary' | 'attendants' | 'updates' | 'chat' | 'reservations') {
    if (activeTab === 'attendees') {
      navigate(`/dashboard/events/${eventId}`, tab === 'details' ? undefined : { state: { tab } })
      return
    }
    onSelectLocalTab?.(tab)
  }

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex w-max min-w-full justify-start">
        <div className="flex shrink-0 rounded-full border border-admin bg-admin-surface p-1">
          <EventDetailTabButton active={activeTab === 'details'} onClick={() => selectLocal('details')}>
            Details
          </EventDetailTabButton>
          {canViewEarnings && (
            <EventDetailTabButton active={activeTab === 'earnings'} onClick={() => selectLocal('earnings')}>
              Earnings
            </EventDetailTabButton>
          )}
          {canIssueComplimentaryTickets && (
            <EventDetailTabButton active={activeTab === 'complimentary'} onClick={() => selectLocal('complimentary')}>
              Complimentary Tickets
            </EventDetailTabButton>
          )}
          {canManageAttendants && (
            <EventDetailTabButton active={activeTab === 'attendants'} onClick={() => selectLocal('attendants')}>
              Check-in Team
            </EventDetailTabButton>
          )}
          {canIssueComplimentaryTickets && (
            <EventDetailTabButton active={activeTab === 'updates'} onClick={() => selectLocal('updates')}>
              Attendee Updates
            </EventDetailTabButton>
          )}
          <EventDetailTabButton active={activeTab === 'attendees'} onClick={() => navigate(`/dashboard/events/${eventId}/attendees`)}>
            Attendees
          </EventDetailTabButton>
          {canIssueComplimentaryTickets && (
            <EventDetailTabButton active={activeTab === 'reservations'} onClick={() => selectLocal('reservations')}>
              Reservations
            </EventDetailTabButton>
          )}
          <EventDetailTabButton active={activeTab === 'chat'} onClick={() => selectLocal('chat')}>
            Event Chat
          </EventDetailTabButton>
        </div>
      </div>
    </div>
  )
}

function EventDetailTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition',
        active ? 'bg-neon-pink text-white' : 'text-admin-50 hover:text-neon-pink',
      )}
    >
      {children}
    </button>
  )
}
