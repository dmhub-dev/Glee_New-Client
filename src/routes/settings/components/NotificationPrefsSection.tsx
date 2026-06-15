import { Bell, Calendar, Users, BarChart2, Loader2 } from 'lucide-react'
import { Switch, Skeleton, useToast } from '@glee/ui'
import { useNotificationPreferences, useUpdateNotificationPreferences, type NotificationPreferences } from '@glee/api'

type PrefKey = keyof NotificationPreferences

interface PrefItem {
  key:         PrefKey
  label:       string
  description: string
  icon:        React.ElementType
}

const PREFS: PrefItem[] = [
  {
    key:         'bookingAlerts',
    label:       'Ticket alerts',
    description: 'Ticket purchases, check-ins, and customer status changes',
    icon:        Calendar,
  },
  {
    key:         'eventAlerts',
    label:       'Event alerts',
    description: 'Events approaching capacity, new event submissions, and updates',
    icon:        Bell,
  },
  {
    key:         'systemAlerts',
    label:       'System alerts',
    description: 'New user registrations, vendor onboarding, and role changes',
    icon:        Users,
  },
  {
    key:         'weeklyReport',
    label:       'Weekly digest',
    description: 'Summary of ticket sales, revenue, and platform activity',
    icon:        BarChart2,
  },
]

export function NotificationPrefsSection() {
  const { toast } = useToast()
  const { data: prefs, isLoading } = useNotificationPreferences()
  const updateMutation = useUpdateNotificationPreferences()

  async function handleToggle(key: PrefKey, value: boolean) {
    try {
      await updateMutation.mutateAsync({ [key]: value })
    } catch {
      toast({ title: 'Failed to update notification preference', variant: 'destructive' })
    }
  }

  return (
    <div className="bg-admin-surface border border-admin rounded-2xl shadow-admin overflow-hidden">
      <div className="px-6 py-4 border-b border-admin flex items-center gap-2">
        <Bell className="w-4 h-4 text-neon-pink" />
        <h2 className="font-heading font-bold text-base text-foreground">Notifications</h2>
      </div>

      <div className="divide-y divide-admin">
        {PREFS.map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Icon className="w-4 h-4 text-admin-40 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-admin-80">{label}</p>
                <p className="text-xs text-admin-50 mt-0.5">{description}</p>
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-5 w-10 rounded-full shrink-0" />
            ) : updateMutation.isPending && updateMutation.variables && key in updateMutation.variables ? (
              <Loader2 className="w-4 h-4 text-admin-40 animate-spin shrink-0" />
            ) : (
              <Switch
                checked={prefs?.[key] ?? false}
                onCheckedChange={value => handleToggle(key, value)}
                disabled={updateMutation.isPending}
                className="data-[state=checked]:bg-neon-pink shrink-0"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
