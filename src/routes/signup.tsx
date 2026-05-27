import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiCheckUserExists, apiRegisterUser, apiVerifySignupOtp } from '@glee/api'
import { Input, Label } from '@glee/ui'
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck, UserPlus, XCircle } from 'lucide-react'

const signupSchema = z.object({
  name: z.string().min(3, 'Full name must be at least 3 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(20, 'Password must be at most 20 characters')
    .regex(/[A-Z]/, 'Password needs at least one uppercase letter')
    .regex(/[a-z]/, 'Password needs at least one lowercase letter')
    .regex(/[0-9]/, 'Password needs at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password needs at least one special character'),
})

type SignupValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [emailCheck, setEmailCheck] = useState<{ status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'; message?: string }>({ status: 'idle' })

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  })

  async function checkEmailAvailability(email = getValues('email')) {
    const parsed = z.string().email().safeParse(email)
    if (!parsed.success) {
      setEmailCheck({ status: email ? 'invalid' : 'idle', message: email ? 'Enter a valid email before checking.' : undefined })
      return false
    }

    setEmailCheck({ status: 'checking' })
    try {
      const result = await apiCheckUserExists(parsed.data)
      const exists = result.isUserExists
      setEmailCheck({
        status: exists ? 'taken' : 'available',
        message: exists ? 'This email is already registered.' : 'Email is available.',
      })
      return !exists
    } catch {
      setEmailCheck({ status: 'idle', message: 'Could not check email right now.' })
      return true
    }
  }

  async function onSubmit(values: SignupValues) {
    setServerError(null)
    try {
      const canUseEmail = await checkEmailAvailability(values.email)
      if (!canUseEmail) return
      await apiRegisterUser(values)
      setRegisteredEmail(values.email)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not create account. Please try again.')
    }
  }

  async function onVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!registeredEmail) return
    setServerError(null)
    setIsVerifying(true)
    try {
      await apiVerifySignupOtp(registeredEmail, otp.trim())
      navigate('/login', { replace: true, state: { message: 'Account verified. Please sign in.' } })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Invalid verification code.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-body p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-4">
          <Link to="/">
            <img src="/glee-logo-final.svg" alt="Glee" className="h-16" />
          </Link>
          <div className="text-center">
            <h1 className="font-heading text-2xl font-black text-foreground">Create your Glee account</h1>
            <p className="mt-1 text-sm text-admin-40">Sign up, confirm your email, then start booking events.</p>
          </div>
        </div>

        <div className="space-y-5 rounded-2xl border border-admin bg-admin-surface p-6 shadow-admin-card">
          {serverError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          {registeredEmail ? (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              <div className="rounded-xl border border-neon-pink/20 bg-neon-pink/10 p-4">
                <div className="flex items-start gap-3">
                  <MailCheck className="mt-0.5 h-5 w-5 text-neon-pink" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Check your email</p>
                    <p className="mt-1 text-xs leading-5 text-admin-50">We sent a verification code to {registeredEmail}.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-xs text-admin-50">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={event => setOtp(event.target.value)}
                  className="border-admin bg-admin-input text-center tracking-[0.35em] focus-visible:ring-neon-pink/30"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || otp.trim().length < 4}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-neon-pink py-2.5 font-semibold text-white transition-colors hover:bg-[#cc2272] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? 'Verifying...' : 'Verify Account'}
              </button>

              <button
                type="button"
                onClick={() => { setRegisteredEmail(null); setOtp('') }}
                className="w-full text-xs text-admin-40 transition-colors hover:text-admin-70"
              >
                Edit signup details
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-admin-50">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Jane Wanjiku"
                  {...register('name')}
                  className="border-admin bg-admin-input placeholder:text-admin-20 focus-visible:ring-neon-pink/30"
                />
                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-admin-50">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email', {
                    onChange: () => setEmailCheck({ status: 'idle' }),
                    onBlur: event => { void checkEmailAvailability(event.target.value) },
                  })}
                  className="border-admin bg-admin-input placeholder:text-admin-20 focus-visible:ring-neon-pink/30"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                {!errors.email && emailCheck.status !== 'idle' && (
                  <p className={[
                    'flex items-center gap-1.5 text-xs',
                    emailCheck.status === 'available' ? 'text-green-400' : emailCheck.status === 'checking' ? 'text-admin-40' : 'text-red-400',
                  ].join(' ')}>
                    {emailCheck.status === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {emailCheck.status === 'available' && <CheckCircle2 className="h-3 w-3" />}
                    {(emailCheck.status === 'taken' || emailCheck.status === 'invalid') && <XCircle className="h-3 w-3" />}
                    {emailCheck.message ?? 'Checking email...'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-admin-50">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
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
                {!errors.password && (
                  <p className="text-xs text-admin-40">Use 8-20 characters with uppercase, lowercase, number, and special character.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || emailCheck.status === 'checking' || emailCheck.status === 'taken'}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-neon-pink py-2.5 font-semibold text-white transition-colors hover:bg-[#cc2272] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-admin-30">
          Already have an account? <Link to="/login" className="font-semibold text-neon-pink hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
