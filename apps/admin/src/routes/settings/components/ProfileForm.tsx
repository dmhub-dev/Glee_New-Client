// apps/admin/src/routes/settings/components/ProfileForm.tsx
import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Camera } from 'lucide-react'
import {
  Avatar, AvatarImage, AvatarFallback,
  Badge,
  Button,
  Input,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  Skeleton,
  useToast,
} from '@glee/ui'
import { useProfile, useUpdateProfile, useUploadAvatar } from '../../../lib/queries/profile'
import { ROLE_LABELS, roleBadgeClass } from './roleConstants'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  phone:     z.string().optional(),
})
type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfileForm() {
  const { toast } = useToast()
  const { data: profile, isLoading } = useProfile()
  const updateMutation  = useUpdateProfile()
  const avatarMutation  = useUploadAvatar()
  const fileInputRef    = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName ?? '',
      lastName:  profile?.lastName ?? '',
      phone:     profile?.phone ?? '',
    },
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await avatarMutation.mutateAsync(file)
      toast({ title: 'Avatar updated' })
    } catch {
      toast({ title: 'Failed to upload avatar', variant: 'destructive' })
    }
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  async function handleSubmit(values: ProfileFormValues) {
    try {
      await updateMutation.mutateAsync(values)
      toast({ title: 'Profile updated' })
      form.reset(values)
    } catch {
      toast({ title: 'Failed to update profile', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    )
  }

  const fallback = profile?.firstName?.charAt(0).toUpperCase()
    ?? profile?.email?.charAt(0).toUpperCase()
    ?? '?'

  return (
    <div className="bg-admin-surface border border-admin rounded-2xl p-6 shadow-admin space-y-6">
      <h2 className="font-heading font-bold text-base text-foreground">Profile</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className="h-16 w-16">
            {profile?.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt={profile.firstName} />
            ) : null}
            <AvatarFallback className="bg-admin-overlay text-admin-80 text-lg font-semibold">
              {fallback}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            aria-label="Upload avatar"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarMutation.isPending}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-admin-80">
            {profile?.firstName} {profile?.lastName}
          </p>
          <p className="text-xs text-admin-40">{profile?.email}</p>
          {profile?.role && (
            <Badge className={`mt-1 text-[10px] border ${roleBadgeClass(profile.role)}`}>
              {ROLE_LABELS[profile.role]}
            </Badge>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Profile form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="First name"
                      className="bg-admin-input border-admin"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Last name"
                      className="bg-admin-input border-admin"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email — read-only display */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              value={profile?.email ?? ''}
              disabled
              className="bg-admin-input border-admin opacity-60 cursor-not-allowed"
              readOnly
            />
            <p className="text-xs text-admin-30">Email cannot be changed here.</p>
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone <span className="text-admin-30">(optional)</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="+254 700 000 000"
                    className="bg-admin-input border-admin"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!form.formState.isDirty || updateMutation.isPending}
              className="bg-neon-pink hover:bg-neon-pink/90 text-white"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
