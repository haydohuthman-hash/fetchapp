import { createPortal } from 'react-dom'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DropReel } from '../lib/drops/types'

import runningMascotUrl from '../assets/fetch-mascot-running.mp4'
import flameVideoUrl from '../assets/flame.mp4'
import exploreHeroStarBannerUrl from '../assets/fetchit-explore-hero-star-banner.png'
import { ExploreEarthCurveDivider } from './ExploreEarthCurveDivider'
import exploreHeroMascotUrl from '../assets/fetch-explore-mascot-waving-green.png'
import {
  consumePendingStreakCelebrateIfMatches,
  DAILY_STREAK_STORAGE_KEY,
  loadAndBumpDailyStreakWithCelebrate,
  readDailyStreakCount,
} from '../lib/homeDailyStreak'
import {
  EXPLORE_LISTING_HUNT_CHANGED,
  readExploreListingHuntActive,
  setExploreListingHuntActive,
} from '../lib/exploreListingHunt'
import { AutoHuntOnboardingFlow } from './AutoHuntOnboardingFlow'
import { ChromaKeyedMascot, ChromaKeyedMascotVideo } from './ChromaKeyedMascot'
import { NotificationsNavIconFilled } from './icons/HomeShellNavIcons'
import {
  depositWallet,
  formatAud,
  sendWalletToUser,
  useWalletBalanceCents,
  withdrawWallet,
} from '../lib/data'
import { firstNameFromDisplay, loadSession } from '../lib/fetchUserSession'
import { curatedDropReelForListingId } from '../lib/drops/constants'
import type { PeerListing } from '../lib/listingsApi'
import { MARKETPLACE_MOCK_PEER_LISTINGS } from '../lib/marketplaceMockPeerListings'

export type HomeFeedV2Props = {
  onOpenLiveStream?: (reel: DropReel) => void
  onOpenMarketplaceAuctions?: () => void
  onOpenMarketplaceShop?: () => void
  /** Opens full browse — defaults to marketplace shop entry when omitted. */
  onViewAllForYou?: () => void
  onOpenSearch?: () => void
  onOpenPeerListing?: (listingId: string) => void
  onJoinBidWar?: () => void
  onGoLive?: () => void
  onCreateListing?: () => void
  onAddHunt?: () => void
  onViewWallet?: () => void
  /** Header: rewards / gems (gift). */
  onOpenGifts?: () => void
  /** Header: inbox / alerts (typically Activity tab). */
  onOpenNotifications?: () => void
}

function HeaderGiftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 12v10H4V12M2 7h20v5H2V7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7V21M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zm0 0h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronRight({ className = 'text-zinc-400' }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="text-violet-600">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function IconSend() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="text-violet-600">
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconWithdraw() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="text-violet-600">
      <path
        d="M12 5v11M8 13l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 19h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconListingHuntMini({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/14 text-emerald-700'
          : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100/95 text-amber-800'
      }
      aria-hidden
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-current">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
        <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="11" cy="11" r="2.25" fill="currentColor" />
      </svg>
    </span>
  )
}

function IconGoLive() {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/18 text-white"
      aria-hidden
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-current">
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path
          d="M7.5 7.5a6.36 6.36 0 000 9M16.5 7.5a6.36 6.36 0 010 9M4.5 4.5a10.6 10.6 0 000 15M19.5 4.5a10.6 10.6 0 010 15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
              </svg>
              </span>
  )
}

function IconWatchLives() {
  return (
    <span
      className="fetch-explore-watch-lives-icon-pulse flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
      aria-hidden
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="text-current"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="12" cy="12" rx="9" ry="5.75" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
              </svg>
              </span>
  )
}

function IconShopFilledCart() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-300/35 text-emerald-800" aria-hidden>
      <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
        />
      </svg>
    </span>
  )
}

/**
 * Scales the AUD line to the available width (binary search on font size) so large
 * balances never clip when the action buttons sit alongside on one row.
 */
function WalletBalanceFitAmount({ children }: { children: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const text = textRef.current
    if (!wrap || !text) return

    const fit = () => {
      const w = wrap.clientWidth
      if (w < 4) return
      const wide = typeof window !== 'undefined' && window.innerWidth >= 640
      const maxPx = wide ? 34 : 28
      const minPx = 12

      let lo = minPx
      let hi = maxPx
      let best = minPx
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        text.style.fontSize = `${mid}px`
        if (text.scrollWidth <= w + 0.5) {
          best = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      text.style.fontSize = `${best}px`
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 640px)') : null
    const onMq = () => fit()
    mq?.addEventListener('change', onMq)
    return () => {
      ro.disconnect()
      mq?.removeEventListener('change', onMq)
    }
  }, [children])

  return (
    <div ref={wrapRef} className="mt-1.5 min-h-[2rem] w-full min-w-0 overflow-hidden sm:min-h-[2.375rem]">
      <p
        ref={textRef}
        className="max-w-full whitespace-nowrap font-semibold tabular-nums leading-none tracking-[-0.045em] text-zinc-800"
      >
        {children}
      </p>
    </div>
  )
}

/** Outer shell shared by streak chip (horizontal: flame | copy). Kept hunt-style polish via fetch-explore-hunt-chip__root. */
const EXPLORE_HERO_STREAK_CARD_SHELL =
  'fetch-explore-hunt-chip__root relative flex min-w-0 shrink-0 flex-row items-center gap-1.5 rounded-[1.05rem] py-1.5 pl-1.5 pr-2.5 sm:gap-2 sm:pl-2 sm:pr-3'

/** Explore hero streak — flame left, number + label stacked on the right. */
function ExploreHeroDailyStreakChip({ days, flameSrc }: { days: number; flameSrc: string }) {
  const safe = Number.isFinite(days) ? Math.min(999, Math.max(1, Math.floor(days))) : 1
  return (
    <div
      className={EXPLORE_HERO_STREAK_CARD_SHELL}
      aria-label={`Daily streak ${safe} ${safe === 1 ? 'day' : 'days'}`}
      title="Daily login streak — open Fetch again tomorrow to grow it."
    >
      <div className="relative flex h-[2.35rem] w-[2.1rem] shrink-0 items-end justify-center overflow-visible sm:h-[2.65rem] sm:w-[2.35rem]">
        <ChromaKeyedMascotVideo
          src={flameSrc}
          maxProcessWidth={82}
          maxCssHeight={86}
          chromaPixelRatioMax={4}
          chromaResolutionScale={1.85}
          className="justify-end [&_canvas]:h-auto [&_canvas]:max-h-[4rem]"
        />
      </div>
      <div className="flex min-w-0 flex-col items-start justify-center gap-0.5 pr-0.5 leading-none">
        <span className="text-[15px] font-black tabular-nums tracking-tight text-violet-950 sm:text-[17px]">{safe}</span>
        <span className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-violet-800/85 sm:text-[9px]">
          Day streak
        </span>
      </div>
    </div>
  )
}

function DailyStreakCelebrateModal({
  open,
  streakDays,
  flameSrc,
  onDismiss,
}: {
  open: boolean
  streakDays: number
  flameSrc: string
  onDismiss: () => void
}) {
  if (typeof document === 'undefined' || !open) return null

  const safe = Number.isFinite(streakDays) ? Math.min(999, Math.max(1, Math.floor(streakDays))) : 1

  return createPortal(
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-5">
            <button
              type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Dismiss streak celebration"
        onClick={onDismiss}
      />
      <div
        className="relative z-[1] w-full max-w-[min(100%,20rem)] rounded-2xl bg-gradient-to-b from-violet-50 to-white px-5 pt-7 pb-6 text-center shadow-[0_28px_72px_-28px_rgba(49,16,95,0.55)] ring-1 ring-violet-200/80"
        role="dialog"
        aria-modal="true"
        aria-label={`${safe}-day streak celebration`}
      >
        <div className="mx-auto mb-5 flex h-40 items-end justify-center">
          <ChromaKeyedMascotVideo
            src={flameSrc}
            maxProcessWidth={178}
            maxCssHeight={168}
            chromaPixelRatioMax={4}
            chromaResolutionScale={1.85}
          />
        </div>
        <p className="text-xl font-black tracking-tight text-violet-950">You're on fire</p>
        <p className="mt-1.5 text-[2.05rem] font-black tabular-nums leading-none text-orange-700">
          {safe} <span className="text-[1rem] font-extrabold text-zinc-600">{safe === 1 ? 'day' : 'days'}</span>
        </p>
        <p className="mt-2 px-2 text-[13px] font-medium leading-snug text-zinc-600">
          Come back tomorrow to keep your streak going.
        </p>
            <button
              type="button"
          onClick={onDismiss}
          className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-[15px] font-black text-white shadow-md transition-colors active:bg-violet-700"
        >
          Got it
            </button>
      </div>
    </div>,
    document.body,
  )
}

type WalletSheetKind = 'add' | 'withdraw' | 'send'

function parseMoneyInputToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n) || n <= 0) return null
  const cents = Math.round(n * 100)
  return cents > 0 ? cents : null
}

/** Banking-style bottom sheet for add / withdraw / peer send (demo wallet store). */
function WalletBankingSheet({
  kind,
  balanceCents,
  onDismiss,
}: {
  kind: WalletSheetKind
  balanceCents: number
  onDismiss: () => void
}) {
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetOpen(true))
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const dismissAnimated = useCallback(() => {
    setSheetOpen(false)
  }, [])

  const onSheetTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== 'transform') return
      if (!sheetOpen) onDismiss()
    },
    [onDismiss, sheetOpen],
  )

  useEffect(() => {
    setAmount('')
    setRecipient('')
    setError(null)
    setBusy(false)
  }, [kind])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissAnimated()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissAnimated])

  if (typeof document === 'undefined') return null

  const title =
    kind === 'add' ? 'Add money' : kind === 'withdraw' ? 'Withdraw' : 'Send money'
  const subtitle =
    kind === 'add'
      ? 'Transfer from your linked account'
      : kind === 'withdraw'
        ? 'Transfer to your linked account'
        : 'Pay someone on Fetch by username'

  const applyQuickAdd = (dollars: number) => {
    setAmount(dollars.toFixed(0))
    setError(null)
  }

  const handleSubmit = () => {
    const cents = parseMoneyInputToCents(amount)
    if (!cents) {
      setError('Enter a valid amount')
      return
    }
    if ((kind === 'withdraw' || kind === 'send') && cents > balanceCents) {
      setError('Amount exceeds available balance')
      return
    }
    if (kind === 'send') {
      const u = recipient.trim().replace(/^@+/u, '')
      if (u.length < 2) {
        setError('Enter a username (at least 2 characters)')
        return
      }
    }
    setBusy(true)
    setError(null)
    try {
      if (kind === 'add') {
        depositWallet(cents, 'Added funds · Visa ··4242')
        dismissAnimated()
        return
      }
      if (kind === 'withdraw') {
        const ok = withdrawWallet(cents, 'Withdraw to bank · ANZ Everyday ··3320')
        if (!ok) setError('Insufficient balance')
        else dismissAnimated()
        return
      }
      const u = recipient.trim()
      const ok = sendWalletToUser(cents, u)
      if (!ok) setError('Could not send — check username and balance')
      else dismissAnimated()
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[270] flex flex-col justify-end sm:items-center sm:justify-end sm:p-4">
            <button
              type="button"
        className={[
          'pointer-events-auto absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out',
          sheetOpen ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        aria-label="Close"
        onClick={dismissAnimated}
      />
      <div
        className={[
          'pointer-events-auto relative z-[1] w-full max-w-lg overflow-hidden rounded-t-[1.35rem] bg-[#f4f6f9] shadow-[0_-24px_64px_-16px_rgba(49,16,95,0.35)] ring-1 ring-violet-950/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform sm:rounded-2xl sm:shadow-2xl',
          sheetOpen ? 'translate-y-0' : 'translate-y-[105%]',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-sheet-title"
        onTransitionEnd={onSheetTransitionEnd}
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1 w-10 rounded-full bg-slate-300/90" aria-hidden />
        </div>
        <div className="border-b border-violet-100/90 bg-white px-5 pb-4 pt-2">
          <p id="wallet-sheet-title" className="text-[12px] font-semibold uppercase tracking-[0.16em] text-violet-900/65">
            {title}
          </p>
          <p className="mt-1 text-[15px] font-medium leading-snug text-slate-600">{subtitle}</p>
          </div>

        <div className="space-y-4 px-5 py-4">
          {kind === 'add' ? (
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">From</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-900">Everyday account</p>
              <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-slate-600">
                BSB 062-002 · Acc ··4821
              </p>
              </div>
          ) : null}
          {kind === 'withdraw' ? (
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">To</p>
              <p className="mt-1 text-[14px] font-semibold text-slate-900">ANZ · Everyday</p>
              <p className="mt-0.5 font-mono text-[12px] leading-relaxed text-slate-600">
                BSB 063-000 · Acc ··3320
              </p>
            </div>
          ) : null}
          {kind === 'send' ? (
            <div className="space-y-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Recipient username
                </span>
                <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-violet-950/5 focus-within:ring-2 focus-within:ring-violet-500/35">
                  <span className="flex items-center border-r border-slate-200/80 bg-slate-50 px-3 text-[15px] font-semibold text-slate-500">
                    @
                  </span>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value)
                      setError(null)
                    }}
                    autoComplete="username"
                    placeholder="username"
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-400"
                  />
              </div>
              </label>
            </div>
          ) : null}

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="wallet-sheet-amount" className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Amount (AUD)
              </label>
              <span className="text-[11px] font-semibold tabular-nums text-slate-500">
                Available {formatAud(balanceCents)}
              </span>
            </div>
            <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm focus-within:ring-2 focus-within:ring-violet-500/35">
              <span className="flex items-center border-r border-slate-200/80 bg-slate-50 px-3 text-[16px] font-semibold text-slate-600">
                $
              </span>
              <input
                id="wallet-sheet-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError(null)
                }}
                placeholder="0"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[18px] font-semibold tabular-nums text-slate-900 outline-none placeholder:text-slate-300"
              />
            </div>
          </div>

          {kind === 'add' ? (
            <div className="flex flex-wrap gap-2">
              {([20, 50, 100] as const).map((d) => (
              <button
                  key={d}
                type="button"
                  onClick={() => applyQuickAdd(d)}
                  className="rounded-lg border border-violet-950/85 bg-violet-950 px-3 py-2 text-[12px] font-bold tabular-nums text-white shadow-sm transition-colors active:bg-violet-900"
              >
                  ${d}
              </button>
              ))}
            </div>
          ) : null}

          {kind === 'withdraw' ? (
            <button
              type="button"
              onClick={() => {
                const m = balanceCents / 100
                setAmount(balanceCents > 0 ? m.toFixed(2) : '')
                setError(null)
              }}
              className="text-[13px] font-semibold text-violet-900 underline underline-offset-2 decoration-violet-300"
            >
              Withdraw full balance
            </button>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700 ring-1 ring-red-100">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={dismissAnimated}
              className="flex-1 rounded-xl border border-violet-300/70 bg-white py-3.5 text-[14px] font-bold text-violet-950 shadow-sm transition-colors active:bg-violet-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSubmit}
              className="flex-[1.25] rounded-xl bg-violet-950 py-3.5 text-[14px] font-bold text-white shadow-md shadow-violet-950/25 transition-colors active:bg-violet-900 disabled:opacity-50"
            >
              {busy
                ? '…'
                : kind === 'add'
                  ? 'Add funds'
                  : kind === 'withdraw'
                    ? 'Withdraw'
                    : 'Send'}
            </button>
                </div>
          <p className="text-center text-[10px] font-medium leading-snug text-slate-400">
            Demo wallet — funds are stored on this device for previews.
                </p>
              </div>
      </div>
    </div>,
    document.body,
  )
}

/** Welcome above Explore wallet card; session first name when available. */
function ExploreHeroWelcomeBanner() {
  const session = loadSession()
  const raw = session ? firstNameFromDisplay(session.displayName) : ''
  const trimmed = raw.trim()
  const first =
    trimmed.length > 0 && trimmed.toLowerCase() !== 'there' ? trimmed : null

  return (
    <section
      className="w-full text-left"
      aria-label={first ? `Welcome back, ${first}` : 'Welcome back'}
    >
      <p className="text-[1.0625rem] font-extrabold leading-snug tracking-[-0.02em] text-violet-950 sm:text-[1.125rem]">
        {first ? (
          <>
            Welcome back, {first}! <span aria-hidden>{'\u2009'}👋</span>
          </>
        ) : (
          <>
            Welcome back! <span aria-hidden>{'\u2009'}👋</span>
          </>
        )}
      </p>
    </section>
  )
}

/** Rotating pill copy while a listing hunt runs — tap pill to end hunt. */
const LISTING_HUNT_PILL_LINES = [
  'Searching listings…',
  'Watching auctions…',
  'Scanning live drops…',
  'Looking for matches…',
] as const

/** Demo activity — wallet card surfaces two preview rows until real history loads here. */
const HOME_WALLET_DEMO_TRANSACTIONS = [
  {
    id: 'demo-earned',
    title: 'Earned income',
    subtitle: 'Live sale payout',
    amountCents: 1250,
    kind: 'credit' as const,
    leadingIcon: 'income-up' as const,
  },
  {
    id: 'demo-debit',
    title: 'Purchase',
    subtitle: 'Marketplace order',
    amountCents: -8490,
    kind: 'debit' as const,
    leadingIcon: 'purchase-cart' as const,
  },
] as const

function WalletDemoIncomeUpIcon() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700"
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5v14M7 10l5-5 5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
                </svg>
              </span>
  )
}

/** Filled shopping cart — violet chip for marketplace purchase previews. */
function WalletDemoPurchaseCartIcon() {
  return (
                    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600/22 text-violet-700"
      aria-hidden
    >
      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
        />
                  </svg>
                </span>
  )
}

const FOR_YOU_CAROUSEL_LISTINGS = MARKETPLACE_MOCK_PEER_LISTINGS.filter(
  (l) => l.category.trim().toLowerCase() !== 'furniture',
).slice(0, 6)

/** Explore For You: wall-clock auction window — ring ticks every realtime second (not illustrative minutes). */
const EXPLORE_FOR_YOU_LOT_SECONDS = 10

/** Faster bid UX — synced to land near ask before ring hits zero. */
const EXPLORE_FOR_YOU_BID_TICK_MS = 280

function peerListingCategoryDisplay(category: string): string {
  const s = category.trim().toLowerCase().replace(/[_-]+/g, ' ')
  if (!s) return ''
  return s.replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function listingIdHash(listingId: string): number {
  let h = 0
  for (let i = 0; i < listingId.length; i += 1) h = (h * 31 + listingId.charCodeAt(i)) >>> 0
  return h >>> 0
}

/** Demo live bid: starts below ask and steps up toward listing price (like on-air bidding). */
function forYouCarouselBidProfile(listing: PeerListing) {
  const list = listing.priceCents ?? 0
  if (list <= 0) {
    return { initialCents: 0, capCents: 0, stepCents: 0, intervalMs: 0, active: false as const }
  }
  const h = listingIdHash(listing.id)
  const floor = Math.max(
    listing.reserveCents ?? 0,
    listing.minBidIncrementCents ?? 50,
    50,
  )
  const startFrac = 0.62 + ((h % 19) / 100)
  let initialCents = Math.max(floor + (h % 180), Math.round(list * startFrac))
  if (initialCents >= list) initialCents = Math.max(floor, Math.floor(list * 0.52))
  initialCents = Math.min(initialCents, Math.max(list - 50, floor))

  const gap = Math.max(0, list - initialCents)
  const tickMs = EXPLORE_FOR_YOU_BID_TICK_MS
  /** Leave a few ticks before ring end so price feels “hammer pending” briefly. */
  const ticksBudget = Math.max(
    14,
    Math.floor((EXPLORE_FOR_YOU_LOT_SECONDS * 1000) / tickMs) - 3,
  )
  const stepCents = Math.max(
    listing.minBidIncrementCents ?? 50,
    gap > 0 ? Math.ceil(gap / ticksBudget) : floor,
  )

  const active = gap > 0
  return { initialCents, capCents: list, stepCents, intervalMs: tickMs, active }
}

function ForYouLiveBidPrice({
  listing,
  className,
  paused = false,
}: {
  listing: PeerListing
  className?: string
  paused?: boolean
}) {
  const profile = useMemo(
    () => forYouCarouselBidProfile(listing),
    [listing.id, listing.priceCents, listing.reserveCents, listing.minBidIncrementCents],
  )
  const [bidCents, setBidCents] = useState(profile.initialCents)

  useEffect(() => {
    setBidCents(profile.initialCents)
  }, [profile.initialCents])

  useEffect(() => {
    if (paused || !profile.active || profile.intervalMs <= 0) return
    const id = window.setInterval(() => {
      setBidCents((c) => {
        if (c >= profile.capCents) return profile.capCents
        const next = c + profile.stepCents
        return next >= profile.capCents ? profile.capCents : next
      })
    }, profile.intervalMs)
    return () => window.clearInterval(id)
  }, [paused, profile.active, profile.intervalMs, profile.capCents, profile.stepCents])

  if (listing.priceCents <= 0) {
    return <span className={className}>{formatAud(0)}</span>
  }

  return (
    <span className={className} suppressHydrationWarning>
      {formatAud(Math.min(bidCents, profile.capCents))}
    </span>
  )
}

function listingIdAuctionDemoWindow(_listingId: string): { totalSec: number; startRemain: number } {
  return { totalSec: EXPLORE_FOR_YOU_LOT_SECONDS, startRemain: EXPLORE_FOR_YOU_LOT_SECONDS }
}

/** Circular countdown for live bid window — no numeric label (accessible via parent button). */
function LiveBidRingSilent({
  listingId,
  onCountdownEnded,
}: {
  listingId: string
  onCountdownEnded?: () => void
}) {
  const { totalSec, startRemain } = useMemo(() => listingIdAuctionDemoWindow(listingId), [listingId])
  const [remainSec, setRemainSec] = useState(startRemain)
  const firedEndRef = useRef(false)

  useEffect(() => {
    firedEndRef.current = false
    setRemainSec(startRemain)
  }, [listingId, startRemain])

  useEffect(() => {
    const id = window.setInterval(() => setRemainSec((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (remainSec > 0 || firedEndRef.current) return
    firedEndRef.current = true
    onCountdownEnded?.()
  }, [remainSec, onCountdownEnded])

  const box = 34
  const r = 13
  const c = box / 2
  const circ = 2 * Math.PI * r
  const frac = totalSec > 0 ? Math.min(Math.max(remainSec / totalSec, 0), 1) : 0
  const offset = circ * (1 - frac)

  return (
    <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center" aria-hidden>
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="-rotate-90">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="rgba(15,23,42,0.12)"
          strokeWidth="3.25"
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="#dc2626"
          strokeWidth="3.25"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
              </div>
  )
}

function ExploreForYouEndedLockOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[20] flex flex-col items-center justify-center gap-1 rounded-2xl bg-zinc-900/78 px-3 text-center text-white backdrop-blur-[5px]"
      aria-live="polite"
      role="presentation"
    >
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        className="text-white opacity-97"
        aria-hidden
      >
        <path
          d="M7 11V8a5 5 0 0110 0v3M6 11h12v10H6V11z"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
                </svg>
      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        Ended
      </span>
            </div>
  )
}

const ExploreForYouLiveCard = memo(function ExploreForYouLiveCard({
  listing,
  onConsumed,
  onOpenListing,
  onOpenLiveStream,
}: {
  listing: PeerListing
  onConsumed: (listingId: string) => void
  onOpenListing: (listingId: string) => void
  onOpenLiveStream?: (reel: DropReel) => void
}) {
  const [auctionEnded, setAuctionEnded] = useState(false)
  const categoryLabel = peerListingCategoryDisplay(listing.category)
  const reel = useMemo(() => curatedDropReelForListingId(listing.id), [listing.id])
  const img = listing.images[0]?.url
  const openLive = onOpenLiveStream && reel ? () => onOpenLiveStream(reel) : null

  useEffect(() => {
    if (!auctionEnded) return
    const t = window.setTimeout(() => {
      onConsumed(listing.id)
    }, 520)
    return () => window.clearTimeout(t)
  }, [auctionEnded, listing.id, onConsumed])

  const onCountdownEnded = useCallback(() => {
    setAuctionEnded(true)
  }, [])

  return (
                  <button
                    type="button"
      role="listitem"
      disabled={auctionEnded}
      onClick={() => {
        if (auctionEnded) return
        if (openLive) openLive()
        else onOpenListing(listing.id)
      }}
      aria-label={
        auctionEnded ? 'Ended' : ['Live auction', categoryLabel, 'current bid rises live, tap to watch and bid'].join(', ')
      }
      className={[
        'relative flex w-[8.35rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white text-left shadow-sm ring-1 ring-zinc-100/80 transition-[transform,box-shadow]',
        auctionEnded ? 'opacity-93' : 'active:scale-[0.98] active:bg-zinc-50/90',
      ].join(' ')}
    >
      <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-zinc-100">
        {img ? <img src={img} alt="" className="h-full w-full object-cover" draggable={false} /> : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/22" aria-hidden />
        <div className="pointer-events-none absolute left-2 top-2 z-[2]">
          {!auctionEnded ? <ExploreLiveNowBadge /> : null}
                </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] px-2 pb-2 pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] !text-white antialiased drop-shadow-[0_2px_4px_rgba(0,0,0,0.92)] [text-shadow:0_1px_3px_rgba(0,0,0,0.75)]">
            {categoryLabel || 'Shop'}
                </p>
              </div>
            </div>
      <div className="flex min-h-0 shrink-0 items-center justify-between gap-2 px-2 py-2">
        <div className="flex shrink-0 items-center justify-center">
          <LiveBidRingSilent listingId={listing.id} onCountdownEnded={onCountdownEnded} />
        </div>
        <ForYouLiveBidPrice
          listing={listing}
          paused={auctionEnded}
          className="min-w-0 flex-1 text-right text-[1rem] font-bold tabular-nums leading-tight text-violet-950 transition-colors duration-300 ease-out motion-reduce:transition-none sm:text-[1.0625rem]"
                />
              </div>
      {auctionEnded ? <ExploreForYouEndedLockOverlay /> : null}
              </button>
  )
})

function ExploreLiveNowBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'pointer-events-none flex items-center gap-1 rounded-full bg-red-600 px-2 py-[5px] shadow-md shadow-red-900/20 ring-1 ring-red-500/40',
        className,
      ].join(' ')}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0 justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/35 opacity-80" aria-hidden />
        <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-white" aria-hidden />
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide text-white">Live</span>
            </div>
  )
}

function ExploreForYouCarousel({
  onViewAll,
  onOpenListing,
  onOpenLiveStream,
}: {
  onViewAll: () => void
  onOpenListing: (listingId: string) => void
  onOpenLiveStream?: (reel: DropReel) => void
}) {
  const [eligibleIds, setEligibleIds] = useState(
    () => new Set<string>(FOR_YOU_CAROUSEL_LISTINGS.map((l) => l.id)),
  )

  const dismissCard = useCallback((listingId: string) => {
    setEligibleIds((prev) => {
      if (!prev.has(listingId)) return prev
      const n = new Set(prev)
      n.delete(listingId)
      return n
    })
  }, [])

  const visibleListings = useMemo(
    () => FOR_YOU_CAROUSEL_LISTINGS.filter((l) => eligibleIds.has(l.id)),
    [eligibleIds],
  )

  if (visibleListings.length === 0) {
    return null
  }

  return (
    <section className="mt-6 w-full min-w-0" aria-labelledby="fetch-explore-for-you-heading">
      <div className="mb-2.5 flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="fetch-explore-for-you-heading"
            className="text-[1.05rem] font-semibold tracking-tight text-zinc-900"
          >
            For you
          </h2>
          <p className="mt-0.5 text-[12px] font-medium leading-snug text-zinc-500">
            10-second wall-clock lots — bids update in realtime
          </p>
            </div>
            <button
              type="button"
          onClick={onViewAll}
          className="flex shrink-0 items-center gap-0.5 py-0.5 text-[12px] font-bold uppercase tracking-[0.06em] text-violet-700 transition-colors active:text-violet-900"
          aria-label="View all For you listings"
        >
          View all
          <ChevronRight className="text-violet-500" />
            </button>
          </div>
      <div
        className="-mx-1 flex min-w-0 gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] snap-x snap-mandatory [@media(prefers-reduced-motion:reduce)]:snap-none [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Live now marketplace listings"
      >
        {visibleListings.map((listing) => (
          <ExploreForYouLiveCard
            key={listing.id}
            listing={listing}
            onConsumed={dismissCard}
            onOpenListing={onOpenListing}
            onOpenLiveStream={onOpenLiveStream}
          />
        ))}
        </div>
    </section>
  )
}

function HomeFeedV2Inner({
  onOpenLiveStream,
  onOpenSearch,
  onGoLive,
  onOpenMarketplaceAuctions,
  onOpenMarketplaceShop,
  onViewAllForYou,
  onOpenPeerListing,
  onViewWallet,
  onOpenGifts,
  onOpenNotifications,
  onAddHunt: _onAddHunt,
}: HomeFeedV2Props) {
  const walletBalanceCents = useWalletBalanceCents()
  const [walletSheetKind, setWalletSheetKind] = useState<WalletSheetKind | null>(null)
  const [dailyStreakCount, setDailyStreakCount] = useState(() => readDailyStreakCount())
  const [streakCelebrateOpen, setStreakCelebrateOpen] = useState(false)
  const [listingHuntActive, setListingHuntActive] = useState(() => readExploreListingHuntActive())
  const [autoHuntOnboardingOpen, setAutoHuntOnboardingOpen] = useState(false)
  const [huntPillLineIdx, setHuntPillLineIdx] = useState(0)

  useEffect(() => {
    if (!listingHuntActive) return
    setHuntPillLineIdx(0)
  }, [listingHuntActive])

  useEffect(() => {
    if (!listingHuntActive) return
    const id = window.setInterval(() => {
      setHuntPillLineIdx((i) => (i + 1) % LISTING_HUNT_PILL_LINES.length)
    }, 3200)
    return () => window.clearInterval(id)
  }, [listingHuntActive])

  useEffect(() => {
    const syncHunt = () => setListingHuntActive(readExploreListingHuntActive())
    window.addEventListener(EXPLORE_LISTING_HUNT_CHANGED, syncHunt)
    window.addEventListener('storage', syncHunt)
    return () => {
      window.removeEventListener(EXPLORE_LISTING_HUNT_CHANGED, syncHunt)
      window.removeEventListener('storage', syncHunt)
    }
  }, [])

  useLayoutEffect(() => {
    const { count, celebrate } = loadAndBumpDailyStreakWithCelebrate()
    setDailyStreakCount(count)
    const fromQueue = consumePendingStreakCelebrateIfMatches(count)
    if (celebrate || fromQueue) setStreakCelebrateOpen(true)
  }, [])

  useEffect(() => {
    const onStreakStorage = (e: StorageEvent) => {
      if (e.key === DAILY_STREAK_STORAGE_KEY || e.key === null) {
        setDailyStreakCount(readDailyStreakCount())
      }
    }
    window.addEventListener('storage', onStreakStorage)
    return () => window.removeEventListener('storage', onStreakStorage)
  }, [])

  const fundsDisplay = formatAud(walletBalanceCents)
  const openForYouListing = useCallback(
    (listingId: string) => {
      if (onOpenPeerListing) {
        onOpenPeerListing(listingId)
      } else {
        onOpenMarketplaceShop?.()
      }
    },
    [onOpenPeerListing, onOpenMarketplaceShop],
  )
  const viewAllForYou = useCallback(() => {
    if (onViewAllForYou) {
      onViewAllForYou()
      return
    }
    onOpenMarketplaceShop?.()
  }, [onViewAllForYou, onOpenMarketplaceShop])

  const mascotHeroMain = listingHuntActive ? (
    <ChromaKeyedMascotVideo
      key="mascot-running"
      src={runningMascotUrl}
      maxProcessWidth={440}
      chromaPixelRatioMax={4}
      chromaResolutionScale={1.65}
    />
  ) : (
    <ChromaKeyedMascot src={exploreHeroMascotUrl} maxProcessWidth={440} />
  )

  return (
    <>
      <div className="flex w-full min-w-0 flex-col overflow-x-hidden bg-white">
      <div className="relative z-[12] shrink-0 w-full overflow-visible">
        <div className="relative isolate z-[12] w-full overflow-visible">
          {/* Starry lavender banner + mascot straddling white scoop */}
          <div
            className="relative z-0 min-h-[min(292px,78vw)] overflow-visible bg-[#cab8ff] bg-cover bg-center bg-no-repeat px-4 pb-[min(92px,24vw)] pt-[max(0.35rem,calc(env(safe-area-inset-top,0px)+0.6rem))]"
            style={{ backgroundImage: `url(${exploreHeroStarBannerUrl})` }}
          >
            <header className="relative z-[10] flex items-center gap-2.5 pt-0">
            <button
              type="button"
                className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm"
                aria-label="Profile"
            >
                <img
                  src="https://i.pravatar.cc/96?img=14"
                  alt=""
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </button>

              <button
                type="button"
                onClick={onOpenSearch}
                className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/90 px-3.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.06)] ring-1 ring-zinc-200/60 transition-colors active:bg-white"
                aria-label="Search"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-zinc-400">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                <span className="truncate text-[15px] font-medium text-zinc-400">Search</span>
            </button>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenGifts?.()}
                  className="fetch-explore-gift-pulse flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-zinc-800 transition-colors active:bg-white"
                  aria-label="Gifts"
                >
                  <HeaderGiftIcon className="text-zinc-800" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNotifications?.()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-zinc-800 shadow-sm ring-1 ring-zinc-200/60 transition-colors active:bg-white"
                  aria-label="Notifications"
                >
                  <NotificationsNavIconFilled className="h-[23px] w-[23px] text-zinc-800" active={false} />
                </button>
        </div>
            </header>

            <ExploreEarthCurveDivider />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] overflow-visible">
              <div className="relative mx-auto w-full max-w-[min(100%,430px)] translate-y-[18%] pb-2 pt-6">
                <div className="pointer-events-none relative flex w-full justify-center">
                  <div className="relative z-[1] flex translate-x-[min(20vw,5.75rem)] flex-col items-center justify-end sm:translate-x-[min(22vw,6.5rem)]">
                    {!listingHuntActive ? (
                      <>
                        <span
                          className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[min(11px,3vw)] w-[min(136px,36%)] max-w-[168px] -translate-x-1/2 translate-y-[calc(-100%-26px)] rounded-[50%] bg-zinc-900/[0.22] blur-[6px]"
                          aria-hidden
                        />
                        <span
                          className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[min(7px,2vw)] w-[min(102px,28%)] max-w-[132px] -translate-x-1/2 translate-y-[calc(-125%-28px)] rounded-[50%] bg-zinc-900/[0.38] blur-[3px]"
                          aria-hidden
                        />
                      </>
                    ) : null}
                    {listingHuntActive ? (
                      <div className="pointer-events-auto z-[14] mb-1 flex max-w-[min(100%,15rem)] translate-y-12 flex-col items-start gap-1.5 self-start translate-x-4 sm:translate-y-14 sm:translate-x-10 sm:max-w-[16rem]">
            <button
              type="button"
                          onClick={() => setExploreListingHuntActive(false)}
                          className="rounded-full bg-white/93 px-2.5 py-1 text-left text-[10px] font-extrabold uppercase leading-snug tracking-[0.1em] text-violet-950 shadow-sm ring-1 ring-violet-200/80 backdrop-blur-[2px] transition-colors active:bg-white"
                          aria-label="End listing hunt"
                        >
                          {LISTING_HUNT_PILL_LINES[huntPillLineIdx]}
                        </button>
                </div>
                    ) : null}
                    {mascotHeroMain}
              </div>
                </div>
                <div className="pointer-events-auto absolute bottom-[min(3.15rem,10.5vw)] left-[max(2.25rem,calc(env(safe-area-inset-left,0px)+2rem))] z-[26] translate-x-8 -translate-y-1/2 sm:bottom-[min(3.72rem,12vw)] sm:left-8 sm:translate-x-[2.625rem]">
                  <ExploreHeroDailyStreakChip days={dailyStreakCount} flameSrc={flameVideoUrl} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-[1] -mt-[min(78px,20vw)] bg-white px-4 pb-2 pt-[min(144px,37vw)]">
          <div className="mx-auto flex w-full max-w-[min(100%,430px)] flex-col gap-3">
            <ExploreHeroWelcomeBanner />
            <div className="flex flex-col gap-3 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 sm:flex-nowrap sm:justify-between">
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-900">Your balance</p>
                <WalletBalanceFitAmount>{fundsDisplay}</WalletBalanceFitAmount>
              </div>
              <div className="flex shrink-0 items-start justify-end gap-x-2 gap-y-2 min-[380px]:gap-x-4 sm:gap-x-6">
                <button
                  type="button"
                  onClick={() => setWalletSheetKind('add')}
                  className="flex flex-col items-center gap-1 rounded-2xl border-0 bg-transparent p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 sm:gap-1.5 sm:p-1"
                  aria-label="Add funds"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-200/85 bg-violet-50/70 text-violet-600 transition-colors active:bg-violet-100/90 min-[380px]:h-10 min-[380px]:w-10 sm:h-[3.35rem] sm:w-[3.35rem] [&_svg]:h-[18px] [&_svg]:w-[18px] min-[380px]:[&_svg]:h-5 min-[380px]:[&_svg]:w-5 sm:[&_svg]:h-[22px] sm:[&_svg]:w-[22px]">
                    <IconPlus />
                  </span>
                  <span className="max-w-[3.35rem] text-center text-[10px] font-medium leading-snug text-zinc-600 min-[380px]:max-w-[4rem] min-[380px]:text-[11px] sm:max-w-[4.25rem]">
                    Add funds
                  </span>
            </button>
            <button
              type="button"
                  onClick={() => setWalletSheetKind('send')}
                  className="flex flex-col items-center gap-1 rounded-2xl border-0 bg-transparent p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 sm:gap-1.5 sm:p-1"
                  aria-label="Send"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-200/85 bg-violet-50/70 text-violet-600 transition-colors active:bg-violet-100/90 min-[380px]:h-10 min-[380px]:w-10 sm:h-[3.35rem] sm:w-[3.35rem] [&_svg]:h-[18px] [&_svg]:w-[18px] min-[380px]:[&_svg]:h-5 min-[380px]:[&_svg]:w-5 sm:[&_svg]:h-[22px] sm:[&_svg]:w-[22px]">
                    <IconSend />
                </span>
                  <span className="max-w-[3.35rem] text-center text-[10px] font-medium leading-snug text-zinc-600 min-[380px]:max-w-[4rem] min-[380px]:text-[11px] sm:max-w-[4.25rem]">
                    Send
                  </span>
            </button>
            <button
              type="button"
                  onClick={() => setWalletSheetKind('withdraw')}
                  className="flex flex-col items-center gap-1 rounded-2xl border-0 bg-transparent p-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 sm:gap-1.5 sm:p-1"
                  aria-label="Withdraw"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-200/85 bg-violet-50/70 text-violet-600 transition-colors active:bg-violet-100/90 min-[380px]:h-10 min-[380px]:w-10 sm:h-[3.35rem] sm:w-[3.35rem] [&_svg]:h-[18px] [&_svg]:w-[18px] min-[380px]:[&_svg]:h-5 min-[380px]:[&_svg]:w-5 sm:[&_svg]:h-[22px] sm:[&_svg]:w-[22px]">
                    <IconWithdraw />
                </span>
                  <span className="max-w-[3.35rem] text-center text-[10px] font-medium leading-snug text-zinc-600 min-[380px]:max-w-[4rem] min-[380px]:text-[11px] sm:max-w-[4.25rem]">
                    Withdraw
                  </span>
            </button>
              </div>
          </div>

            <div className="border-t border-zinc-100 pt-1">
                <button
                  type="button"
                onClick={() => onViewWallet?.()}
                className="flex w-full items-center justify-between gap-2 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 rounded-lg active:bg-zinc-50/80"
                aria-label="View transactions"
                >
                <span className="text-[13px] font-semibold text-zinc-800">View transactions</span>
                <ChevronRight className="shrink-0 text-zinc-400" />
                </button>
              <ul className="space-y-0 divide-y divide-zinc-100" aria-label="Recent transactions preview">
                {HOME_WALLET_DEMO_TRANSACTIONS.slice(0, 2).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                        {'leadingIcon' in row && row.leadingIcon === 'income-up' ? (
                          <WalletDemoIncomeUpIcon />
                        ) : 'leadingIcon' in row && row.leadingIcon === 'purchase-cart' ? (
                          <WalletDemoPurchaseCartIcon />
                        ) : null}
              </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-zinc-900">{row.title}</p>
                        <p className="mt-0.5 truncate text-[12px] text-zinc-500">{row.subtitle}</p>
                      </div>
                    </div>
                    <span
                      className={
                        row.kind === 'credit'
                          ? 'shrink-0 text-[13px] font-semibold tabular-nums text-emerald-600'
                          : 'shrink-0 text-[13px] font-semibold tabular-nums text-zinc-700'
                      }
                    >
                      {row.kind === 'credit'
                        ? `+${formatAud(Math.abs(row.amountCents))}`
                        : formatAud(row.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
              </div>
                </div>
              </div>
            </div>

      <div className="relative z-[3] flex w-full flex-col justify-start px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)]">
        <div className="flex w-full shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => setAutoHuntOnboardingOpen(true)}
            className={
              listingHuntActive
                ? 'flex w-full items-center gap-2 rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/98 to-white px-2.5 py-2 text-left shadow-sm shadow-emerald-900/5 transition-colors active:bg-emerald-50/80'
                : 'flex w-full items-center gap-2 rounded-xl border border-amber-200/75 bg-gradient-to-br from-amber-50/90 to-white px-2.5 py-2 text-left shadow-sm shadow-amber-900/5 transition-colors active:bg-amber-50/95'
            }
            aria-label={
              listingHuntActive
                ? 'Listing hunt details and Auto Hunt settings'
                : 'Open listing hunt onboarding'
            }
          >
            <IconListingHuntMini active={listingHuntActive} />
            <div className="min-w-0 flex-1">
              <p
                className={
                  listingHuntActive
                    ? 'text-[0.9375rem] font-semibold leading-tight tracking-tight text-emerald-950'
                    : 'text-[0.9375rem] font-semibold leading-tight tracking-tight text-amber-950'
                }
              >
                {listingHuntActive ? 'Hunting listings' : 'Hunt for listings'}
              </p>
              <p
                className={
                  listingHuntActive
                    ? 'mt-0.5 text-[11px] font-normal leading-snug text-emerald-800/78 sm:text-[12px]'
                    : 'mt-0.5 text-[11px] font-normal leading-snug text-amber-900/65 sm:text-[12px]'
                }
              >
                {listingHuntActive
                  ? 'Open for activity, Auto Hunt & settings'
                  : 'We scan auctions and deals for you'}
              </p>
            </div>
            {listingHuntActive ? (
              <span className="shrink-0 rounded-full bg-emerald-600/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                On
              </span>
            ) : (
              <ChevronRight className="shrink-0 self-center text-amber-700/35" />
            )}
          </button>

          <button
            type="button"
            onClick={onGoLive}
            className="flex w-full items-center gap-2.5 rounded-xl bg-violet-600 px-3 py-2.5 text-left text-white shadow-md shadow-violet-900/20 transition-colors active:bg-violet-700"
            aria-label="Go live and earn"
          >
            <IconGoLive />
            <div className="min-w-0 flex-1">
              <p className="text-[1rem] font-semibold tracking-tight text-white">Go live and earn</p>
              <p className="mt-0.5 text-[13px] font-normal text-violet-100/92">Start your live show</p>
          </div>
            <ChevronRight className="shrink-0 text-violet-200/90" />
          </button>

          <div className="flex w-full min-w-0 gap-2">
            <button
              type="button"
              onClick={onOpenMarketplaceShop}
              className="flex min-h-[4.125rem] min-w-0 flex-1 items-center gap-2 rounded-xl border border-emerald-100/70 bg-emerald-50/90 px-2.5 py-2 text-left shadow-sm shadow-emerald-900/5 transition-colors active:bg-emerald-50"
              aria-label="Shop"
            >
              <IconShopFilledCart />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-emerald-950 sm:text-[1rem]">
                  Shop
                </p>
                <p className="mt-0.5 text-[11px] font-normal leading-snug text-emerald-800/72 sm:text-[13px]">
                  Buy now deals and drops
                </p>
        </div>
              <ChevronRight className="shrink-0 self-center text-emerald-700/38" />
            </button>

            <button
              type="button"
              onClick={onOpenMarketplaceAuctions}
              className="flex min-h-[4.125rem] min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-200/90 bg-white px-2.5 py-2 text-left shadow-sm shadow-zinc-900/5 transition-colors active:bg-zinc-50/90"
              aria-label="Watch Lives"
            >
              <IconWatchLives />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-semibold leading-tight tracking-tight text-zinc-900 sm:text-[1rem]">
                  Watch Lives
                </p>
                <p className="mt-0.5 text-[11px] font-normal leading-snug text-zinc-500 sm:text-[13px]">
                  Join sellers streaming now
                </p>
      </div>
              <ChevronRight className="shrink-0 self-center text-zinc-300" />
            </button>
    </div>
        </div>

        <ExploreForYouCarousel
          onViewAll={viewAllForYou}
          onOpenListing={openForYouListing}
          onOpenLiveStream={onOpenLiveStream}
        />
      </div>
    </div>
    <DailyStreakCelebrateModal
        open={streakCelebrateOpen}
        streakDays={dailyStreakCount}
        flameSrc={flameVideoUrl}
        onDismiss={() => setStreakCelebrateOpen(false)}
      />
      {walletSheetKind ? (
        <WalletBankingSheet
          kind={walletSheetKind}
          balanceCents={walletBalanceCents}
          onDismiss={() => setWalletSheetKind(null)}
        />
      ) : null}
      <AutoHuntOnboardingFlow
        open={autoHuntOnboardingOpen}
        onClose={() => setAutoHuntOnboardingOpen(false)}
        exploreHuntActive={listingHuntActive}
        onExploreHuntChange={setExploreListingHuntActive}
        onOpenPeerListing={onOpenPeerListing}
      />
    </>
  )
}

export const HomeFeedV2 = memo(HomeFeedV2Inner)
