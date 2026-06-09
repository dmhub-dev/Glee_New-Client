import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../lib/auth/AuthContext'
import { apiForgotPassword, apiResetPassword } from '@glee/api'
import { Input, Label } from '@glee/ui'
import { ArrowLeft, Eye, EyeOff, KeyRound, LogIn, Mail, RotateCw, ShieldCheck } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type LoginValues = z.infer<typeof loginSchema>

const otpPattern = /^\d{6,8}$/
const otpMessage = 'Enter a 6 to 8 digit OTP'
const cleanOtp = (value: string) => value.replace(/\D/g, '').slice(0, 8)

const resetSchema = z.object({
  email: z.string().email('Enter a valid email'),
  otp: z.string().regex(otpPattern, otpMessage),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm your password'),
}).refine(values => values.password === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type ResetValues = z.infer<typeof resetSchema>

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
})
type ForgotValues = z.infer<typeof forgotSchema>

function OtpVisual({ value }: { value: string }) {
  const digits = cleanOtp(value)
  return (
    <div className="grid grid-cols-8 gap-1.5" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => {
        const filled = Boolean(digits[index])
        const required = index < 6
        return (
          <div
            key={index}
            className={[
              'h-1.5 rounded-full transition-colors',
              filled ? 'bg-neon-pink' : required ? 'bg-admin-40/50' : 'bg-admin-20/40',
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}

interface LoginPageProps {
  mode?: 'dashboard' | 'user'
}

export default function LoginPage({ mode = 'dashboard' }: LoginPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, verifyTwoFactor, logout } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [authView, setAuthView] = useState<'login' | 'forgot' | 'reset'>('login')
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  const routeState = location.state as { from?: { pathname: string }; message?: string } | null
  const from = routeState?.from?.pathname
  const isUserLogin = mode === 'user'

  function isAllowedRole(role?: string | null) {
    return isUserLogin ? role === 'user' : role !== 'user'
  }

  function defaultDestination(role?: string | null) {
    return role === 'user' ? '/app' : '/dashboard'
  }

  function destinationForAuthResult(role?: string | null, passwordChangeRequired?: boolean) {
    if (role !== 'user' && passwordChangeRequired) return '/dashboard/profile?changePassword=1'
    return from ?? defaultDestination(role)
  }

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    getValues: getResetValues,
    setValue: setResetValue,
    watch: watchReset,
    formState: { errors: resetErrors, isSubmitting: isResetSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '', otp: '', password: '', confirmPassword: '' },
  })
  const {
    register: registerForgot,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors, isSubmitting: isForgotSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
  })
  const resetOtpValue = watchReset('otp')

  async function onForgotPassword(values: ForgotValues) {
    setServerError(null)
    setResetMessage(null)
    try {
      const message = await apiForgotPassword(values.email)
      setResetValue('email', values.email)
      setResetMessage(message)
      setAuthView('reset')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not send reset code.')
    }
  }

  async function onResetPassword(values: ResetValues) {
    setServerError(null)
    setResetMessage(null)
    try {
      const message = await apiResetPassword(values)
      setResetMessage(message)
      setAuthView('login')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Could not reset password.')
    }
  }

  async function onSubmit(values: LoginValues) {
    setServerError(null)
    try {
      const result = await login(values.email, values.password)
      if (result.requiresTwoFactor) {
        if (!isAllowedRole(result.role)) {
          setServerError(isUserLogin ? 'Use the dashboard login for staff accounts.' : 'Use the user login for customer accounts.')
          return
        }
        setTwoFactorEmail(result.email ?? values.email)
        return
      }
      if (!isAllowedRole(result.role)) {
        await logout()
        setServerError(isUserLogin ? 'Use the dashboard login for staff accounts.' : 'Use the user login for customer accounts.')
        return
      }
      navigate(destinationForAuthResult(result.role, result.passwordChangeRequired), { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    }
  }

  async function onVerifyTwoFactor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!twoFactorEmail) return
    setServerError(null)
    setIsVerifying(true)
    try {
      const result = await verifyTwoFactor(twoFactorEmail, otp.trim())
      if (!isAllowedRole(result.role)) {
        await logout()
        setServerError(isUserLogin ? 'Use the dashboard login for staff accounts.' : 'Use the user login for customer accounts.')
        return
      }
      navigate(destinationForAuthResult(result.role, result.passwordChangeRequired), { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-admin-body flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo + heading */}
        <div className="flex flex-col items-center gap-4">
          <Link to="/"><img src="/glee-logo-final.svg" alt="Glee" className="h-16" /></Link>
          <div className="text-center">
            <h1 className="font-heading font-black text-2xl text-foreground">{isUserLogin ? 'Glee Account' : 'Glee Dashboard'}</h1>
            <p className="text-sm text-admin-40 mt-1">{isUserLogin ? 'Sign in to your customer account' : 'Sign in to continue'}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-admin-surface border border-admin rounded-2xl p-6 space-y-5 shadow-admin-card">

          {serverError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              {serverError}
            </div>
          )}
          {routeState?.message && !serverError && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3">
              {routeState.message}
            </div>
          )}

          {resetMessage && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3">
              {resetMessage}
            </div>
          )}

          {authView === 'forgot' ? (
            <form onSubmit={handleForgotSubmit(onForgotPassword)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email" className="text-xs text-admin-50">Email address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...registerForgot('email')}
                  className="bg-admin-input border-admin focus-visible:ring-neon-pink/30 placeholder:text-admin-20"
                />
                {forgotErrors.email && <p className="text-xs text-red-400">{forgotErrors.email.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isForgotSubmitting}
                className="w-full bg-neon-pink hover:bg-[#cc2272] disabled:opacity-60 text-white font-semibold py-2.5 rounded-full transition-colors"
              >
                {isForgotSubmitting ? 'Sending code...' : 'Send Reset Code'}
              </button>
              <button type="button" onClick={() => { setAuthView('login'); setServerError(null) }} className="w-full text-xs text-admin-40 hover:text-admin-70">
                Back to login
              </button>
            </form>
          ) : authView === 'reset' ? (
            <form onSubmit={handleResetSubmit(onResetPassword)} className="space-y-5">
              <div className="rounded-xl border border-neon-pink/20 bg-neon-pink/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-pink text-white shadow-lg shadow-neon-pink/20">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Secure password reset</p>
                    <p className="mt-1 text-xs leading-5 text-admin-50">Enter the 6-8 digit code from your inbox, then set a new password.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reset-code-email" className="text-xs text-admin-50">Email address</Label>
                <Input id="reset-code-email" type="email" {...registerReset('email')} className="bg-admin-input border-admin focus-visible:ring-neon-pink/30" />
                {resetErrors.email && <p className="text-xs text-red-400">{resetErrors.email.message}</p>}
              </div>
              <div className="space-y-2 rounded-xl border border-admin bg-admin-input/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="reset-otp" className="text-xs font-semibold uppercase text-admin-50">OTP code</Label>
                  <span className="rounded-full border border-admin bg-admin-surface px-2 py-0.5 text-[10px] font-semibold text-admin-50">6-8 digits</span>
                </div>
                <Input
                  id="reset-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  placeholder="12345678"
                  value={resetOtpValue}
                  onChange={(event) => setResetValue('otp', cleanOtp(event.target.value), { shouldValidate: true })}
                  className="h-14 border-admin bg-admin-surface text-center font-mono text-2xl font-semibold tracking-[0.35em] text-foreground placeholder:tracking-[0.25em] placeholder:text-admin-20 focus-visible:ring-neon-pink/30"
                />
                <OtpVisual value={resetOtpValue} />
                {resetErrors.otp && <p className="text-xs text-red-400">{resetErrors.otp.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs text-admin-50">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" {...registerReset('password')} className="bg-admin-input border-admin focus-visible:ring-neon-pink/30" />
                {resetErrors.password && <p className="text-xs text-red-400">{resetErrors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password" className="text-xs text-admin-50">Confirm password</Label>
                <Input id="confirm-new-password" type="password" autoComplete="new-password" {...registerReset('confirmPassword')} className="bg-admin-input border-admin focus-visible:ring-neon-pink/30" />
                {resetErrors.confirmPassword && <p className="text-xs text-red-400">{resetErrors.confirmPassword.message}</p>}
              </div>
              <button type="submit" disabled={isResetSubmitting} className="w-full bg-neon-pink hover:bg-[#cc2272] disabled:opacity-60 text-white font-semibold py-2.5 rounded-full transition-colors">
                {isResetSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => onForgotPassword({ email: getResetValues('email') })} className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-admin-40 hover:text-admin-70">
                <RotateCw className="h-3.5 w-3.5" />
                Resend code
              </button>
            </form>
          ) : twoFactorEmail ? (
            <form onSubmit={onVerifyTwoFactor} className="space-y-5">
              <div className="rounded-xl border border-neon-pink/20 bg-neon-pink/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neon-pink text-white shadow-lg shadow-neon-pink/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Two-factor verification</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-admin-50">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Code sent to {twoFactorEmail}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-admin bg-admin-input/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="otp" className="text-xs font-semibold uppercase text-admin-50">Verification code</Label>
                  <span className="rounded-full border border-admin bg-admin-surface px-2 py-0.5 text-[10px] font-semibold text-admin-50">6-8 digits</span>
                </div>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={otp}
                  onChange={e => setOtp(cleanOtp(e.target.value))}
                  className="h-14 border-admin bg-admin-surface text-center font-mono text-2xl font-semibold tracking-[0.35em] text-foreground placeholder:tracking-[0.25em] placeholder:text-admin-20 focus-visible:ring-neon-pink/30"
                  placeholder="12345678"
                />
                <OtpVisual value={otp} />
                {otp && !otpPattern.test(otp.trim()) && <p className="text-xs text-admin-40">Code must be 6 to 8 digits.</p>}
              </div>
              <button
                type="submit"
                disabled={isVerifying || !otpPattern.test(otp.trim())}
                className="w-full flex items-center justify-center gap-2 bg-neon-pink hover:bg-[#cc2272] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors mt-1"
              >
                {isVerifying ? 'Verifying…' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={() => { setTwoFactorEmail(null); setOtp('') }}
                className="flex w-full items-center justify-center gap-2 text-xs font-semibold text-admin-40 transition-colors hover:text-admin-70"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to password login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-admin-50">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={isUserLogin ? 'you@example.com' : 'admin@glee.co.ke'}
                {...register('email')}
                className="bg-admin-input border-admin focus-visible:ring-neon-pink/30 placeholder:text-admin-20"
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-admin-50">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="bg-admin-input border-admin focus-visible:ring-neon-pink/30 pr-10 placeholder:text-admin-20"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-30 hover:text-admin-60 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
              {isUserLogin && (
                <button
                  type="button"
                  onClick={() => { setAuthView('forgot'); setServerError(null); setResetMessage(null) }}
                  className="text-xs font-semibold text-neon-pink hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-neon-pink hover:bg-[#cc2272] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors mt-1"
            >
              {isSubmitting
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <LogIn className="w-4 h-4" />
              }
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>

            </form>
          )}
        </div>

        {isUserLogin && (
          <p className="text-center text-xs text-admin-30">
            New to Glee? <Link to="/signup" className="font-semibold text-neon-pink hover:underline">Create an account</Link>
          </p>
        )}
      </div>
    </div>
  )
}
