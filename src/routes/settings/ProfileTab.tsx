import { ProfileForm } from './components/ProfileForm'
import { SecuritySection } from './components/SecuritySection'
import { NotificationPrefsSection } from './components/NotificationPrefsSection'

export default function ProfileTab() {
  return (
    <div className="space-y-6">
      <ProfileForm />
      <SecuritySection />
      <NotificationPrefsSection />
    </div>
  )
}
