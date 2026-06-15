import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { apiCheckUserExists, apiRegisterUser, apiVerifySignupOtp } from '@glee/api'
import { Input, Label } from '@glee/ui'
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck, ShieldCheck, Sparkles, Ticket, UserPlus, Wallet, XCircle, type LucideIcon } from 'lucide-react'

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

const otpPattern = /^\d{6,8}$/
const cleanOtp = (value: string) => value.replace(/\D/g, '').slice(0, 8)

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
      navigate('/user/login', { replace: true, state: { message: 'Account verified. Please sign in.' } })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Invalid verification code.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#10101d] px-4 py-6 text-white sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/12 bg-[#07021d] shadow-[0_24px_80px_rgba(0,0,0,0.42)] lg:grid-cols-2">
        <BenefitsPanel />

        <div className="relative order-1 w-full space-y-6 p-5 sm:p-6 lg:order-2 lg:p-8">
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-neon-pink/80 to-transparent" />
          <div className="flex flex-col items-center gap-4">
            <Link to="/">
              <img src="/glee-logo-final.svg" alt="Glee" className="h-16" />
            </Link>
            <div className="text-center">
              <h1 className="font-heading text-2xl font-black text-white">Create your Glee account</h1>
              <p className="mt-1 text-sm text-white/55">Sign up, confirm your email, then start buying event tickets.</p>
            </div>
          </div>

          <div className="space-y-5">
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
                <Label htmlFor="otp" className="text-xs text-white/55">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={otp}
                  onChange={event => setOtp(cleanOtp(event.target.value))}
                  className="border-white/10 bg-white/5 text-center text-white tracking-[0.35em] focus-visible:ring-neon-pink/30"
                  placeholder="12345678"
                />
                {otp && !otpPattern.test(otp.trim()) && <p className="text-xs text-white/45">Code must be 6 to 8 digits.</p>}
              </div>

              <button
                type="submit"
                disabled={isVerifying || !otpPattern.test(otp.trim())}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-neon-pink py-2.5 font-semibold text-white transition-colors hover:bg-[#cc2272] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? 'Verifying...' : 'Verify Account'}
              </button>

              <button
                type="button"
                onClick={() => { setRegisteredEmail(null); setOtp('') }}
                className="w-full text-xs text-white/45 transition-colors hover:text-white/75"
              >
                Edit signup details
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs text-white/55">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Jane Wanjiku"
                  {...register('name')}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-neon-pink/30"
                />
                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-white/55">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email', {
                    onChange: () => setEmailCheck({ status: 'idle' }),
                    onBlur: event => { void checkEmailAvailability(event.target.value) },
                  })}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-neon-pink/30"
                />
                {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                {!errors.email && emailCheck.status !== 'idle' && (
                  <p className={[
                    'flex items-center gap-1.5 text-xs',
                    emailCheck.status === 'available' ? 'text-green-400' : emailCheck.status === 'checking' ? 'text-white/45' : 'text-red-400',
                  ].join(' ')}>
                    {emailCheck.status === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
                    {emailCheck.status === 'available' && <CheckCircle2 className="h-3 w-3" />}
                    {(emailCheck.status === 'taken' || emailCheck.status === 'invalid') && <XCircle className="h-3 w-3" />}
                    {emailCheck.message ?? 'Checking email...'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-white/55">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    {...register('password')}
                    className="border-white/10 bg-white/5 pr-10 text-white placeholder:text-white/30 focus-visible:ring-neon-pink/30"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(value => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                {!errors.password && (
                  <p className="text-xs text-white/45">Use 8-20 characters with uppercase, lowercase, number, and special character.</p>
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

          <p className="text-center text-xs text-white/42">
            Already have an account? <Link to="/user/login" className="font-semibold text-neon-pink hover:underline">Sign in</Link>
          </p>
        </div>

        </div>
      </div>
    </div>
  )
}

function BenefitsPanel() {
  return (
    <section className="relative order-2 w-full border-t border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025)_48%,rgba(255,0,122,0.1))] p-5 sm:p-6 lg:order-1 lg:border-r lg:border-t-0 lg:p-8">
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-neon-pink/80 to-transparent" />
      <div className="absolute bottom-0 right-0 h-32 w-32 bg-neon-pink/10 blur-3xl" />

      <div className="relative z-10 space-y-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-neon-pink">
            <Sparkles className="h-3 w-3" />
            Member Access
          </div>

          <h2 className="mt-4 max-w-xl font-heading text-3xl font-black leading-none text-white sm:text-4xl">
            Your nights move better inside Glee.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/64">
            Create your Glee account to keep tickets, wallet payments, and checkout details ready whenever a plan becomes real.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <SignupBenefit icon={Ticket} title="Ticket vault" text="Bought passes, QR codes, and event details stay organized." />
          <SignupBenefit icon={Wallet} title="Wallet-ready" text="Top up once and pay quickly for eligible events." />
          <SignupBenefit icon={ShieldCheck} title="Priority flow" text="Save account details so checkout takes fewer steps." />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
          <MiniStat value="Fast" label="checkout" tone="pink" />
          <MiniStat value="QR" label="tickets" tone="cyan" />
          <MiniStat value="Pay" label="wallet" tone="white" />
        </div>
      </div>
    </section>
  )
}

function SignupBenefit({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="group flex gap-3 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-0.5 hover:bg-white/[0.1]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neon-pink/14 text-neon-pink ring-1 ring-neon-pink/15 transition-colors group-hover:bg-neon-pink group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-white/55">{text}</p>
      </div>
    </div>
  )
}

function MiniStat({ value, label, tone }: { value: string; label: string; tone: 'pink' | 'cyan' | 'white' }) {
  const toneClass = tone === 'pink' ? 'text-neon-pink' : tone === 'cyan' ? 'text-cyan-300' : 'text-white'
  return (
    <div className="rounded-2xl bg-black/20 px-3 py-3 text-center ring-1 ring-white/10">
      <p className={`text-sm font-black ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/42">{label}</p>
    </div>
  )
}
