// apps/admin/src/routes/settings/ProfileTab.tsx
import { ProfileForm } from './components/ProfileForm'
import { PasswordForm } from './components/PasswordForm'
import { SecuritySection } from './components/SecuritySection'
import { NotificationPrefsSection } from './components/NotificationPrefsSection'

export default function ProfileTab() {
  return (
    <div className="space-y-6">
      <ProfileForm />
      <PasswordForm />
      <SecuritySection />
      <NotificationPrefsSection />
    </div>
  )
}
