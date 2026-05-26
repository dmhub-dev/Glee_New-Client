import { useState } from 'react'
import { Bell, Globe2, Mail, Shield, SlidersHorizontal } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { Button, Input, Switch } from '@glee/ui'

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
