import { useEffect, useState } from 'react'
import { Bell, CalendarCog, Globe2, Mail, Shield, SlidersHorizontal } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { Button, Input, Skeleton, Switch, useToast } from '@glee/ui'
import { useEventCheckoutSettings, useUpdateEventCheckoutSettings } from '@glee/api'

type FeeType = 'PERCENTAGE' | 'FIXED'

const SETTING_GROUPS = [
  {
    icon: Globe2,
    title: 'Platform defaults',
    description: 'Control the defaults used across dashboards and public checkout.',
    rows: [
      { label: 'Timezone', value: 'Africa/Nairobi' },
      { label: 'Currency', value: 'KES' },
      { label: 'Public event checkout', value: 'Enabled' },
    ],
  },
  {
    icon: Mail,
    title: 'Email sender',
    description: 'Default identity for auth, invite, booking, and ticket emails.',
    rows: [
      { label: 'Sender name', value: 'Glee Events' },
      { label: 'Sender email', value: 'no-reply@glee.local' },
      { label: 'Template folder', value: 'views/auth' },
    ],
  },
  {
    icon: Shield,
    title: 'Security defaults',
    description: 'Guardrails for admin access and account protection.',
    rows: [
      { label: 'Admin 2FA support', value: 'Available' },
      { label: 'Audit log visibility', value: 'Super admin only' },
      { label: 'Session policy', value: 'Token based' },
    ],
  },
]

export default function SettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [publicCheckout, setPublicCheckout] = useState(true)
  const [auditAlerts, setAuditAlerts] = useState(true)
  const { data: eventSettings, isLoading: eventSettingsLoading } = useEventCheckoutSettings()
  const updateEventSettings = useUpdateEventCheckoutSettings()
  const { toast } = useToast()
  const [depositType, setDepositType] = useState<FeeType>('PERCENTAGE')
  const [depositPercent, setDepositPercent] = useState('30')
  const [depositAmount, setDepositAmount] = useState('0')
  const [securityFeeType, setSecurityFeeType] = useState<FeeType>('PERCENTAGE')
  const [securityFeePercent, setSecurityFeePercent] = useState('5')
  const [securityFeeAmount, setSecurityFeeAmount] = useState('0')

  useEffect(() => {
    if (!eventSettings) return
    setDepositType(eventSettings.walletInstallmentDepositType ?? 'PERCENTAGE')
    setDepositPercent(String(eventSettings.walletInstallmentDepositPercent))
    setDepositAmount(String(eventSettings.walletInstallmentDepositAmount ?? 0))
    setSecurityFeeType(eventSettings.walletInstallmentSecurityFeeType ?? 'PERCENTAGE')
    setSecurityFeePercent(String(eventSettings.walletInstallmentSecurityFeePercent))
    setSecurityFeeAmount(String(eventSettings.walletInstallmentSecurityFeeAmount ?? 0))
  }, [eventSettings])

  async function saveEventSettings() {
    try {
      await updateEventSettings.mutateAsync({
        walletInstallmentDepositType: depositType,
        walletInstallmentDepositPercent: Number(depositPercent),
        walletInstallmentDepositAmount: Number(depositAmount),
        walletInstallmentSecurityFeeType: securityFeeType,
        walletInstallmentSecurityFeePercent: Number(securityFeePercent),
        walletInstallmentSecurityFeeAmount: Number(securityFeeAmount),
      })
      toast({ title: 'Event settings saved' })
    } catch (error) {
      toast({
        title: 'Could not save event settings',
        description: error instanceof Error ? error.message : 'Please check the percentages and try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <AdminLayout title="Settings" subtitle="Platform configuration and operational defaults">
      <div className="space-y-6">
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-admin bg-admin-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-neon-pink" />
              <h2 className="font-heading text-base font-bold text-foreground">Operational controls</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-admin bg-admin-overlay p-3">
                <div>
                  <p className="text-sm font-medium text-admin-80">Public checkout</p>
                  <p className="text-xs text-admin-40">Allow unauthenticated event purchases.</p>
                </div>
                <Switch checked={publicCheckout} onCheckedChange={setPublicCheckout} className="data-[state=checked]:bg-neon-pink" />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-admin bg-admin-overlay p-3">
                <div>
                  <p className="text-sm font-medium text-admin-80">Maintenance mode</p>
                  <p className="text-xs text-admin-40">Temporarily pause public flows.</p>
                </div>
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} className="data-[state=checked]:bg-neon-pink" />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-admin bg-admin-overlay p-3">
                <div>
                  <p className="text-sm font-medium text-admin-80">Audit alerts</p>
                  <p className="text-xs text-admin-40">Flag sensitive admin changes.</p>
                </div>
                <Switch checked={auditAlerts} onCheckedChange={setAuditAlerts} className="data-[state=checked]:bg-neon-pink" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-admin bg-admin-surface p-5 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-neon-pink" />
              <h2 className="font-heading text-base font-bold text-foreground">Admin notifications</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value="admin@glee.local" readOnly className="bg-admin-input border-admin" />
              <Input value="support@glee.local" readOnly className="bg-admin-input border-admin" />
            </div>
            <p className="mt-3 text-xs text-admin-40">
              These are display settings for the admin UI. Backend persistence can be connected when the settings API is finalized.
            </p>
            <Button type="button" disabled className="mt-4 bg-neon-pink text-white disabled:opacity-50">
              Save settings
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-admin bg-admin-surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neon-pink/10 text-neon-pink">
                <CalendarCog className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">Event Settings</h2>
                <p className="mt-1 max-w-2xl text-sm text-admin-40">
                  Control wallet installment rules for logged-in users buying event tickets. These values are applied dynamically on the customer event checkout modal.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={saveEventSettings}
              disabled={updateEventSettings.isPending || eventSettingsLoading}
              className="bg-neon-pink text-white hover:bg-neon-pink/90 disabled:opacity-50"
            >
              {updateEventSettings.isPending ? 'Saving...' : 'Save event settings'}
            </Button>
          </div>

          {eventSettingsLoading ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="rounded-lg border border-admin bg-admin-overlay p-4">
                <span className="text-sm font-semibold text-admin-80">Installment deposit</span>
                <span className="mt-1 block text-xs text-admin-40">
                  Amount deducted immediately to reserve the ticket. Choose a percentage of ticket value or a fixed KES amount.
                </span>
                <div className="mt-4 inline-flex rounded-lg border border-admin bg-admin-input p-1">
                  {(['PERCENTAGE', 'FIXED'] as FeeType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDepositType(type)}
                      className={[
                        'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                        depositType === type ? 'bg-neon-pink text-white' : 'text-admin-50 hover:text-admin-90',
                      ].join(' ')}
                    >
                      {type === 'PERCENTAGE' ? 'Percentage' : 'Fixed amount'}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Input
                    type="number"
                    min={depositType === 'PERCENTAGE' ? 1 : 0}
                    max={depositType === 'PERCENTAGE' ? 100 : undefined}
                    value={depositType === 'PERCENTAGE' ? depositPercent : depositAmount}
                    onChange={event => depositType === 'PERCENTAGE' ? setDepositPercent(event.target.value) : setDepositAmount(event.target.value)}
                    className="border-admin bg-admin-input"
                  />
                  <span className="min-w-10 text-sm font-semibold text-admin-60">{depositType === 'PERCENTAGE' ? '%' : 'KSh'}</span>
                </div>
              </label>

              <label className="rounded-lg border border-admin bg-admin-overlay p-4">
                <span className="text-sm font-semibold text-admin-80">Security fee</span>
                <span className="mt-1 block text-xs text-admin-40">
                  Extra fee deducted upfront to reduce risk when users reserve tickets on installments.
                </span>
                <div className="mt-4 inline-flex rounded-lg border border-admin bg-admin-input p-1">
                  {(['PERCENTAGE', 'FIXED'] as FeeType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSecurityFeeType(type)}
                      className={[
                        'rounded-md px-3 py-1.5 text-xs font-semibold transition',
                        securityFeeType === type ? 'bg-neon-pink text-white' : 'text-admin-50 hover:text-admin-90',
                      ].join(' ')}
                    >
                      {type === 'PERCENTAGE' ? 'Percentage' : 'Fixed amount'}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={securityFeeType === 'PERCENTAGE' ? 100 : undefined}
                    value={securityFeeType === 'PERCENTAGE' ? securityFeePercent : securityFeeAmount}
                    onChange={event => securityFeeType === 'PERCENTAGE' ? setSecurityFeePercent(event.target.value) : setSecurityFeeAmount(event.target.value)}
                    className="border-admin bg-admin-input"
                  />
                  <span className="min-w-10 text-sm font-semibold text-admin-60">{securityFeeType === 'PERCENTAGE' ? '%' : 'KSh'}</span>
                </div>
              </label>
            </div>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {SETTING_GROUPS.map(group => {
            const Icon = group.icon
            return (
              <div key={group.title} className="rounded-lg border border-admin bg-admin-surface p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neon-pink/10 text-neon-pink">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-heading text-base font-bold text-foreground">{group.title}</h2>
                    <p className="mt-1 text-xs text-admin-40">{group.description}</p>
                  </div>
                </div>
                <div className="divide-y divide-admin rounded-lg border border-admin bg-admin-overlay">
                  {group.rows.map(row => (
                    <div key={row.label} className="flex items-center justify-between gap-4 px-3 py-2.5">
                      <span className="text-xs text-admin-40">{row.label}</span>
                      <span className="text-xs font-medium text-admin-80">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </AdminLayout>
  )
}
