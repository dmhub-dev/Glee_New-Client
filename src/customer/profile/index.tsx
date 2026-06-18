import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type PasswordRotationDays,
  useChangePassword,
  useMyTickets,
  useNotificationPreferences,
  useProfile,
  useSecurityInfo,
  useToggle2FA,
  useUpdateNotificationPreferences,
  useUpdatePasswordRotationPreference,
  useUpdateProfile,
  useUploadAvatar,
} from '@glee/api'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Switch, useToast } from '@glee/ui'
import { Bell, Camera, Check, ChevronRight, Clock, KeyRound, Lock, LogOut, Pencil, Shield, User, Wallet, type LucideIcon } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import { useAuth } from '../../lib/auth/AuthContext'

const PASSWORD_ROTATION_OPTIONS: Array<{ days: PasswordRotationDays; label: string }> = [
  { days: 7, label: 'Every 1 week' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 30, label: 'Every month' },
  { days: 45, label: 'Every 45 days' },
  { days: 60, label: 'Every 60 days' },
]

function isPasswordRotationDays(value: number | undefined): value is PasswordRotationDays {
  return PASSWORD_ROTATION_OPTIONS.some(option => option.days === value)
}

function getPasswordRotationDays(value: number | undefined): PasswordRotationDays {
  return isPasswordRotationDays(value) ? value : 30
}

export default function CustomerProfilePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const { data: security } = useSecurityInfo()
  const { data: prefs } = useNotificationPreferences()
  const { data: ticketGroups = [] } = useMyTickets()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const updatePrefs = useUpdateNotificationPreferences()
  const toggle2fa = useToggle2FA()
  const changePassword = useChangePassword()
  const updateRotation = useUpdatePasswordRotationPreference()
  const { toast } = useToast()
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!profile) return
    setName(`${profile.firstName} ${profile.lastName}`.trim())
    setEmail(profile.email)
    setPhone(profile.phone ?? '')
  }, [profile])

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const initials = (name || profile?.email || 'User')
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const totalTickets = ticketGroups.reduce((sum, group) => sum + group.noOfTicketsPurchased, 0)
  const passwordRotationDays = getPasswordRotationDays(security?.passwordRotationDays ?? profile?.passwordRotationDays)
  const passwordRotationEnabled = security?.passwordRotationEnabled ?? profile?.passwordRotationEnabled ?? false
  const passwordExpiresAt = security?.passwordExpiresAt ?? profile?.passwordExpiresAt
  const lastLogin = security?.lastLoginAt
    ? new Date(security.lastLoginAt).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Not available'

  async function handleSaveProfile() {
    const [firstName = '', ...rest] = name.trim().split(' ')
    try {
      if (avatarFile) await uploadAvatar.mutateAsync(avatarFile)
      await updateProfile.mutateAsync({ firstName, lastName: rest.join(' '), phone })
      setEditProfileOpen(false)
      setAvatarFile(null)
      setAvatarPreview(null)
      toast({ title: 'Profile updated' })
    } catch (error) {
      toast({ title: 'Profile update failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  function handleAvatarChange(file?: File) {
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({ title: 'Password changed' })
    } catch (error) {
      toast({ title: 'Password change failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleRotationToggle(enabled: boolean) {
    try {
      await updateRotation.mutateAsync(enabled ? { enabled: true, days: passwordRotationDays } : { enabled: false })
      toast({ title: enabled ? 'Password rotation enabled' : 'Password rotation disabled' })
    } catch (error) {
      toast({ title: 'Password rotation update failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleRotationChange(value: string) {
    const selected = PASSWORD_ROTATION_OPTIONS.find(option => String(option.days) === value)
    if (!selected) return

    try {
      await updateRotation.mutateAsync({ enabled: true, days: selected.days })
      toast({ title: 'Password rotation updated' })
    } catch (error) {
      toast({ title: 'Password rotation update failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <CustomerLayout title="Profile" hidePageHeader>
      {isLoading ? (
        <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-8">
          <Skeleton className="h-[620px] rounded-3xl bg-white/10" />
        </div>
      ) : (
        <div className="relative min-h-screen pb-32">
          <div className="relative h-28 w-full bg-gradient-to-b from-[#9B51E0]/20 to-[#050017]">
            <div className="absolute inset-0 opacity-20 [background-image:url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          </div>

          <div className="relative z-10 mx-auto -mt-12 grid w-full max-w-7xl gap-8 px-4 lg:grid-cols-[360px_1fr] lg:px-8">
            <div className="flex flex-col items-center lg:items-start">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-[#050017] shadow-2xl">
                  <AvatarImage src={profile?.avatarUrl ?? undefined} className="object-cover" />
                  <AvatarFallback className="bg-neon-pink/15 text-2xl font-black text-neon-pink">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-[#050017] bg-green-500" />
              </div>

              <div className="mt-4 space-y-1 text-center lg:text-left">
                <h1 className="text-2xl font-bold text-white">{name || 'Glee User'}</h1>
                <p className="text-sm text-white/55">{profile?.email ?? email}</p>
              </div>

              <div className="mt-4 flex gap-2">
                <Badge variant="secondary" className="border-neon-pink/20 bg-white/5 px-3 py-1 text-neon-pink hover:bg-white/10">VIP Member</Badge>
              </div>

              <div className="mt-6 w-full rounded-3xl bg-white/[0.07] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neon-pink/15 text-neon-pink">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">Last login</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{lastLogin}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid w-full grid-cols-2 gap-4">
                <Stat value={String(totalTickets)} label="Tickets" />
                <Stat value={security?.twoFactorEnabled ? 'On' : 'Off'} label="2FA" />
              </div>
            </div>

            <div className="space-y-6 lg:pt-12">
              <MenuGroup title="Account">
                <MenuItem icon={User} label="Edit Profile" onClick={() => setEditProfileOpen(true)} />
                <MenuItem icon={Wallet} label="Glee Wallet" onClick={() => navigate('/app/wallet')} />
                <MenuItem
                  icon={Bell}
                  label="Notifications"
                  rightElement={<Switch checked={prefs?.bookingAlerts ?? true} onCheckedChange={value => updatePrefs.mutate({ bookingAlerts: value, eventAlerts: value })} />}
                />
              </MenuGroup>

              <MenuGroup title="Preferences">
                <MenuItem icon={Shield} label="Privacy & Security" onClick={() => setSecurityOpen(true)} />
                <MenuItem icon={Lock} label="Password & 2FA" onClick={() => setSecurityOpen(true)} />
              </MenuGroup>

              <Button variant="destructive" className="h-12 w-full rounded-full border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="mx-auto max-w-sm rounded-3xl border-white/10 bg-[#050017] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-neon-pink" />
              Edit Profile
            </DialogTitle>
            <DialogDescription className="text-white/55">Update your personal information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3">
              <Avatar className="h-16 w-16 border-2 border-white/10">
                <AvatarImage src={avatarPreview ?? profile?.avatarUrl ?? undefined} className="object-cover" />
                <AvatarFallback className="bg-neon-pink/15 text-lg font-black text-neon-pink">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Label htmlFor="profile-picture" className="mb-2 block text-white">Profile Picture</Label>
                <label htmlFor="profile-picture" className="flex h-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                  <Camera className="mr-2 h-4 w-4 text-neon-pink" />
                  Upload Image
                </label>
                <input id="profile-picture" type="file" accept="image/*" className="sr-only" onChange={event => handleAvatarChange(event.target.files?.[0])} />
                {avatarFile && <p className="mt-2 truncate text-xs text-white/45">{avatarFile.name}</p>}
              </div>
            </div>
            <Field label="Full Name" value={name} onChange={setName} />
            <Field label="Email" value={email} onChange={setEmail} type="email" disabled />
            <Field label="Phone" value={phone} onChange={setPhone} />
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending || uploadAvatar.isPending} className="mt-4 h-12 w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90">
              <Check className="mr-2 h-4 w-4" />
              {updateProfile.isPending || uploadAvatar.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogContent className="mx-auto max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-[1.75rem] border-white/10 bg-[#07021d] p-0 text-white shadow-[0_24px_90px_rgba(0,0,0,0.45)] sm:max-w-lg">
          <DialogHeader>
            <div className="relative overflow-hidden rounded-t-[1.75rem] border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,45,143,0.24),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] p-5">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neon-pink/60 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-pink/15 text-neon-pink ring-1 ring-neon-pink/25">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black">Privacy & Security</DialogTitle>
                  <DialogDescription className="mt-1 text-white/58">Manage login protection and password rules.</DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 p-5">
            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-300">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Two-factor authentication</p>
                    <p className="mt-1 text-sm leading-5 text-white/55">
                      {security?.twoFactorEnabled ? 'Enabled. Your account asks for an extra step at sign in.' : 'Disabled. Turn it on for stronger account protection.'}
                    </p>
                  </div>
                </div>
                <Switch checked={Boolean(security?.twoFactorEnabled)} onCheckedChange={value => toggle2fa.mutate(value)} />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neon-pink/15 text-neon-pink">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Password change frequency</p>
                    <p className="mt-1 text-sm leading-5 text-white/55">
                      {passwordRotationEnabled
                        ? passwordExpiresAt
                          ? `Next change required ${new Date(passwordExpiresAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                          : 'Selected timeline starts from your last password update.'
                        : 'Disabled - enable to request periodic password changes.'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={security?.passwordRotationEnabled ?? false}
                  onCheckedChange={handleRotationToggle}
                  disabled={updateRotation.isPending}
                />
              </div>
              <Select value={String(passwordRotationDays)} onValueChange={handleRotationChange} disabled={!security?.passwordRotationEnabled || updateRotation.isPending}>
                <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-[#120a2b] text-white focus:ring-neon-pink/50">
                  <SelectValue placeholder="Select rotation" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#120a2b] text-white">
                  {PASSWORD_ROTATION_OPTIONS.map(option => (
                    <SelectItem key={option.days} value={String(option.days)} className="focus:bg-neon-pink/15 focus:text-white">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white">Update password</p>
                  <p className="mt-1 text-sm leading-5 text-white/55">Use a new password that is different from previous sign-in details.</p>
                </div>
              </div>
              <div className="grid gap-3">
                <Field label="Current Password" value={currentPassword} onChange={setCurrentPassword} type="password" />
                <Field label="New Password" value={newPassword} onChange={setNewPassword} type="password" />
                <Field label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
              </div>
              <Button onClick={handlePasswordChange} disabled={changePassword.isPending} className="mt-4 h-12 w-full rounded-2xl bg-neon-pink font-bold text-white hover:bg-neon-pink/90">
                {changePassword.isPending ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-center">
      <span className="block text-xl font-bold text-white">{value}</span>
      <span className="text-xs text-white/55">{label}</span>
    </div>
  )
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="ml-1 text-sm font-medium uppercase tracking-wider text-white/55">{title}</h3>
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">{children}</div>
    </div>
  )
}

function MenuItem({ icon: Icon, label, onClick, rightElement }: { icon: LucideIcon; label: string; onClick?: () => void; rightElement?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white/5 p-2 text-neon-pink">
          <Icon className="h-5 w-5" />
        </div>
        <span className="font-medium text-white">{label}</span>
      </div>
      {rightElement ?? <ChevronRight className="h-5 w-5 text-white/35" />}
    </button>
  )
}

function Field({ label, value, onChange, type = 'text', disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <Label className="text-white">{label}</Label>
      <Input value={value} type={type} disabled={disabled} onChange={event => onChange(event.target.value)} className="h-12 rounded-2xl border-white/10 bg-white/5 px-4 text-white disabled:opacity-60" />
    </div>
  )
}
