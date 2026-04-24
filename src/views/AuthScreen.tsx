import { useCallback, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { refreshSessionFromSupabase } from '../lib/fetchUserSession'
import { getSupabaseBrowserClient } from '../lib/supabase/client'
import { getOAuthRedirectTo } from '../lib/supabase/oauthSession'
import { OAuthBrandedButtons } from '../components/auth/OAuthBrandedButtons'
import { FetchItWordmark } from '../components/FetchHomeAppAddressHeader'
import { getFetchDevDemoPasswordPrefill } from '../lib/fetchDevDemo'
import authWelcomeBidWarsUrl from '../assets/auth-welcome-bid-wars.png'

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
    case 'server_auth_not_configured':
      return 'Server accounts are not enabled. Set FETCH_AUTH_USERS_DB=1 and DATABASE_URL on the API.'
    default:
      return 'Something went wrong. Try again.'
  }
}

type AuthScreenProps = {
  /** Called after Supabase session is valid â€” parent runs `handlePostAuthUser`. */
  onSignedIn: (user: User) => void | Promise<void>
  onBack: () => void
}

export default function AuthScreen({ onSignedIn, onBack }: AuthScreenProps) {
  const serverDbAuth = true
  const [showWelcome, setShowWelcome] = useState(true)
  const [tab, setTab] = useState<'signin' | 'signup'>('signup')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(getFetchDevDemoPasswordPrefill)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const requireAuthenticatedSessionUser = useCallback(async () => {
    const sb = getSupabaseBrowserClient()
    if (!sb) throw new Error('Supabase is not configured in this app.')
    const { data, error: sessionError } = await sb.auth.getSession()
    console.log('[AUTH] getSession in AuthScreen:', Boolean(data.session?.user), sessionError?.message ?? '')
    if (sessionError) throw sessionError
    const user = data.session?.user ?? null
    if (!user) throw new Error('Authentication incomplete. Please sign in again.')
    return user
  }, [])

  const afterSupabaseAuth = useCallback(async () => {
    const sessionUser = await requireAuthenticatedSessionUser()
    console.log('[AUTH] AuthScreen â†’ refresh + onSignedIn', sessionUser.id)
    await refreshSessionFromSupabase()
    await onSignedIn(sessionUser)
  }, [onSignedIn, requireAuthenticatedSessionUser])

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    console.log('[AUTH] login start')
    if (serverDbAuth) {
      if (password.length < 8) {
        setError('Enter your password (at least 8 characters).')
        return
      }
      setBusy(true)
      try {
        const sb = getSupabaseBrowserClient()
        if (!sb) {
          setError('Supabase is not configured in this app.')
          return
        }
        const { data, error: authError } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        console.log('[AUTH] login result:', Boolean(data.session), authError?.message)
        if (authError) throw authError
        const session = data?.session || null
        const user = data?.user || null
        if (!session || !user) throw new Error('Login failed: no session')
        await afterSupabaseAuth()
      } catch (e) {
        const msg = e instanceof Error ? e.message : mapServerAuthError('invalid_credentials')
        console.error('[AUTH] login error:', e)
        setError(msg)
      } finally {
        setBusy(false)
      }
    }
  }

  const onSignUp = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    console.log('[AUTH] signup start')
    if (serverDbAuth) {
      if (password.length < 8) {
        setError('Choose a password at least 8 characters long.')
        return
      }
      setBusy(true)
      try {
        const sb = getSupabaseBrowserClient()
        if (!sb) {
          setError('Supabase is not configured in this app.')
          return
        }
        const { data, error: authError } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: displayName.trim() || '' },
          },
        })
        console.log('[AUTH] signup result:', Boolean(data.session), authError?.message)
        if (authError) {
          console.error('[AUTH] signup error:', authError)
          throw authError
        }
        const session = data?.session || null
        const user = data?.user || null
        if (!user) throw new Error('Signup succeeded but no user returned')
        if (!session) {
          console.log('[AUTH] no session (email confirmation required)')
          setMessage('Account created. Check your email to confirm your account.')
          return
        }
        await afterSupabaseAuth()
      } catch (e) {
        const msg = e instanceof Error ? e.message : mapServerAuthError('invalid_credentials')
        setError(msg)
      } finally {
        setBusy(false)
      }
    }
  }

  const signInWithGoogleOAuth = async () => {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        setError('Supabase is not configured in this app.')
        return
      }
      const redirectTo = getOAuthRedirectTo()
      console.log('[AUTH] oauth redirectTo:', redirectTo)
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
      console.log('[AUTH] oauth google:', data?.url ? 'redirecting' : 'no url', oauthError?.message)
      if (oauthError) setError(oauthError.message || 'Google sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const signInWithAppleOAuth = async () => {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        setError('Supabase is not configured in this app.')
        return
      }
      const redirectTo = getOAuthRedirectTo()
      console.log('[AUTH] oauth redirectTo:', redirectTo)
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo },
      })
      console.log('[AUTH] oauth apple:', data?.url ? 'redirecting' : 'no url', oauthError?.message)
      if (oauthError) setError(oauthError.message || 'Apple sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'rounded-xl border border-zinc-300/80 bg-white px-3 py-2.5 text-[14px] text-zinc-900 placeholder:text-zinc-400 outline-none ring-0 focus:border-[#4c1d95] focus:ring-0'

  if (showWelcome) {
    return (
      <div
        className="relative mx-auto flex min-h-dvh min-h-[100dvh] w-full max-w-lg flex-col overflow-hidden bg-[#1e0a4b]"
        role="region"
        aria-label="Welcome to fetchit Bid Wars"
      >
        <img
          src={authWelcomeBidWarsUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
          draggable={false}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent via-[rgba(30,10,75,0.55)] to-[rgba(15,4,40,0.95)]"
          aria-hidden
        />

        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 top-[max(0.75rem,env(safe-area-inset-top,0px))] z-[2] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors active:bg-white/20"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="relative z-[1] mt-auto flex w-full flex-col items-stretch gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10">
          <button
            type="button"
            onClick={() => {
              setError(null)
              setMessage(null)
              setTab('signup')
              setShowEmailForm(false)
              setShowWelcome(false)
            }}
            className="fetch-auth-welcome-cta relative w-full rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-4 text-center text-[16px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.75),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985]"
          >
            Get started
          </button>
          <p className="text-center text-[13px] font-medium text-white/80">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setError(null)
                setMessage(null)
                setTab('signin')
                setShowEmailForm(false)
                setShowWelcome(false)
              }}
              className="font-medium text-white/85 underline decoration-white/30 underline-offset-4 transition-colors active:text-white/60"
            >
              Log in
            </button>
          </p>

          <div className="mt-2 flex items-center justify-center gap-5 text-[11px] font-medium text-white/55">
            <a
              href="/privacy"
              className="underline decoration-white/30 underline-offset-2 transition-colors hover:text-white/80"
            >
              Privacy Policy
            </a>
            <span aria-hidden className="text-white/30">
              ·
            </span>
            <a
              href="/terms"
              className="underline decoration-white/30 underline-offset-2 transition-colors hover:text-white/80"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh min-h-[100dvh] w-full max-w-lg flex-col bg-fetch-soft-gray">
      <header className="relative flex shrink-0 flex-col bg-white px-5 pt-[max(0.65rem,env(safe-area-inset-top))] pb-6 shadow-[0_1px_0_rgba(76,29,149,0.06)]">
        <button
          type="button"
          onClick={() => {
            setError(null)
            setMessage(null)
            setShowEmailForm(false)
            setShowWelcome(true)
          }}
          className="self-start rounded-lg px-2 py-1.5 text-[12px] font-semibold text-zinc-500 hover:text-zinc-900"
        >
          ← Back
        </button>
        <div className="flex flex-col items-center justify-center px-2 pb-2 pt-4 text-center">
          <FetchItWordmark imageClassName="mx-auto h-9 w-auto max-w-[16rem] object-contain sm:h-10" />
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#4c1d95]">
            Bid Wars
          </p>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col bg-fetch-soft-gray px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto overscroll-contain">
          {!showEmailForm ? (
            <>
              <div className="flex-1" />
              <div className="flex flex-col gap-3 pb-2">
                <p className="px-1 text-center text-[15px] font-medium leading-snug tracking-tight text-zinc-600 dark:text-zinc-400">
                  Anything nearby delivered.
                </p>
                <OAuthBrandedButtons
                  disabled={busy}
                  onApple={() => void signInWithAppleOAuth()}
                  onGoogle={() => void signInWithGoogleOAuth()}
                />
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setShowEmailForm(true)
                  }}
                  className="mt-1 w-full py-2.5 text-[13px] font-semibold text-[#4c1d95] underline decoration-[#4c1d95]/35 underline-offset-4 hover:text-[#3b0764]"
                >
                  Continue with email instead
                </button>
                {message ? <p className="text-[12px] text-red-800">{message}</p> : null}
                {error ? <p className="text-[12px] text-red-700">{error}</p> : null}
              </div>
            </>
          ) : tab === 'signin' ? (
            <>
              <div className="flex-1" />
              <form onSubmit={onSignIn} className="flex max-w-md flex-col gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false)
                    setError(null)
                  }}
                  className="mb-1 self-start text-[12px] font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  â† Apple / Google
                </button>
                <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className={inputClass}
                />
                {serverDbAuth ? (
                  <>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      Password
                    </label>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      className={inputClass}
                    />
                  </>
                ) : null}
                {message ? <p className="text-[12px] text-red-800">{message}</p> : null}
                {error ? <p className="text-[12px] text-red-700">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3 text-[14px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(76,29,149,0.7)] transition-transform active:scale-[0.98] disabled:opacity-45"
                >
                  {busy ? 'Please wait…' : 'Log in'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('signup'); setError(null) }}
                  className="mt-1 w-full py-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
                >
                  Don&apos;t have an account? <span className="font-semibold text-[#4c1d95]">Sign up</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex-1" />
              <form onSubmit={onSignUp} className="flex max-w-md flex-col gap-2 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false)
                    setError(null)
                  }}
                  className="mb-1 self-start text-[12px] font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  â† Apple / Google
                </button>
                <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  Name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className={inputClass}
                />
                <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className={inputClass}
                />
                <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  Phone{' '}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+61 â€¦"
                  className={inputClass}
                />
                {serverDbAuth ? (
                  <>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                      Password
                    </label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={inputClass}
                    />
                  </>
                ) : null}
                {message ? <p className="text-[12px] text-red-800">{message}</p> : null}
                {error ? <p className="text-[12px] text-red-700">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3 text-[14px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(76,29,149,0.7)] transition-transform active:scale-[0.98] disabled:opacity-45"
                >
                  {busy ? 'Please wait…' : 'Create account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('signin'); setError(null) }}
                  className="mt-1 w-full py-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-700"
                >
                  Already have an account? <span className="font-semibold text-[#4c1d95]">Log in</span>
                </button>
              </form>
            </>
          )}
        </div>

        {/* Legal links pinned to bottom */}
        <div className="mx-auto flex w-full max-w-md shrink-0 items-end justify-between pt-3">
          <a
            href="/privacy"
            className="text-[11px] font-medium text-zinc-500 underline decoration-zinc-400/40 underline-offset-2 hover:text-zinc-700"
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            className="text-[11px] font-medium text-zinc-500 underline decoration-zinc-400/40 underline-offset-2 hover:text-zinc-700"
          >
            Terms
          </a>
        </div>
      </main>
    </div>
  )
}
