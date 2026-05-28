import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProfile, useUpdateProfile } from '@glee/api'
import { Button, Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Skeleton, Textarea, useToast } from '@glee/ui'
import { Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../lib/auth/AuthContext'

const completeProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().min(7, 'Phone number is required'),
  address: z.string().trim().optional(),
})

type CompleteProfileValues = z.infer<typeof completeProfileSchema>

function destinationForRole(role?: string | null) {
  return role === 'user' ? '/app/events' : '/dashboard'
}

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const { toast } = useToast()

  const form = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    values: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
    },
  })

  useEffect(() => {
    if (!profile) return
    form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? '',
      address: profile.address ?? '',
    })
  }, [profile])

  async function onSubmit(values: CompleteProfileValues) {
    try {
      await updateProfile.mutateAsync(values)
      const refreshed = await refreshUser()
      toast({ title: 'Profile completed' })
      navigate(destinationForRole(refreshed?.role ?? user?.role), { replace: true })
    } catch (error) {
      toast({
        title: 'Could not complete profile',
        description: error instanceof Error ? error.message : 'Please check your details and try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-admin-body px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-admin bg-admin-surface shadow-admin-card lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="bg-admin-input p-6 sm:p-8">
            <img src="/glee-logo-final.svg" alt="Glee" className="h-14" />
            <div className="mt-10 space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-pink/20 bg-neon-pink/10 text-neon-pink">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-heading text-3xl font-black text-foreground">Complete your profile</h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-admin-50">
                  Add the required personal details before continuing. This keeps account activity, bookings, and audit trails attached to the correct person.
                </p>
              </div>
            </div>
            <div className="mt-10 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-admin bg-admin-surface p-3">
                <Mail className="h-4 w-4 text-neon-pink" />
                <div className="min-w-0">
                  <p className="text-xs text-admin-40">Signed in as</p>
                  <p className="truncate text-sm font-semibold text-foreground">{profile?.email ?? user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-admin bg-admin-surface p-3">
                <UserRound className="h-4 w-4 text-neon-pink" />
                <div>
                  <p className="text-xs text-admin-40">Role</p>
                  <p className="text-sm font-semibold capitalize text-foreground">{profile?.role ?? user?.role}</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="p-6 sm:p-8">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-72 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <h2 className="font-heading text-2xl font-black text-foreground">Personal details</h2>
                    <p className="mt-1 text-sm text-admin-50">You can update these later from your profile page.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl><Input className="border-admin bg-admin-input" autoComplete="given-name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl><Input className="border-admin bg-admin-input" autoComplete="family-name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-30" />
                          <Input className="border-admin bg-admin-input pl-10" autoComplete="tel" placeholder="+254 700 000 000" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Textarea className="min-h-24 border-admin bg-admin-input" placeholder="Optional" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" disabled={updateProfile.isPending} className="w-full rounded-full bg-neon-pink text-white hover:bg-neon-pink/90 sm:w-auto">
                    {updateProfile.isPending ? 'Saving...' : 'Continue'}
                  </Button>
                </form>
              </Form>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
