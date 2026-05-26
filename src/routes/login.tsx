import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../lib/auth/AuthContext'
import { Input, Label } from '@glee/ui'
import { Eye, EyeOff, LogIn } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, verifyTwoFactor } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginValues) {
    setServerError(null)
    try {
      const result = await login(values.email, values.password)
      if (result.requiresTwoFactor) {
        setTwoFactorEmail(result.email ?? values.email)
        return
      }
      navigate(from, { replace: true })
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
      await verifyTwoFactor(twoFactorEmail, otp.trim())
      navigate(from, { replace: true })
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
          <img src="/glee-logo-final.svg" alt="Glee" className="h-16" />
          <div className="text-center">
            <h1 className="font-heading font-black text-2xl text-foreground">Admin Panel</h1>
            <p className="text-sm text-admin-40 mt-1">Sign in to manage your platform</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-admin-surface border border-admin rounded-2xl p-6 space-y-5 shadow-admin-card">

          {serverError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              {serverError}
            </div>
          )}

          {twoFactorEmail ? (
            <form onSubmit={onVerifyTwoFactor} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-xs text-admin-50">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  className="bg-admin-input border-admin focus-visible:ring-neon-pink/30 tracking-[0.35em] text-center"
                  placeholder="000000"
                />
                <p className="text-xs text-admin-40">Code sent to {twoFactorEmail}</p>
              </div>
              <button
                type="submit"
                disabled={isVerifying || otp.trim().length < 4}
                className="w-full flex items-center justify-center gap-2 bg-neon-pink hover:bg-[#cc2272] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-full transition-colors mt-1"
              >
                {isVerifying ? 'Verifying…' : 'Verify Code'}
              </button>
              <button
                type="button"
                onClick={() => { setTwoFactorEmail(null); setOtp('') }}
                className="w-full text-xs text-admin-40 hover:text-admin-70 transition-colors"
              >
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
                placeholder="admin@glee.co.ke"
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

        <p className="text-center text-xs text-admin-20">Glee Admin · Restricted Access</p>
      </div>
    </div>
  )
}
