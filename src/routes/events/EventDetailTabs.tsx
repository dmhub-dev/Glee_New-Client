import { useNavigate } from 'react-router-dom'
import { cn } from '@glee/ui'
import type { UserRole } from '@glee/types'

type EventDetailTab = 'details' | 'complimentary' | 'attendees'

interface EventDetailTabsProps {
  eventId: string
  activeTab: EventDetailTab
  userRole: UserRole
  onSelectLocalTab?: (tab: 'details' | 'complimentary') => void
}

export default function EventDetailTabs({ eventId, activeTab, userRole, onSelectLocalTab }: EventDetailTabsProps) {
  const navigate = useNavigate()
  const canIssueComplimentaryTickets = ['super_admin', 'admin', 'vendor'].includes(userRole)

  function selectDetails() {
    if (activeTab === 'attendees') {
      navigate(`/dashboard/events/${eventId}`)
      return
    }
    onSelectLocalTab?.('details')
  }

  function selectComplimentary() {
    if (activeTab === 'attendees') {
      navigate(`/dashboard/events/${eventId}`, { state: { tab: 'complimentary' } })
      return
    }
    onSelectLocalTab?.('complimentary')
  }

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex w-max min-w-full justify-start">
        <div className="flex shrink-0 rounded-full border border-admin bg-admin-surface p-1">
          <EventDetailTabButton active={activeTab === 'details'} onClick={selectDetails}>
            Details
          </EventDetailTabButton>
          {canIssueComplimentaryTickets && (
            <EventDetailTabButton active={activeTab === 'complimentary'} onClick={selectComplimentary}>
              Complimentary Tickets
            </EventDetailTabButton>
          )}
          <EventDetailTabButton active={activeTab === 'attendees'} onClick={() => navigate(`/dashboard/events/${eventId}/attendees`)}>
            Attendees
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
