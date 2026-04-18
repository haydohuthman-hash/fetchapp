import { useCallback, useEffect, useState } from 'react'
import { loadSession } from '../lib/fetchUserSession'
import { getMySupabaseProfile } from '../lib/supabase/profiles'

export type FetchWalletBannerLayout = 'standalone' | 'stackTop' | 'stackBottom'

type Props = {
  className?: string
  onOpen?: () => void
  /** `stack*` = inside a shared card with rewards; omit border/radius/shadow. */
  layout?: FetchWalletBannerLayout
}

function audFromCents(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0
  return (safe / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

export function WalletGlyph({ className = '', size = 22 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a2 2 0 012-2h11l3 3v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
      <path
        d="M17 7.5V5H6a1.5 1.5 0 000 3h11.5"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="14.5" r="1.35" fill="currentColor" />
    </svg>
  )
}

const shellStandalone =
  'rounded-2xl border border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50/90 px-3 py-3 text-left shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)] dark:border-zinc-700/80 dark:from-zinc-900 dark:to-zinc-950/90 dark:shadow-[0_2px_16px_-4px_rgba(0,0,0,0.35)]'

const shellStack =
  'rounded-none border-0 bg-transparent px-2.5 py-2 text-left shadow-none dark:border-0'

const titleClass =
  'block px-0.5 text-left text-[1.05rem] font-extrabold leading-tight tracking-[-0.02em] text-zinc-900 dark:text-zinc-50'

const titleClassStack =
  'block px-0.5 text-left text-[0.92rem] font-extrabold leading-tight tracking-[-0.02em] text-zinc-900 dark:text-zinc-50'

export function FetchWalletBanner({ className = '', onOpen, layout = 'standalone' }: Props) {
  const stack = layout !== 'standalone'
  const shell = layout === 'standalone' ? shellStandalone : shellStack
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!loadSession()) {
      setBalanceCents(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const p = await getMySupabaseProfile()
      const c = p?.credits_balance_cents
      setBalanceCents(typeof c === 'number' ? c : 0)
    } catch {
      setBalanceCents(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const balanceLabel = loading ? '…' : audFromCents(balanceCents ?? 0)

  const body = (
    <>
      <span className={stack ? titleClassStack : titleClass}>Fetch wallet</span>
      <div className={stack ? 'mt-1.5 flex items-center gap-2' : 'mt-2.5 flex items-center gap-2.5'}>
        <div
          className={
            stack
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00ff6a] to-[#00ff6a] shadow-inner ring-1 ring-[#00ff6a]/90 dark:from-[#00ff6a]/80 dark:to-zinc-900 dark:ring-[#00ff6a]/50'
              : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00ff6a] to-[#00ff6a] shadow-inner ring-1 ring-[#00ff6a]/90 dark:from-[#00ff6a]/80 dark:to-zinc-900 dark:ring-[#00ff6a]/50'
          }
          aria-hidden
        >
          <WalletGlyph
            className="text-[#00ff6a] dark:text-[#00ff6a]/95"
            size={stack ? 18 : 22}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={
              stack
                ? 'text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400'
                : 'text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400'
            }
          >
            Credits balance
          </p>
          <p
            className={
              stack
                ? 'mt-0.5 text-[1.1rem] font-extrabold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50'
                : 'mt-0.5 text-[1.35rem] font-extrabold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50'
            }
            aria-live="polite"
          >
            {balanceLabel}
          </p>
        </div>
        {onOpen ? (
          <span
            className={
              stack
                ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
            }
            aria-hidden
          >
            <svg
              className={stack ? 'h-3.5 w-3.5' : 'h-4 w-4'}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        ) : null}
      </div>
    </>
  )

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={['min-w-0 w-full', shell, 'transition-transform active:scale-[0.99]', className]
          .filter(Boolean)
          .join(' ')}
        aria-label={`Fetch wallet, credits balance ${balanceLabel}`}
      >
        {body}
      </button>
    )
  }

  return (
    <section className={['min-w-0', shell, className].filter(Boolean).join(' ')} aria-label="Fetch wallet">
      {body}
    </section>
  )
}
