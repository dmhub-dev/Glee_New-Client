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
    <div className="min-h-screen bg-[#10101d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.3)] lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="border-b border-white/10 bg-black/20 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <img src="/glee-logo-final.svg" alt="Glee" className="h-16" />
            <div className="mt-10 space-y-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-pink/25 bg-neon-pink/12 text-neon-pink">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neon-pink">Account setup</p>
                <h1 className="mt-3 font-heading text-4xl font-black leading-none text-white">Complete your profile</h1>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/58">
                  Add required details before continuing. This keeps bookings, tickets, and account activity attached to correct person.
                </p>
              </div>
            </div>
            <div className="mt-10 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                <Mail className="h-4 w-4 text-neon-pink" />
                <div className="min-w-0">
                  <p className="text-xs text-white/40">Signed in as</p>
                  <p className="truncate text-sm font-semibold text-white">{profile?.email ?? user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                <UserRound className="h-4 w-4 text-neon-pink" />
                <div>
                  <p className="text-xs text-white/40">Role</p>
                  <p className="text-sm font-semibold capitalize text-white">{profile?.role ?? user?.role}</p>
                </div>
              </div>
            </div>
          </aside>

          <main className="p-6 sm:p-8">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-48 bg-white/10" />
                <Skeleton className="h-72 w-full rounded-2xl bg-white/10" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div>
                    <h2 className="font-heading text-2xl font-black text-white">Personal details</h2>
                    <p className="mt-1 text-sm text-white/55">You can update these later from your profile page.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">First name</FormLabel>
                        <FormControl><Input className="rounded-full border-white/15 bg-black/20 text-white" autoComplete="given-name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/70">Last name</FormLabel>
                        <FormControl><Input className="rounded-full border-white/15 bg-black/20 text-white" autoComplete="family-name" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                      <FormLabel className="text-white/70">Phone number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                          <Input className="rounded-full border-white/15 bg-black/20 pl-10 text-white placeholder:text-white/35" autoComplete="tel" placeholder="+254 700 000 000" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70">Address</FormLabel>
                      <FormControl><Textarea className="min-h-24 rounded-2xl border-white/15 bg-black/20 text-white placeholder:text-white/35" placeholder="Optional" {...field} /></FormControl>
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
