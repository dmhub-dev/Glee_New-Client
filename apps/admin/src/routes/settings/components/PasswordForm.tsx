// apps/admin/src/routes/settings/components/PasswordForm.tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  Button,
  Input,
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
  useToast,
} from '@glee/ui'
import { useChangePassword } from '../../../lib/queries/profile'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword:     z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export function PasswordForm() {
  const { toast }     = useToast()
  const [open, setOpen] = useState(false)
  const mutation      = useChangePassword()

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword:     '',
      confirmPassword: '',
    },
  })

  async function handleSubmit(values: PasswordFormValues) {
    try {
      await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword:     values.newPassword,
      })
      toast({ title: 'Password changed successfully' })
      form.reset()
      setOpen(false)
    } catch {
      toast({ title: 'Failed to change password', variant: 'destructive' })
    }
  }

  return (
    <div className="bg-admin-surface border border-admin rounded-2xl shadow-admin overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-admin-overlay transition-colors"
      >
        <span className="font-heading font-bold text-base text-foreground">Change password</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-admin-40" />
        ) : (
          <ChevronDown className="h-4 w-4 text-admin-40" />
        )}
      </button>

      {/* Collapsible form */}
      {open && (
        <div className="px-6 pb-6 border-t border-admin">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter current password"
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
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Min. 8 characters"
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
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Repeat new password"
                        className="bg-admin-input border-admin"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { form.reset(); setOpen(false) }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending || !form.formState.isDirty}
                  className="bg-neon-pink hover:bg-neon-pink/90 text-white"
                >
                  {mutation.isPending ? 'Saving…' : 'Update password'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}
