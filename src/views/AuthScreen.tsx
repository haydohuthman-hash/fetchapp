import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { refreshSessionFromSupabase } from '../lib/fetchUserSession'
import { getSupabaseBrowserClient } from '../lib/supabase/client'
import { getOAuthRedirectTo } from '../lib/supabase/oauthSession'
import { getFetchDevDemoPasswordPrefill } from '../lib/fetchDevDemo'
import { requestEntryAddressSheetAfterSignup } from '../lib/fetchEntryAddressOnboarding'
import mascotUrl from '../assets/fetchit-mascot-phone-transparent.png'

type AuthScreenProps = {
  /** Called after Supabase session is valid — parent runs `handlePostAuthUser`. */
  onSignedIn: (user: User) => void | Promise<void>
  onBack: () => void
}

type SignupStep = 'welcome' | 'create' | 'verify'

function mapServerAuthError(code: string): string {
  switch (code) {
    case 'email_taken':
      return 'That email already has an account. Sign in instead.'
    case 'invalid_credentials':
      return 'Email or password is incorrect.'
    case 'password_too_short':
      return 'Password must be at least 8 characters.'
    case 'display_name_required':
      return 'Enter your name.'
    case 'invalid_email':
      return 'Enter a valid email.'
    default:
      return 'Something went wrong. Try again.'
  }
}

function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; tone: string } {
  let score = 0
  if (pw.length >= 8) score += 1
  if (/[A-Z]/.test(pw)) score += 1
  if (/[0-9]/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1
  const labels = ['Too short', 'Weak', 'Okay', 'Strong password!', 'Strong password!']
  const tones = [
    'text-zinc-400',
    'text-red-500',
    'text-amber-500',
    'text-emerald-600',
    'text-emerald-600',
  ]
  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    label: pw.length === 0 ? '' : labels[score],
    tone: tones[score],
  }
}

const RESEND_SECONDS = 45

export default function AuthScreen({ onSignedIn, onBack }: AuthScreenProps) {
  const [step, setStep] = useState<SignupStep>('welcome')
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(getFetchDevDemoPasswordPrefill)
  const [referralCode, setReferralCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [code, setCode] = useState<string[]>(['', '', '', '', '', ''])
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)
  const codeRefs = useRef<Array<HTMLInputElement | null>>([])

  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const strength = useMemo(() => passwordStrength(password), [password])

  useEffect(() => {
    if (step !== 'verify') return
    setResendIn(RESEND_SECONDS)
    const interval = setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [step])

  const requireAuthenticatedSessionUser = useCallback(async () => {
    const sb = getSupabaseBrowserClient()
    if (!sb) throw new Error('Supabase is not configured in this app.')
    const { data, error: sessionError } = await sb.auth.getSession()
    if (sessionError) throw sessionError
    const user = data.session?.user ?? null
    if (!user) throw new Error('Authentication incomplete. Please sign in again.')
    return user
  }, [])

  const afterSupabaseAuth = useCallback(async () => {
    const sessionUser = await requireAuthenticatedSessionUser()
    await refreshSessionFromSupabase()
    await onSignedIn(sessionUser)
  }, [onSignedIn, requireAuthenticatedSessionUser])

  const submitCreateAccount = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!fullName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    if (password.length < 8) {
      setError('Choose a password at least 8 characters long.')
      return
    }
    setBusy(true)
    try {
      const sb = getSupabaseBrowserClient()
      if (!sb) {
        setError('Supabase is not configured in this app.')
        setBusy(false)
        return
      }
      const { data, error: authError } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            referral_code: referralCode.trim() || null,
          },
        },
      })
      if (authError) throw authError
      const session = data?.session || null
      const user = data?.user || null
      if (!user) throw new Error('Signup succeeded but no user returned')
      if (!session) {
        setStep('verify')
        return
      }
      requestEntryAddressSheetAfterSignup()
      await afterSupabaseAuth()
    } catch (e) {
      const msg = e instanceof Error ? e.message : mapServerAuthError('invalid_credentials')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const submitSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }
    if (password.length < 1) {
      setError('Please enter your password.')
      return
    }
    setBusy(true)
    try {
      const sb = getSupabaseBrowserClient()
      if (!sb) {
        setError('Supabase is not configured in this app.')
        setBusy(false)
        return
      }
      const { data, error: authError } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) throw authError
      const session = data?.session || null
      const user = data?.user || null
      if (!session || !user) throw new Error('Login failed: no session')
      await afterSupabaseAuth()
    } catch (e) {
      const msg = e instanceof Error ? e.message : mapServerAuthError('invalid_credentials')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const joined = code.join('')
    if (joined.length < 6) {
      setError('Enter the 6-digit code we sent you.')
      return
    }
    setBusy(true)
    try {
      const sb = getSupabaseBrowserClient()
      if (!sb) {
        setError('Supabase is not configured in this app.')
        setBusy(false)
        return
      }
      const { data, error: authError } = await sb.auth.verifyOtp({
        email: email.trim(),
        token: joined,
        type: 'email',
      })
      if (authError) throw authError
      if (!data.session || !data.user) {
        setMessage('Code accepted. Continuing…')
      }
      requestEntryAddressSheetAfterSignup()
      await afterSupabaseAuth()
    } catch (e) {
      const msg = e instanceof Error ? e.message : mapServerAuthError('invalid_credentials')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const oauthWith = async (provider: 'google' | 'apple') => {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        setError('Supabase is not configured in this app.')
        setBusy(false)
        return
      }
      const redirectTo = getOAuthRedirectTo()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      })
      if (oauthError) setError(oauthError.message || `${provider} sign-in failed.`)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (resendIn > 0) return
    setMessage(null)
    setError(null)
    try {
      const sb = getSupabaseBrowserClient()
      if (!sb) return
      await sb.auth.resend({ type: 'signup', email: email.trim() })
      setMessage('We sent a fresh code to your inbox.')
      setResendIn(RESEND_SECONDS)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not resend code right now.'
      setError(msg)
    }
  }

  const setCodeAt = (idx: number, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 1)
    setCode((prev) => {
      const next = [...prev]
      next[idx] = cleaned
      return next
    })
    if (cleaned && idx < 5) codeRefs.current[idx + 1]?.focus()
  }

  const onCodeKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      codeRefs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      codeRefs.current[idx - 1]?.focus()
    } else if (e.key === 'ArrowRight' && idx < 5) {
      codeRefs.current[idx + 1]?.focus()
    }
  }

  const onCodePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setCode(next)
    const focusIdx = Math.min(text.length, 5)
    codeRefs.current[focusIdx]?.focus()
  }

  const handleRestart = () => {
    setStep('welcome')
    setMode('signup')
    setError(null)
    setMessage(null)
  }

  return (
    <div className="fetch-auth-flow relative mx-auto flex min-h-dvh min-h-[100dvh] w-full max-w-lg flex-col bg-[#f6f4fc]">
      <ConfettiCanvas />

      <header className="fetch-auth-flow__header relative z-[2] flex shrink-0 items-center justify-center px-4 pb-2 pt-[max(0.8rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => {
            if (step === 'create') {
              setStep('welcome')
              setError(null)
              setMessage(null)
              return
            }
            if (step === 'verify') {
              setStep('create')
              setError(null)
              setMessage(null)
              return
            }
            onBack()
          }}
          className="absolute left-4 top-[max(0.8rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-800 ring-1 ring-zinc-200 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.18)] transition-colors active:bg-zinc-50"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <AuthBrandLockup />

        <button
          type="button"
          onClick={handleRestart}
          className="absolute right-4 top-[max(1.15rem,env(safe-area-inset-top))] text-[12px] font-semibold text-zinc-400 transition-colors hover:text-zinc-700"
        >
          {step === 'welcome' ? '\u00A0' : 'Restart'}
        </button>
      </header>

      <main className="relative z-[1] flex min-h-0 flex-1 flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {step === 'welcome' ? (
          <WelcomeStep
            onPrimary={() => {
              setMode('signup')
              setStep('create')
              setError(null)
              setMessage(null)
            }}
            onLogin={() => {
              setMode('signin')
              setStep('create')
              setError(null)
              setMessage(null)
            }}
            onOAuth={(p) => void oauthWith(p)}
            busy={busy}
          />
        ) : step === 'create' ? (
          mode === 'signup' ? (
            <CreateAccountStep
              fullName={fullName}
              email={email}
              password={password}
              referralCode={referralCode}
              showPassword={showPassword}
              strength={strength}
              busy={busy}
              error={error}
              message={message}
              onFullName={setFullName}
              onEmail={setEmail}
              onPassword={setPassword}
              onReferral={setReferralCode}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onSubmit={submitCreateAccount}
              onSwitchSignIn={() => {
                setMode('signin')
                setError(null)
                setMessage(null)
              }}
            />
          ) : (
            <SignInStep
              email={email}
              password={password}
              showPassword={showPassword}
              busy={busy}
              error={error}
              message={message}
              onEmail={setEmail}
              onPassword={setPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onSubmit={submitSignIn}
              onSwitchSignUp={() => {
                setMode('signup')
                setError(null)
                setMessage(null)
              }}
            />
          )
        ) : (
          <VerifyStep
            email={email}
            code={code}
            codeRefs={codeRefs}
            busy={busy}
            error={error}
            message={message}
            resendIn={resendIn}
            onChangeCodeAt={setCodeAt}
            onKeyDownAt={onCodeKeyDown}
            onPaste={onCodePaste}
            onSubmit={verifyCode}
            onResend={resend}
          />
        )}
      </main>
    </div>
  )
}

/* -------------------------------- WELCOME -------------------------------- */

type WelcomeProps = {
  onPrimary: () => void
  onLogin: () => void
  onOAuth: (provider: 'google' | 'apple') => void
  busy: boolean
}

function WelcomeStep({ onPrimary, onLogin, onOAuth, busy }: WelcomeProps) {
  return (
    <section
      className="relative flex flex-1 flex-col"
      aria-labelledby="fetch-auth-welcome-title"
    >
      <h1
        id="fetch-auth-welcome-title"
        className="mt-9 text-center text-[26px] font-black leading-[1.1] tracking-tight text-zinc-900 sm:mt-10 sm:text-[28px]"
      >
        Win epic deals.
        <br />
        Live auctions.
        <br />
        <span className="text-[#4c1d95]">Unbeatable fun.</span>
      </h1>
      <p className="mx-auto mt-2 max-w-[18rem] text-center text-[13px] font-medium leading-snug text-zinc-500">
        Join thousands of players bidding live and winning big!
      </p>

      <div className="relative mt-1 flex flex-1 items-end justify-center overflow-visible">
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-end justify-center">
          <span className="mb-2 block h-[88%] w-[104%] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.17),transparent_72%)]" />
        </span>
        <img
          src={mascotUrl}
          alt=""
          className="relative z-[1] mb-[-1.75rem] w-[132%] max-w-none select-none object-contain drop-shadow-[0_18px_24px_rgba(15,7,40,0.22)] sm:w-[124%]"
          draggable={false}
          loading="eager"
          decoding="async"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-[-1.25rem] bottom-[-1.9rem] z-[2] h-24 bg-gradient-to-b from-transparent via-[#f6f4fc]/78 to-[#f6f4fc]"
        />
      </div>

      <div className="relative z-[2] mt-0 flex flex-col gap-2.5 pb-2">
        <button
          type="button"
          onClick={onPrimary}
          disabled={busy}
          className="fetch-auth-cta relative w-full overflow-hidden rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3.5 text-center text-[15px] font-extrabold tracking-[0.02em] text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985] disabled:opacity-60"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 6.75A2.75 2.75 0 0 1 5.75 4h12.5A2.75 2.75 0 0 1 21 6.75v10.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="m4 7 7.4 5.4a1 1 0 0 0 1.2 0L20 7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign up with Email
          </span>
        </button>

        <SocialButton
          onClick={() => onOAuth('google')}
          disabled={busy}
          label="Continue with Google"
          icon={<GoogleLogo />}
        />
        <SocialButton
          onClick={() => onOAuth('apple')}
          disabled={busy}
          label="Continue with Apple"
          icon={<AppleLogo />}
          tone="dark"
        />

        <p className="mt-1 text-center text-[12.5px] font-medium text-zinc-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onLogin}
            className="font-bold text-[#4c1d95] underline decoration-[#4c1d95]/40 underline-offset-4 transition-colors active:text-[#3b0764]"
          >
            Log in
          </button>
        </p>
        <p className="mx-auto max-w-[18rem] text-center text-[10.5px] font-medium leading-tight text-zinc-400">
          By signing up, you agree to our{' '}
          <a href="/terms" className="text-[#4c1d95] underline decoration-[#4c1d95]/30 underline-offset-2">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-[#4c1d95] underline decoration-[#4c1d95]/30 underline-offset-2">
            Privacy Policy
          </a>
        </p>
      </div>
    </section>
  )
}

function AuthBrandLockup() {
  return (
    <div className="flex min-w-0 items-start gap-2" aria-label="fetchit, bid wars">
      <svg
        viewBox="0 0 20 20"
        className="mt-0.5 h-8 w-8 shrink-0 text-[#4c1d95]"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.25 5.653c0-.856.927-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.346a1.125 1.125 0 0 1-1.667-.985V5.653z"
          clipRule="evenodd"
        />
      </svg>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-baseline font-extrabold tracking-[-0.03em]">
          <span className="text-[1.55rem] leading-none text-zinc-900">fetch</span>
          <span className="text-[1.55rem] leading-none text-[#4c1d95]">it</span>
        </div>
        <p className="text-[11px] font-black uppercase leading-none tracking-[0.2em] text-[#4c1d95]">
          BID WARS
        </p>
      </div>
    </div>
  )
}

/* ----------------------------- CREATE ACCOUNT ----------------------------- */

type CreateAccountProps = {
  fullName: string
  email: string
  password: string
  referralCode: string
  showPassword: boolean
  strength: ReturnType<typeof passwordStrength>
  busy: boolean
  error: string | null
  message: string | null
  onFullName: (v: string) => void
  onEmail: (v: string) => void
  onPassword: (v: string) => void
  onReferral: (v: string) => void
  onTogglePassword: () => void
  onSubmit: (e: FormEvent) => void
  onSwitchSignIn: () => void
}

function CreateAccountStep({
  fullName,
  email,
  password,
  referralCode,
  showPassword,
  strength,
  busy,
  error,
  message,
  onFullName,
  onEmail,
  onPassword,
  onReferral,
  onTogglePassword,
  onSubmit,
  onSwitchSignIn,
}: CreateAccountProps) {
  return (
    <section className="flex flex-1 flex-col">
      <header className="pt-1">
        <h2 className="text-[22px] font-black leading-tight tracking-tight text-zinc-900">
          Create your account
        </h2>
        <p className="mt-1 text-[13px] font-medium text-zinc-500">
          It only takes a few seconds!
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-4 flex flex-1 flex-col gap-3.5">
        <Field label="Full name">
          <FieldShell icon={<UserIcon />} valid={fullName.trim().length > 1}>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onFullName(e.target.value)}
              placeholder="Your name"
              className="fetch-auth-input"
            />
          </FieldShell>
        </Field>

        <Field label="Email address">
          <FieldShell icon={<MailIcon />} valid={/.+@.+\..+/.test(email)}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onEmail(e.target.value)}
              placeholder="you@email.com"
              className="fetch-auth-input"
            />
          </FieldShell>
        </Field>

        <Field label="Password">
          <FieldShell
            icon={<LockIcon />}
            trailing={
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={onTogglePassword}
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition-colors hover:text-zinc-700"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          >
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="fetch-auth-input"
            />
          </FieldShell>
          <PasswordStrength strength={strength} />
        </Field>

        <Field label="Referral code (optional)">
          <FieldShell icon={<TagIcon />}>
            <input
              type="text"
              value={referralCode}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onReferral(e.target.value.toUpperCase())
              }
              placeholder="FETCHIT15"
              className="fetch-auth-input uppercase tracking-[0.06em]"
            />
          </FieldShell>
          {referralCode.trim().length > 0 ? (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-[11.5px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <span aria-hidden>🎉</span>
              Nice! You'll both get a $15 bidding bonus
            </p>
          ) : null}
        </Field>

        {error ? (
          <p className="text-[12px] font-medium text-red-600">{error}</p>
        ) : message ? (
          <p className="text-[12px] font-medium text-emerald-700">{message}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="fetch-auth-cta w-full rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3.5 text-[15px] font-extrabold text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985] disabled:opacity-60"
          >
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
          <p className="text-center text-[10.5px] font-medium text-zinc-400">
            By creating an account, you agree to our{' '}
            <a href="/terms" className="text-[#4c1d95] underline decoration-[#4c1d95]/30 underline-offset-2">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-[#4c1d95] underline decoration-[#4c1d95]/30 underline-offset-2">
              Privacy Policy
            </a>
          </p>
          <button
            type="button"
            onClick={onSwitchSignIn}
            className="mt-1 text-center text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Already have an account?{' '}
            <span className="font-bold text-[#4c1d95]">Log in</span>
          </button>
        </div>
      </form>
    </section>
  )
}

/* --------------------------------- SIGN IN -------------------------------- */

type SignInProps = {
  email: string
  password: string
  showPassword: boolean
  busy: boolean
  error: string | null
  message: string | null
  onEmail: (v: string) => void
  onPassword: (v: string) => void
  onTogglePassword: () => void
  onSubmit: (e: FormEvent) => void
  onSwitchSignUp: () => void
}

function SignInStep({
  email,
  password,
  showPassword,
  busy,
  error,
  message,
  onEmail,
  onPassword,
  onTogglePassword,
  onSubmit,
  onSwitchSignUp,
}: SignInProps) {
  return (
    <section className="flex flex-1 flex-col">
      <header className="pt-1">
        <h2 className="text-[22px] font-black leading-tight tracking-tight text-zinc-900">
          Welcome back
        </h2>
        <p className="mt-1 text-[13px] font-medium text-zinc-500">
          Log in to keep bidding and winning.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-4 flex flex-1 flex-col gap-3.5">
        <Field label="Email address">
          <FieldShell icon={<MailIcon />} valid={/.+@.+\..+/.test(email)}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onEmail(e.target.value)}
              placeholder="you@email.com"
              className="fetch-auth-input"
            />
          </FieldShell>
        </Field>

        <Field label="Password">
          <FieldShell
            icon={<LockIcon />}
            trailing={
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={onTogglePassword}
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition-colors hover:text-zinc-700"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          >
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onPassword(e.target.value)}
              placeholder="Your password"
              className="fetch-auth-input"
            />
          </FieldShell>
        </Field>

        {error ? (
          <p className="text-[12px] font-medium text-red-600">{error}</p>
        ) : message ? (
          <p className="text-[12px] font-medium text-emerald-700">{message}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="fetch-auth-cta w-full rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3.5 text-[15px] font-extrabold text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985] disabled:opacity-60"
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
          <button
            type="button"
            onClick={onSwitchSignUp}
            className="mt-1 text-center text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
          >
            Don't have an account?{' '}
            <span className="font-bold text-[#4c1d95]">Sign up</span>
          </button>
        </div>
      </form>
    </section>
  )
}

/* ---------------------------------- VERIFY ---------------------------------- */

type VerifyProps = {
  email: string
  code: string[]
  codeRefs: React.MutableRefObject<Array<HTMLInputElement | null>>
  busy: boolean
  error: string | null
  message: string | null
  resendIn: number
  onChangeCodeAt: (idx: number, value: string) => void
  onKeyDownAt: (idx: number, e: KeyboardEvent<HTMLInputElement>) => void
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent) => void
  onResend: () => void
}

function VerifyStep({
  email,
  code,
  codeRefs,
  busy,
  error,
  message,
  resendIn,
  onChangeCodeAt,
  onKeyDownAt,
  onPaste,
  onSubmit,
  onResend,
}: VerifyProps) {
  return (
    <section className="flex flex-1 flex-col">
      <div className="relative mx-auto mt-2">
        <div className="relative h-[9.5rem] w-[9.5rem] overflow-hidden rounded-full bg-gradient-to-b from-[#ede9fe] to-[#f5f3ff] ring-4 ring-white shadow-[0_22px_40px_-22px_rgba(76,29,149,0.55)]">
          <img
            src={mascotUrl}
            alt=""
            className="absolute inset-x-0 -bottom-2 mx-auto h-[110%] w-auto select-none object-contain"
            draggable={false}
          />
        </div>
        <span
          aria-hidden
          className="absolute -right-1 -top-1 grid h-9 w-9 place-items-center rounded-full bg-[#4c1d95] text-white ring-4 ring-white shadow-[0_8px_18px_-6px_rgba(76,29,149,0.7)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m5 12 4.5 4.5L19 7"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>

      <h2 className="mt-5 text-center text-[22px] font-black tracking-tight text-zinc-900">
        Verify your email
      </h2>
      <p className="mt-1 text-center text-[13px] font-medium text-zinc-500">
        We sent a 6-digit code to{' '}
        <span className="font-semibold text-zinc-700">{email || 'your email'}</span>
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-1 flex-col">
        <div className="flex justify-center gap-2.5">
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                codeRefs.current[idx] = el
              }}
              type="tel"
              inputMode="numeric"
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              onChange={(e) => onChangeCodeAt(idx, e.target.value)}
              onKeyDown={(e) => onKeyDownAt(idx, e)}
              onPaste={onPaste}
              aria-label={`Digit ${idx + 1}`}
              className="fetch-auth-otp h-14 w-11 rounded-2xl border border-zinc-200 bg-white text-center text-[22px] font-black tracking-tight text-zinc-900 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.12)] outline-none transition-colors focus:border-[#4c1d95] focus:ring-2 focus:ring-[#c4b5fd] sm:w-12"
            />
          ))}
        </div>

        <p className="mt-4 text-center text-[12.5px] font-medium text-zinc-500">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={onResend}
            disabled={resendIn > 0}
            className="font-bold text-[#4c1d95] underline decoration-[#4c1d95]/40 underline-offset-4 transition-colors disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline"
          >
            Resend code
            {resendIn > 0 ? ` (00:${String(resendIn).padStart(2, '0')})` : ''}
          </button>
        </p>

        {error ? (
          <p className="mt-3 text-center text-[12px] font-medium text-red-600">{error}</p>
        ) : message ? (
          <p className="mt-3 text-center text-[12px] font-medium text-emerald-700">{message}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-4">
          <button
            type="submit"
            disabled={busy}
            className="fetch-auth-cta inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3.5 text-[15px] font-extrabold text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985] disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Verify & Start Bidding'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14m-5-5 5 5-5 5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-zinc-200/70">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ede9fe] text-[#4c1d95]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20 8h-3.6a3.4 3.4 0 1 0-4.4-4.4A3.4 3.4 0 1 0 7.6 8H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7h1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M12 8v13" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-zinc-900">You're one step away!</p>
              <p className="text-[11.5px] font-medium text-zinc-500">
                Get ready to bid, win and have fun.
              </p>
            </div>
          </div>
        </div>
      </form>
    </section>
  )
}

/* ---------------------------- shared form pieces ---------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col">
      <span className="mb-1 text-[12.5px] font-semibold text-zinc-700">{label}</span>
      {children}
    </label>
  )
}

function FieldShell({
  icon,
  trailing,
  valid,
  children,
}: {
  icon?: React.ReactNode
  trailing?: React.ReactNode
  valid?: boolean
  children: React.ReactNode
}) {
  return (
    <span className="fetch-auth-field-shell relative flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white pl-3.5 pr-2 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.10)] focus-within:border-[#4c1d95] focus-within:ring-2 focus-within:ring-[#c4b5fd]">
      {icon ? <span className="grid h-6 w-6 place-items-center text-[#4c1d95]">{icon}</span> : null}
      <span className="flex-1">{children}</span>
      {valid ? (
        <span aria-hidden className="grid h-6 w-6 place-items-center text-emerald-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="m5 12 4.5 4.5L19 7"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ) : null}
      {trailing}
    </span>
  )
}

function PasswordStrength({ strength }: { strength: ReturnType<typeof passwordStrength> }) {
  const segs = [0, 1, 2, 3]
  const fillColors = ['bg-zinc-200', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500', 'bg-emerald-500']
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {segs.map((i) => (
          <span
            key={i}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors',
              i < strength.score ? fillColors[strength.score] : 'bg-zinc-200',
            ].join(' ')}
            aria-hidden
          />
        ))}
      </div>
      {strength.label ? (
        <span className={`text-[11.5px] font-bold ${strength.tone}`}>
          {strength.label}
          {strength.score >= 3 ? (
            <span aria-hidden className="ml-1">
              💪
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

function SocialButton({
  onClick,
  disabled,
  label,
  icon,
  tone = 'light',
}: {
  onClick: () => void
  disabled?: boolean
  label: string
  icon: React.ReactNode
  tone?: 'light' | 'dark'
}) {
  const base =
    'flex h-12 w-full items-center justify-center gap-3 rounded-full px-4 text-[14.5px] font-semibold transition-colors disabled:opacity-55'
  if (tone === 'dark') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${base} bg-black text-white ring-1 ring-black/10 active:bg-zinc-900`}
      >
        <span className="grid h-5 w-5 place-items-center">{icon}</span>
        {label}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} bg-white text-zinc-900 ring-1 ring-zinc-200 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.12)] active:bg-zinc-50`}
    >
      <span className="grid h-5 w-5 place-items-center">{icon}</span>
      {label}
    </button>
  )
}

/* ---------------------------------- icons ---------------------------------- */

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 7 7.4 5.4a1 1 0 0 0 1.2 0L20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7.5a4 4 0 1 1 8 0V10" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 13V5a2 2 0 0 1 2-2h8l8 8-10 10-8-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a17.5 17.5 0 0 1-3.4 4.4M6.3 6.3A17.6 17.6 0 0 0 2 12s3.5 7 10 7c1.6 0 3.1-.3 4.4-.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  )
}

/* -------------------------- decorative confetti ------------------------- */

function ConfettiCanvas() {
  const pieces = useMemo(() => {
    const palette = ['#4c1d95', '#7c3aed', '#a78bfa', '#f59e0b', '#fbbf24', '#22c55e', '#f472b6']
    return Array.from({ length: 22 }, (_, i) => {
      const seed = (i + 1) * 9301 + 49297
      const r = (n: number) => {
        const x = Math.sin(seed + n) * 10000
        return x - Math.floor(x)
      }
      return {
        id: i,
        left: `${(r(1) * 100).toFixed(2)}%`,
        top: `${(r(2) * 60).toFixed(2)}%`,
        rotate: `${(r(3) * 360).toFixed(0)}deg`,
        size: 6 + Math.floor(r(4) * 8),
        color: palette[Math.floor(r(5) * palette.length)],
        shape: r(6) > 0.5 ? 'rect' : 'pill',
      }
    })
  }, [])
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.shape === 'pill' ? p.size * 1.6 : p.size * 0.6}px`,
            background: p.color,
            transform: `rotate(${p.rotate})`,
            borderRadius: p.shape === 'pill' ? '999px' : '2px',
            opacity: 0.55,
          }}
        />
      ))}
    </span>
  )
}
