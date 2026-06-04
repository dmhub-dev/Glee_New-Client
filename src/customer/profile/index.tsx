import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useChangePassword,
  useMyTickets,
  useNotificationPreferences,
  useProfile,
  useSecurityInfo,
  useToggle2FA,
  useUpdateNotificationPreferences,
  useUpdateProfile,
  useUploadAvatar,
} from '@glee/api'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Skeleton, Switch, useToast } from '@glee/ui'
import { Bell, Camera, Check, ChevronRight, CreditCard, Lock, LogOut, Pencil, Shield, Smartphone, User, Wallet, X, type LucideIcon } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'
import { useAuth } from '../../lib/auth/AuthContext'

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
  const { toast } = useToast()
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false)
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
  const upcomingEvents = ticketGroups.filter(group => group.event.startDate && new Date(group.event.startDate) >= new Date()).length

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
                <Badge variant="outline" className="border-white/10 text-white/55">Level 3</Badge>
              </div>

              <div className="mt-8 grid w-full grid-cols-3 gap-4">
                <Stat value={String(totalTickets)} label="Tickets" />
                <Stat value={String(upcomingEvents)} label="Bookings" />
                <Stat value="4.9" label="Rating" />
              </div>
            </div>

            <div className="space-y-6 lg:pt-12">
              <MenuGroup title="Account">
                <MenuItem icon={User} label="Edit Profile" onClick={() => setEditProfileOpen(true)} />
                <MenuItem icon={Wallet} label="Glee Wallet" onClick={() => navigate('/app/wallet')} />
                <MenuItem icon={CreditCard} label="Payment Methods" onClick={() => setPaymentMethodsOpen(true)} />
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

              <Button variant="destructive" className="w-full border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20" onClick={handleLogout}>
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
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending || uploadAvatar.isPending} className="mt-4 w-full bg-neon-pink text-white hover:bg-neon-pink/90">
              <Check className="mr-2 h-4 w-4" />
              {updateProfile.isPending || uploadAvatar.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentMethodsOpen} onOpenChange={setPaymentMethodsOpen}>
        <DialogContent className="mx-auto max-h-[85vh] max-w-sm overflow-y-auto rounded-3xl border-white/10 bg-[#050017] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-neon-pink" />
              Payment Methods
            </DialogTitle>
            <DialogDescription className="text-white/55">Manage wallet, cards, and M-Pesa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PaymentRow icon={Wallet} title="Glee Wallet" subtitle="Use wallet balance for tickets and deposits" action="Open" onClick={() => navigate('/app/wallet')} />
            <PaymentRow icon={CreditCard} title="Visa •••• 4242" subtitle="Expires 12/25" action={<X className="h-4 w-4" />} />
            <PaymentRow icon={Smartphone} title="My M-Pesa" subtitle="+254 712 345 678" action={<X className="h-4 w-4" />} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
        <DialogContent className="mx-auto max-h-[85vh] max-w-sm overflow-y-auto rounded-3xl border-white/10 bg-[#050017] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-neon-pink" />
              Privacy & Security
            </DialogTitle>
            <DialogDescription className="text-white/55">Manage login protection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
              <div>
                <p className="font-medium text-white">Two-factor authentication</p>
                <p className="text-xs text-white/55">{security?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
              <Switch checked={Boolean(security?.twoFactorEnabled)} onCheckedChange={value => toggle2fa.mutate(value)} />
            </div>
            <Field label="Current Password" value={currentPassword} onChange={setCurrentPassword} type="password" />
            <Field label="New Password" value={newPassword} onChange={setNewPassword} type="password" />
            <Field label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
            <Button onClick={handlePasswordChange} disabled={changePassword.isPending} className="w-full bg-neon-pink text-white hover:bg-neon-pink/90">
              {changePassword.isPending ? 'Updating...' : 'Update Password'}
            </Button>
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
      <Input value={value} type={type} disabled={disabled} onChange={event => onChange(event.target.value)} className="border-white/10 bg-white/5 text-white disabled:opacity-60" />
    </div>
  )
}

function PaymentRow({ icon: Icon, title, subtitle, action, onClick }: { icon: LucideIcon; title: string; subtitle: string; action: ReactNode; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neon-pink/20 text-neon-pink">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-xs text-white/55">{subtitle}</p>
        </div>
      </div>
      <Button size="sm" variant="ghost" className="text-neon-pink hover:text-neon-pink" onClick={onClick}>
        {action}
      </Button>
    </div>
  )
}
