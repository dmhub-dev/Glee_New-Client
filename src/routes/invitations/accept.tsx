import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiAcceptInvitation } from '@glee/api'
import { Input, Label } from '@glee/ui'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(20, 'Password must be at most 20 characters')
    .regex(/[A-Z]/, 'Password needs at least one uppercase letter')
    .regex(/[a-z]/, 'Password needs at least one lowercase letter')
    .regex(/[0-9]/, 'Password needs at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password needs at least one special character'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine(values => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
})

type PasswordValues = z.infer<typeof passwordSchema>

export default function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  })

  async function onSubmit(values: PasswordValues) {
    if (!token) return
    setServerError(null)
    try {
      await apiAcceptInvitation(token, values.password)
      navigate('/login', {
        replace: true,
        state: { message: 'Invitation accepted. Sign in with your new password to complete your profile.' },
      })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not accept invitation. Please request a new invite.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-body p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Link to="/">
            <img src="/glee-logo-final.svg" alt="Glee" className="h-16" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-black text-foreground">Accept your invitation</h1>
            <p className="mt-1 text-sm text-admin-40">Create a secure password. You can enable email 2FA later from your security settings.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-admin bg-admin-surface p-6 shadow-admin-card">
          {serverError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          <div className="rounded-xl border border-neon-pink/20 bg-neon-pink/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-neon-pink" />
              <p className="text-xs leading-5 text-admin-70">Use 8-20 characters with uppercase, lowercase, number, and special character.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-admin-50">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                {...register('password')}
                className="border-admin bg-admin-input pr-10 placeholder:text-admin-20 focus-visible:ring-neon-pink/30"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(value => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-30 transition-colors hover:text-admin-60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs text-admin-50">Confirm password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
              className="border-admin bg-admin-input placeholder:text-admin-20 focus-visible:ring-neon-pink/30"
            />
            {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-neon-pink py-2.5 font-semibold text-white transition-colors hover:bg-[#cc2272] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Accepting...' : 'Accept Invitation'}
          </button>
        </form>
      </div>
    </div>
  )
}
