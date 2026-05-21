// apps/admin/src/routes/settings/ProfileTab.tsx
import { ProfileForm } from './components/ProfileForm'
import { PasswordForm } from './components/PasswordForm'

export default function ProfileTab() {
  return (
    <div className="space-y-6">
      <ProfileForm />
      <PasswordForm />
    </div>
  )
}
