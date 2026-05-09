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

type SignupStep = 'welcome' | 'create' | 'verify' | 'phoneQuick'
type VerifyKind = 'email' | 'sms'

/** E.164 for Supabase SMS: + and digits, or 10-digit US → +1… */
function toE164Phone(raw: string): string | null {
  const t = raw.trim()
  const digitsOnly = t.replace(/\D/g, '')
  if (!digitsOnly) return null
  if (t.startsWith('+')) {
    if (digitsOnly.length < 10 || digitsOnly.length > 15) return null
    return `+${digitsOnly}`
  }
  if (digitsOnly.length === 10) return `+1${digitsOnly}`
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) return `+${digitsOnly}`
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) return `+${digitsOnly}`
  return null
}

function maskPhoneE164(e164: string): string {
  const d = e164.replace(/\D/g, '')
  if (d.length < 4) return e164
  return `•••• •••• ${d.slice(-4)}`
}

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
  const [phoneQuickSource, setPhoneQuickSource] = useState<'welcome' | 'signin'>('welcome')
  const [verifyKind, setVerifyKind] = useState<VerifyKind>('email')
  const [phoneOtpE164, setPhoneOtpE164] = useState('')

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
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
    const phoneDigits = phone.replace(/\D/g, '')
    if (phone.trim().length > 0 && phoneDigits.length < 8) {
      setError('Enter a valid mobile number, or leave it blank.')
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
            phone: phone.trim() ? phone.trim().slice(0, 32) : null,
          },
        },
      })
      if (authError) throw authError
      const session = data?.session || null
      const user = data?.user || null
      if (!user) throw new Error('Signup succeeded but no user returned')
      if (!session) {
        setVerifyKind('email')
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

  const submitPhoneQuick = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    const needsName = mode === 'signup'
    if (needsName && !fullName.trim()) {
      setError('Please enter your name.')
      return
    }
    const e164 = toE164Phone(phone)
    if (!e164) {
      setError('Enter a valid mobile number with country code (e.g. +1 555 123 4567).')
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
      const { error: otpError } = await sb.auth.signInWithOtp({
        phone: e164,
        options: {
          shouldCreateUser: mode === 'signup',
          data: needsName ? { full_name: fullName.trim() } : {},
        },
      })
      if (otpError) throw otpError
      setPhoneOtpE164(e164)
      setVerifyKind('sms')
      setCode(['', '', '', '', '', ''])
      setStep('verify')
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Could not send the code. Check your number and try again.'
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
      if (verifyKind === 'sms') {
        if (!phoneOtpE164) {
          setError('Session expired. Request a new code.')
          setBusy(false)
          return
        }
        const { data, error: authError } = await sb.auth.verifyOtp({
          phone: phoneOtpE164,
          token: joined,
          type: 'sms',
        })
        if (authError) throw authError
        if (!data.session || !data.user) {
          setMessage('Code accepted. Continuing…')
        }
      } else {
        const { data, error: authError } = await sb.auth.verifyOtp({
          email: email.trim(),
          token: joined,
          type: 'email',
        })
        if (authError) throw authError
        if (!data.session || !data.user) {
          setMessage('Code accepted. Continuing…')
        }
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
      if (verifyKind === 'sms') {
        if (!phoneOtpE164) {
          setError('Go back and send a code again.')
          return
        }
        await sb.auth.resend({ type: 'sms', phone: phoneOtpE164 })
        setMessage('We texted you a fresh code.')
      } else {
        await sb.auth.resend({ type: 'signup', email: email.trim() })
        setMessage('We sent a fresh code to your inbox.')
      }
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
    setPhone('')
    setVerifyKind('email')
    setPhoneOtpE164('')
    setError(null)
    setMessage(null)
  }

  return (
    <div className="fetch-auth-flow relative mx-auto flex min-h-dvh min-h-[100dvh] w-full max-w-lg flex-col bg-zinc-50">

      <header
        className="fetch-auth-flow__header relative z-[2] flex min-h-[48px] shrink-0 items-center justify-center px-4 pb-2 pt-[max(0.8rem,env(safe-area-inset-top))]"
        aria-label="Navigation"
      >
        <button
          type="button"
          onClick={() => {
            if (step === 'phoneQuick') {
              if (phoneQuickSource === 'welcome') {
                setStep('welcome')
              } else {
                setStep('create')
                setMode('signin')
              }
              setError(null)
              setMessage(null)
              return
            }
            if (step === 'create') {
              setStep('welcome')
              setError(null)
              setMessage(null)
              return
            }
            if (step === 'verify') {
              if (verifyKind === 'sms') {
                setStep('phoneQuick')
              } else {
                setStep('create')
              }
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
            onPhoneQuick={() => {
              setMode('signup')
              setPhoneQuickSource('welcome')
              setPhone('')
              setFullName('')
              setError(null)
              setMessage(null)
              setStep('phoneQuick')
            }}
            onOAuth={(p) => void oauthWith(p)}
            busy={busy}
          />
        ) : step === 'phoneQuick' ? (
          <PhoneQuickStep
            needsName={mode === 'signup'}
            fullName={fullName}
            phone={phone}
            busy={busy}
            error={error}
            message={message}
            onFullName={setFullName}
            onPhone={setPhone}
            onSubmit={submitPhoneQuick}
          />
        ) : step === 'create' ? (
          mode === 'signup' ? (
            <CreateAccountStep
              fullName={fullName}
              phone={phone}
              email={email}
              password={password}
              referralCode={referralCode}
              showPassword={showPassword}
              strength={strength}
              busy={busy}
              error={error}
              message={message}
              onFullName={setFullName}
              onPhone={setPhone}
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
              onUsePhone={() => {
                setPhoneQuickSource('signin')
                setPhone('')
                setError(null)
                setMessage(null)
                setStep('phoneQuick')
              }}
            />
          )
        ) : (
          <VerifyStep
            verifyKind={verifyKind}
            destinationLabel={verifyKind === 'sms' ? maskPhoneE164(phoneOtpE164) : email}
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
  onPhoneQuick: () => void
  onOAuth: (provider: 'google' | 'apple') => void
  busy: boolean
}

function WelcomeStep({ onPrimary, onLogin, onPhoneQuick, onOAuth, busy }: WelcomeProps) {
  return (
    <section className="relative flex flex-1 flex-col justify-between" aria-labelledby="fetch-auth-welcome-title">
      <div>
        <h1
          id="fetch-auth-welcome-title"
          className="mt-6 text-center text-[1.65rem] font-black leading-tight tracking-tight text-zinc-900 sm:text-[1.75rem]"
        >
          Sign in to Fetchit
        </h1>
        <p className="mx-auto mt-2 max-w-[20rem] text-center text-[14px] font-medium leading-snug text-zinc-500">
          Shop, list, and manage orders in one place.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 pb-1 pt-4">
        <button
          type="button"
          onClick={onPrimary}
          disabled={busy}
          className="w-full rounded-full bg-zinc-900 py-3.5 text-center text-[15px] font-bold text-white shadow-sm transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          Continue with email
        </button>

        <button
          type="button"
          onClick={onPhoneQuick}
          disabled={busy}
          className="w-full rounded-full bg-white py-3.5 text-center text-[15px] font-bold text-zinc-900 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.12)] ring-1 ring-zinc-200 transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          Quick sign up with phone
        </button>

        <SocialButton onClick={() => onOAuth('google')} disabled={busy} label="Continue with Google" icon={<GoogleLogo />} />
        <SocialButton
          onClick={() => onOAuth('apple')}
          disabled={busy}
          label="Continue with Apple"
          icon={<AppleLogo />}
          tone="dark"
        />

        <p className="pt-1 text-center text-[13px] font-medium text-zinc-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onLogin}
            className="font-bold text-zinc-900 underline decoration-zinc-300 underline-offset-4"
          >
            Log in
          </button>
        </p>
        <p className="mx-auto max-w-[19rem] text-center text-[10px] font-medium leading-tight text-zinc-400">
          By continuing you agree to our{' '}
          <a href="/terms" className="text-zinc-600 underline underline-offset-2">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-zinc-600 underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </section>
  )
}

/* --------------------------- PHONE QUICK SIGN UP ---------------------------- */

type PhoneQuickProps = {
  needsName: boolean
  fullName: string
  phone: string
  busy: boolean
  error: string | null
  message: string | null
  onFullName: (v: string) => void
  onPhone: (v: string) => void
  onSubmit: (e: FormEvent) => void
}

function PhoneQuickStep({
  needsName,
  fullName,
  phone,
  busy,
  error,
  message,
  onFullName,
  onPhone,
  onSubmit,
}: PhoneQuickProps) {
  const phoneOk = Boolean(toE164Phone(phone))
  return (
    <section className="flex flex-1 flex-col">
      <header className="pt-1">
        <h2 className="text-[1.35rem] font-black leading-tight tracking-tight text-zinc-900">
          {needsName ? 'Quick sign up with phone' : 'Log in with phone'}
        </h2>
        <p className="mt-1 text-[13px] font-medium text-zinc-500">
          {needsName
            ? "We'll text you a code — no password needed."
            : "We'll text you a code to sign in."}
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-5 flex flex-1 flex-col gap-3">
        {needsName ? (
          <Field label="Your name">
            <FieldShell icon={<UserIcon />} valid={fullName.trim().length > 1}>
              <input
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onFullName(e.target.value)}
                placeholder="Jane Doe"
                className="fetch-auth-input"
              />
            </FieldShell>
          </Field>
        ) : null}

        <Field label="Mobile number">
          <FieldShell icon={<PhoneIcon />} valid={phoneOk}>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="fetch-auth-input"
            />
          </FieldShell>
          <span className="mt-1 text-[11px] font-medium text-zinc-400">
            Use + and country code, or 10 digits for a US number.
          </span>
        </Field>

        {error ? (
          <p className="text-[12px] font-medium text-red-600">{error}</p>
        ) : message ? (
          <p className="text-[12px] font-medium text-emerald-700">{message}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="submit"
            disabled={busy || !phoneOk || (needsName && fullName.trim().length < 2)}
            className="w-full rounded-full bg-zinc-900 py-3.5 text-[15px] font-bold text-white shadow-sm transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? 'Sending code…' : 'Send code'}
          </button>
        </div>
      </form>
    </section>
  )
}

/* ----------------------------- CREATE ACCOUNT ----------------------------- */

type CreateAccountProps = {
  fullName: string
  phone: string
  email: string
  password: string
  referralCode: string
  showPassword: boolean
  strength: ReturnType<typeof passwordStrength>
  busy: boolean
  error: string | null
  message: string | null
  onFullName: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  onPassword: (v: string) => void
  onReferral: (v: string) => void
  onTogglePassword: () => void
  onSubmit: (e: FormEvent) => void
  onSwitchSignIn: () => void
}

function CreateAccountStep({
  fullName,
  phone,
  email,
  password,
  referralCode,
  showPassword,
  strength,
  busy,
  error,
  message,
  onFullName,
  onPhone,
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
        <h2 className="text-[1.35rem] font-black leading-tight tracking-tight text-zinc-900">Create your account</h2>
        <p className="mt-1 text-[13px] font-medium text-zinc-500">Name, phone, email, and a password.</p>
      </header>

      <form onSubmit={onSubmit} className="mt-5 flex flex-1 flex-col gap-3">
        <Field label="Your name">
          <FieldShell icon={<UserIcon />} valid={fullName.trim().length > 1}>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onFullName(e.target.value)}
              placeholder="Jane Doe"
              className="fetch-auth-input"
            />
          </FieldShell>
        </Field>

        <Field label="Mobile number">
          <FieldShell icon={<PhoneIcon />} valid={phone.replace(/\D/g, '').length >= 8}>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onPhone(e.target.value)}
              placeholder="Optional — for orders & recovery"
              className="fetch-auth-input"
            />
          </FieldShell>
          <span className="mt-1 text-[11px] font-medium text-zinc-400">Add a number now or skip and add it later in profile.</span>
        </Field>

        <Field label="Email">
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

        <details className="rounded-xl border border-zinc-200 bg-white/80 px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-semibold text-zinc-600">Referral code (optional)</summary>
          <div className="mt-2">
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
          </div>
        </details>

        {error ? (
          <p className="text-[12px] font-medium text-red-600">{error}</p>
        ) : message ? (
          <p className="text-[12px] font-medium text-emerald-700">{message}</p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-zinc-900 py-3.5 text-[15px] font-bold text-white shadow-sm transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={onSwitchSignIn}
            className="text-center text-[12px] font-medium text-zinc-500"
          >
            Already have an account? <span className="font-bold text-zinc-900">Log in</span>
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
  onUsePhone: () => void
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
  onUsePhone,
}: SignInProps) {
  return (
    <section className="flex flex-1 flex-col">
      <header className="pt-1">
        <h2 className="text-[1.35rem] font-black leading-tight tracking-tight text-zinc-900">Log in</h2>
        <p className="mt-1 text-[13px] font-medium text-zinc-500">Use your email and password.</p>
      </header>

      <form onSubmit={onSubmit} className="mt-5 flex flex-1 flex-col gap-3">
        <Field label="Email">
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
            className="w-full rounded-full bg-zinc-900 py-3.5 text-[15px] font-bold text-white shadow-sm transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
          <button
            type="button"
            onClick={onSwitchSignUp}
            className="text-center text-[12px] font-medium text-zinc-500"
          >
            Need an account? <span className="font-bold text-zinc-900">Sign up</span>
          </button>
          <button
            type="button"
            onClick={onUsePhone}
            className="text-center text-[12px] font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4"
          >
            Use phone number instead
          </button>
        </div>
      </form>
    </section>
  )
}

/* ---------------------------------- VERIFY ---------------------------------- */

type VerifyProps = {
  verifyKind: VerifyKind
  destinationLabel: string
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
  verifyKind,
  destinationLabel,
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
  const headline = verifyKind === 'sms' ? 'Check your phone' : 'Check your email'
  const lead =
    verifyKind === 'sms'
      ? 'Enter the code we texted to'
      : 'Enter the code we sent to'
  return (
    <section className="flex flex-1 flex-col">
      <div className="mx-auto mt-2 flex h-28 w-28 items-end justify-center overflow-hidden rounded-full bg-zinc-100">
        <img
          src={mascotUrl}
          alt=""
          className="h-[115%] w-auto object-contain object-bottom select-none"
          draggable={false}
        />
      </div>

      <h2 className="mt-5 text-center text-[1.35rem] font-black tracking-tight text-zinc-900">{headline}</h2>
      <p className="mt-1.5 text-center text-[13px] font-medium text-zinc-500">
        {lead}{' '}
        <span className="font-semibold text-zinc-800">
          {destinationLabel.trim() || (verifyKind === 'sms' ? 'your number' : 'your inbox')}
        </span>
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-1 flex-col">
        <div className="flex justify-center gap-2">
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
              className="fetch-auth-otp h-12 w-10 rounded-xl border border-zinc-200 bg-white text-center text-xl font-bold tracking-tight text-zinc-900 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-300 sm:w-11"
            />
          ))}
        </div>

        <p className="mt-5 text-center text-[12px] font-medium text-zinc-500">
          {verifyKind === 'sms' ? "Didn't get the text? " : "Didn't get it? "}
          <button
            type="button"
            onClick={onResend}
            disabled={resendIn > 0}
            className="font-bold text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition-colors disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline"
          >
            Resend
            {resendIn > 0 ? ` (${resendIn}s)` : ''}
          </button>
        </p>

        {error ? (
          <p className="mt-3 text-center text-[12px] font-medium text-red-600">{error}</p>
        ) : message ? (
          <p className="mt-3 text-center text-[12px] font-medium text-emerald-700">{message}</p>
        ) : null}

        <div className="mt-auto pt-6">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-zinc-900 py-3.5 text-[15px] font-bold text-white shadow-sm transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? 'Verifying…' : 'Continue'}
          </button>
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
    <span className="fetch-auth-field-shell relative flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white pl-3.5 pr-2 shadow-[0_2px_8px_-4px_rgba(15,15,30,0.10)] focus-within:border-[#291050] focus-within:ring-2 focus-within:ring-[#c4b5fd]">
      {icon ? <span className="grid h-6 w-6 place-items-center text-[#291050]">{icon}</span> : null}
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

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 3.5h7A2.5 2.5 0 0 1 18 6v12a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18V6A2.5 2.5 0 0 1 8.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M10 17.5h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
