// apps/admin/src/routes/settings/components/ProfileForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Badge,
  Button,
  Input,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  Skeleton,
  useToast,
} from '@glee/ui'
import { useProfile, useUpdateProfile } from '@glee/api'
import { ROLE_LABELS, roleBadgeClass } from './roleConstants'
import { AvatarUpload } from './AvatarUpload'

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  phone:     z.string().optional(),
})
type ProfileFormValues = z.infer<typeof profileSchema>

export function ProfileForm() {
  const { toast } = useToast()
  const { data: profile, isLoading } = useProfile()
  const updateMutation = useUpdateProfile()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName ?? '',
      lastName:  profile?.lastName ?? '',
      phone:     profile?.phone ?? '',
    },
  })

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

  return (
    <div className="bg-admin-surface border border-admin rounded-2xl p-6 shadow-admin space-y-6">
      <h2 className="font-heading font-bold text-base text-foreground">Profile</h2>

      {profile && <AvatarUpload profileData={profile} />}

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
                    <Input placeholder="First name" className="bg-admin-input border-admin" {...field} />
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
                    <Input placeholder="Last name" className="bg-admin-input border-admin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email — read-only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              value={profile?.email ?? ''}
              disabled
              readOnly
              className="bg-admin-input border-admin opacity-60 cursor-not-allowed"
            />
            <p className="text-xs text-admin-30">Email cannot be changed here.</p>
          </div>

          {/* Role — read-only */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Role</label>
            <div className="flex items-center h-10 px-3 rounded-md border border-admin bg-admin-input opacity-60">
              {profile?.role && (
                <Badge className={`text-xs border ${roleBadgeClass(profile.role)}`}>
                  {ROLE_LABELS[profile.role]}
                </Badge>
              )}
            </div>
            <p className="text-xs text-admin-30">Role is assigned by an administrator.</p>
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone <span className="text-admin-30">(optional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="+254 700 000 000" className="bg-admin-input border-admin" {...field} />
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
