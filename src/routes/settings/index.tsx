import { Settings } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'

export default function SettingsPage() {
  return (
    <AdminLayout title="Settings" subtitle="Platform-wide settings will live here">
      <section className="rounded-lg border border-admin bg-admin-surface p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neon-pink/10 text-neon-pink">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">General settings</h2>
            <p className="mt-1 max-w-2xl text-sm text-admin-50">
              User management, roles, profile preferences, categories, and locations now live in their own focused sections.
              Add only true platform-level configuration here.
            </p>
          </div>
        </div>
      </section>
    </AdminLayout>
  )
}
