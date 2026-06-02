import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useChangePassword,
  useNotificationPreferences,
  useProfile,
  useSecurityInfo,
  useToggle2FA,
  useUpdateNotificationPreferences,
  useUpdateProfile,
  type NotificationPreferences,
} from '@glee/api'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@glee/ui'
import { Bell, Lock, Mail, Phone, Save, ShieldCheck, UserCircle } from 'lucide-react'
import CustomerLayout from '../CustomerLayout'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine(values => values.newPassword === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
})

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>
type PrefKey = keyof NotificationPreferences

const prefRows: Array<{ key: PrefKey; label: string; description: string }> = [
  { key: 'bookingAlerts', label: 'Ticket and booking alerts', description: 'Purchases, ticket updates, check-in, and booking changes.' },
  { key: 'eventAlerts', label: 'Event reminders', description: 'Upcoming event reminders and event changes.' },
  { key: 'systemAlerts', label: 'Account alerts', description: 'Security, login, and account notifications.' },
  { key: 'weeklyReport', label: 'Weekly digest', description: 'A weekly summary of events and recommendations.' },
]

export default function CustomerProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const { data: security } = useSecurityInfo()
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const updatePrefs = useUpdateNotificationPreferences()
  const toggle2fa = useToggle2FA()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      phone: profile?.phone ?? '',
    },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!profile) return
    profileForm.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? '',
    })
  }, [profile])

  async function handleProfileSubmit(values: ProfileValues) {
    try {
      await updateProfile.mutateAsync(values)
      setEditing(false)
      toast({ title: 'Profile updated' })
    } catch (error) {
      toast({ title: 'Profile update failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handlePasswordSubmit(values: PasswordValues) {
    try {
      await changePassword.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      passwordForm.reset()
      toast({ title: 'Password changed' })
    } catch (error) {
      toast({ title: 'Password change failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  async function handlePrefToggle(key: PrefKey, value: boolean) {
    try {
      await updatePrefs.mutateAsync({ [key]: value })
    } catch {
      toast({ title: 'Could not update notification preference', variant: 'destructive' })
    }
  }

  async function handleTwoFactorToggle(enabled: boolean) {
    try {
      await toggle2fa.mutateAsync(enabled)
      toast({ title: enabled ? '2FA enabled' : '2FA disabled' })
    } catch (error) {
      toast({ title: 'Could not update 2FA', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' })
    }
  }

  return (
    <CustomerLayout title="Profile" subtitle="Manage your profile, security, password, and notification preferences.">
      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-xl border border-admin bg-admin-surface p-6 text-center shadow-admin">
            <Avatar className="mx-auto h-28 w-28 border border-admin shadow-admin">
              <AvatarImage src={profile?.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-neon-pink/10 text-2xl font-black text-neon-pink">
                {(profile?.firstName?.[0] ?? 'U')}{(profile?.lastName?.[0] ?? '')}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 font-heading text-2xl font-black text-foreground">{profile?.firstName} {profile?.lastName}</h2>
            <p className="mt-1 text-sm capitalize text-admin-50">{profile?.role}</p>
            <div className="mt-6 space-y-3 text-left">
              <div className="flex items-center gap-3 rounded-lg border border-admin bg-admin-input p-3">
                <Mail className="h-4 w-4 text-neon-pink" />
                <div className="min-w-0">
                  <p className="text-xs text-admin-40">Email</p>
                  <p className="truncate text-sm text-foreground">{profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-admin bg-admin-input p-3">
                <Phone className="h-4 w-4 text-neon-pink" />
                <div>
                  <p className="text-xs text-admin-40">Phone</p>
                  <p className="text-sm text-foreground">{profile?.phone || 'Not added'}</p>
                </div>
              </div>
            </div>
          </aside>

          <Tabs defaultValue="details" className="rounded-xl border border-admin bg-admin-surface p-4 shadow-admin sm:p-5">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-admin-input sm:grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading text-xl font-black text-foreground">Personal Details</h3>
                  <p className="mt-1 text-sm text-admin-50">Update the profile information attached to your tickets.</p>
                </div>
                <Button type="button" onClick={() => setEditing(value => !value)} variant="outline" className="border-admin bg-admin-input">
                  {editing ? 'Cancel' : 'Edit'}
                </Button>
              </div>

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="grid gap-4 md:grid-cols-2">
                  <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl><Input disabled={!editing} className="border-admin bg-admin-input" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl><Input disabled={!editing} className="border-admin bg-admin-input" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="md:col-span-2">
                    <FormField control={profileForm.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl><Input disabled={!editing} placeholder="+254 700 000 000" className="border-admin bg-admin-input" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  {editing && (
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" disabled={updateProfile.isPending} className="gap-2 bg-neon-pink text-white hover:bg-neon-pink/90">
                        <Save className="h-4 w-4" />
                        {updateProfile.isPending ? 'Saving...' : 'Save changes'}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <div className="rounded-xl border border-admin bg-admin-input p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-neon-pink" />
                    <div>
                      <p className="font-semibold text-foreground">Two-factor authentication</p>
                      <p className="text-sm text-admin-50">{security?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                  <Switch checked={Boolean(security?.twoFactorEnabled)} onCheckedChange={handleTwoFactorToggle} className="data-[state=checked]:bg-neon-pink" />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-admin bg-admin-input p-4">
                <div className="flex items-center gap-3">
                  <UserCircle className="h-5 w-5 text-neon-pink" />
                  <div>
                    <p className="font-semibold text-foreground">Last login</p>
                    <p className="text-sm text-admin-50">{security?.lastLoginAt ? new Date(security.lastLoginAt).toLocaleString('en-KE') : 'No recent login recorded'}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <div className="space-y-3">
                {prefRows.map(row => (
                  <div key={row.key} className="flex items-center justify-between gap-4 rounded-xl border border-admin bg-admin-input p-4">
                    <div className="flex items-start gap-3">
                      <Bell className="mt-0.5 h-4 w-4 text-neon-pink" />
                      <div>
                        <p className="font-semibold text-foreground">{row.label}</p>
                        <p className="text-sm text-admin-50">{row.description}</p>
                      </div>
                    </div>
                    {prefsLoading ? <Skeleton className="h-5 w-10 rounded-full" /> : <Switch checked={prefs?.[row.key] ?? false} onCheckedChange={value => handlePrefToggle(row.key, value)} className="data-[state=checked]:bg-neon-pink" />}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="password" className="mt-6">
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-neon-pink" />
                    <h3 className="font-heading text-xl font-black text-foreground">Reset Password</h3>
                  </div>
                  <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current password</FormLabel>
                      <FormControl><Input type="password" className="border-admin bg-admin-input" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl><Input type="password" className="border-admin bg-admin-input" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl><Input type="password" className="border-admin bg-admin-input" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={changePassword.isPending} className="bg-neon-pink text-white hover:bg-neon-pink/90">
                    {changePassword.isPending ? 'Updating...' : 'Update password'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </CustomerLayout>
  )
}
