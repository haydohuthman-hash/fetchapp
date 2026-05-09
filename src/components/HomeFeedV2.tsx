import { createPortal } from 'react-dom'
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DropReel } from '../lib/drops/types'

import runningMascotUrl from '../assets/fetch-mascot-running.mp4'
import flameVideoUrl from '../assets/flame.mp4'
import { ExploreEarthCurveDivider } from './ExploreEarthCurveDivider'
import { LiveAuctionFeedSection } from './LiveAuctionFeedCardsMock'
import exploreHeroMascotUrl from '../assets/fetch-explore-mascot-waving-green.png'
import exploreHeroStarBannerUrl from '../assets/fetchit-explore-hero-cloud-night-wallpaper.png'
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
import { NotificationsNavIconFilled, FetchActivityNavIcon } from './icons/HomeShellNavIcons'
import { WalletStripeCheckoutPanel } from './WalletStripeCheckoutPanel'
import { WalletPayBrandMarks } from './WalletPayBrandMarks'
import {
  depositWallet,
  formatAud,
  sendWalletToUser,
  useWalletBalanceCents,
  withdrawWallet,
} from '../lib/data'
import { formatBsbInput, validateBankPayout } from '../lib/walletFunding'
import { createWalletTopUpPaymentIntent } from '../lib/walletStripeTopUp'
import { isStripePublishableConfigured } from '../lib/paymentCheckout'
import { dropsReelsForLiveAuctionFloor } from '../lib/liveFeedDemo'
import { useDropsApiFeed } from '../lib/drops/useDropsApiFeed'

export type HomeFeedV2Props = {
  onOpenLiveStream?: (reel: DropReel) => void
  onOpenMarketplaceAuctions?: () => void
  onOpenMarketplaceShop?: () => void
  /** Opens `/lives` browse hub. */
  onWatchLive?: () => void
  /** Dedicated seller flow at `/go-live`. */
  onSellerGoLive?: () => void
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
  /** Header: messages / chat hub. */
  onOpenChat?: () => void
  /** Header: inbox / alerts (typically Activity tab). */
  onOpenNotifications?: () => void
}

/** Smaller on‑screen mascot; chroma canvases run at higher DPR via ChromaKeyed* props. */
const EXPLORE_HERO_MASCOT_MAX_PROCESS_W = 432
const EXPLORE_HERO_MASCOT_MAX_CSS_H = 216

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
          ? '-ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-emerald-900'
          : '-ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-amber-900'
      }
      aria-hidden
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-current">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
        <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="11" cy="11" r="2.25" fill="currentColor" />
      </svg>
    </span>
  )
}

function IconGoLive() {
  return (
    <span className="-ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-violet-700" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-current">
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
  'fetch-explore-hunt-chip__root relative flex min-w-0 shrink-0 flex-row items-center gap-1.5 rounded-[1.02rem] py-1 pl-1.75 pr-2.25 sm:gap-2 sm:rounded-[1.08rem] sm:py-[0.4375rem] sm:pl-2 sm:pr-2.75'

/** Explore hero streak — flame left, number + label stacked on the right. */
function ExploreHeroDailyStreakChip({ days, flameSrc }: { days: number; flameSrc: string }) {
  const safe = Number.isFinite(days) ? Math.min(999, Math.max(1, Math.floor(days))) : 1
  return (
    <div
      className={EXPLORE_HERO_STREAK_CARD_SHELL}
      aria-label={`Daily streak ${safe} ${safe === 1 ? 'day' : 'days'}`}
      title="Daily login streak — open Fetch again tomorrow to grow it."
    >
      <div className="relative flex h-[2.75rem] w-[2.65rem] shrink-0 items-end justify-center overflow-visible sm:h-[3rem] sm:w-[2.85rem]">
        <ChromaKeyedMascotVideo
          src={flameSrc}
          maxProcessWidth={108}
          maxCssHeight={100}
          chromaPixelRatioMax={4}
          chromaResolutionScale={1.85}
          className="justify-end [&_canvas]:h-auto [&_canvas]:max-h-[min(3.75rem,32vw)] sm:[&_canvas]:max-h-[4.15rem]"
        />
      </div>
      <div className="flex min-w-0 flex-col items-start justify-center gap-0 pr-0.5 leading-none">
        <span className="text-[16px] font-black tabular-nums tracking-tight text-violet-950 sm:text-[17px]">{safe}</span>
        <span className="text-[7.5px] font-extrabold uppercase leading-tight tracking-[0.14em] text-violet-800/85 sm:text-[8.25px]">
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
  const [payoutAccountName, setPayoutAccountName] = useState('')
  const [payoutBsb, setPayoutBsb] = useState('')
  const [payoutAccountNumber, setPayoutAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [stripeAddCheckout, setStripeAddCheckout] = useState<{
    clientSecret: string
    paymentIntentId: string
    amountCents: number
  } | null>(null)

  const stripePublishableKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim()
  const stripeClientReady = isStripePublishableConfigured()

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
    setPayoutAccountName('')
    setPayoutBsb('')
    setPayoutAccountNumber('')
    setError(null)
    setStripeAddCheckout(null)
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
      ? stripeClientReady
        ? 'Enter an amount and open Stripe checkout (card, wallets, and more when Stripe enables them).'
        : 'Add local demo balance, or set Stripe keys for real checkout (card and wallets)'
      : kind === 'withdraw'
        ? 'Enter your bank details and amount — we’ll send AUD to that account'
        : 'Pay someone on Fetch by username'

  const applyQuickAdd = (dollars: number) => {
    setAmount(dollars.toFixed(0))
    setError(null)
    setStripeAddCheckout(null)
  }

  const prepareStripeWalletCheckout = useCallback(async () => {
    const cents = parseMoneyInputToCents(amount)
    if (!cents) {
      setError('Enter a valid amount')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const pi = await createWalletTopUpPaymentIntent(cents / 100)
      if (pi.provider !== 'stripe' || !pi.clientSecret?.trim()) {
        setError(
          'The server did not return Stripe PaymentIntent credentials. Set STRIPE_SECRET_KEY on your Fetch API so checkout can start.',
        )
        return
      }
      setStripeAddCheckout({
        clientSecret: pi.clientSecret.trim(),
        paymentIntentId: pi.id,
        amountCents: cents,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Stripe checkout')
    } finally {
      setBusy(false)
    }
  }, [amount])

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
    let withdrawTxnLabel: string | undefined
    if (kind === 'withdraw') {
      const payout = validateBankPayout({
        accountName: payoutAccountName,
        bsb: payoutBsb,
        accountNumber: payoutAccountNumber,
      })
      if (!payout.ok) {
        setError(payout.error)
        return
      }
      withdrawTxnLabel = payout.label
    }
    if (kind === 'add' && stripeClientReady) {
      void prepareStripeWalletCheckout()
      return
    }

    setBusy(true)
    setError(null)
    try {
      if (kind === 'add') {
        depositWallet(cents, 'Added funds · Local demo')
        dismissAnimated()
        return
      }
      if (kind === 'withdraw' && withdrawTxnLabel) {
        const ok = withdrawWallet(cents, withdrawTxnLabel)
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
          {kind === 'withdraw' ? (
            <div className="space-y-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Bank account (AUD)</p>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Account name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={payoutAccountName}
                  onChange={(e) => {
                    setPayoutAccountName(e.target.value)
                    setError(null)
                  }}
                  placeholder="Name on the account"
                  className="mt-1 w-full rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 text-[14px] font-medium text-slate-900 outline-none ring-violet-950/5 focus:ring-2 focus:ring-violet-500/35"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">BSB</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={payoutBsb}
                  onChange={(e) => {
                    setPayoutBsb(formatBsbInput(e.target.value))
                    setError(null)
                  }}
                  placeholder="062-002"
                  className="mt-1 w-full rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 font-mono text-[14px] font-medium text-slate-900 outline-none ring-violet-950/5 focus:ring-2 focus:ring-violet-500/35"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Account number</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={payoutAccountNumber}
                  onChange={(e) => {
                    setPayoutAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 12))
                    setError(null)
                  }}
                  placeholder="Account number"
                  className="mt-1 w-full rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 font-mono text-[14px] font-medium text-slate-900 outline-none ring-violet-950/5 focus:ring-2 focus:ring-violet-500/35"
                />
              </label>
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
                  setStripeAddCheckout(null)
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

          {kind === 'add' && stripeAddCheckout && stripePublishableKey ? (
            <WalletStripeCheckoutPanel
              publishableKey={stripePublishableKey}
              clientSecret={stripeAddCheckout.clientSecret}
              paymentIntentId={stripeAddCheckout.paymentIntentId}
              submitAmountLabel={formatAud(stripeAddCheckout.amountCents)}
              appearance="checkout"
              onBack={() => setStripeAddCheckout(null)}
              onComplete={() => {
                depositWallet(stripeAddCheckout.amountCents, 'Added funds · Stripe')
                setStripeAddCheckout(null)
                dismissAnimated()
              }}
            />
          ) : null}

          {kind === 'add' && stripeClientReady && !stripeAddCheckout ? (
            <div className="space-y-2">
              <WalletPayBrandMarks />
              <p className="text-[11px] font-medium leading-snug text-slate-600">
                Tap <span className="font-semibold text-slate-800">Open Stripe checkout</span> to load Stripe’s payment form —
                selecting <span className="font-semibold">Card</span> there opens the secure card fields; Apple Pay and Google
                Pay appear when Stripe and your browser allow them.
              </p>
            </div>
          ) : null}

          {kind === 'add' && !stripeClientReady ? (
            <div className="space-y-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold leading-snug text-amber-950">
                Stripe’s real checkout (card accordion plus wallets when eligible) appears only after the frontend loads your publishable key.
              </p>
              <p className="text-[11px] leading-snug text-amber-900/92">
                Add <code className="rounded bg-amber-100/90 px-1 font-mono text-[10px] text-amber-950">VITE_STRIPE_PUBLISHABLE_KEY</code>{' '}
                to your Vite env, keep <code className="rounded bg-amber-100/90 px-1 font-mono text-[10px] text-amber-950">STRIPE_SECRET_KEY</code>{' '}
                on the API, then restart the dev server. You’ll get the Stripe accordion and real wallets there.
              </p>
              <p className="text-[11px] font-medium leading-snug text-amber-900/88">
                Without keys, only <span className="font-semibold">Add funds</span> applies — local demo balance on this browser.
              </p>
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
              className={[
                kind === 'add' && stripeAddCheckout ? 'w-full' : 'flex-1',
                'rounded-xl border border-violet-300/70 bg-white py-3.5 text-[14px] font-bold text-violet-950 shadow-sm transition-colors active:bg-violet-50',
              ].join(' ')}
            >
              Cancel
            </button>
            {kind === 'add' && stripeAddCheckout ? null : (
              <button
                type="button"
                disabled={busy}
                onClick={handleSubmit}
                className="flex-[1.25] rounded-xl bg-violet-950 py-3.5 text-[14px] font-bold text-white shadow-md shadow-violet-950/25 transition-colors active:bg-violet-900 disabled:opacity-50"
              >
                {busy
                  ? '…'
                  : kind === 'add'
                    ? stripeClientReady
                      ? 'Open Stripe checkout'
                      : 'Add funds'
                    : kind === 'withdraw'
                      ? 'Withdraw'
                      : 'Send'}
              </button>
            )}
          </div>
          <p className="text-center text-[10px] font-medium leading-snug text-slate-400">
            Demo wallet · Stripe charges go through your API; balance updates here after PaymentIntent succeeds.
          </p>
              </div>
      </div>
    </div>,
    document.body,
  )
}

/** Rotating pill copy while a listing hunt runs — tap pill to end hunt. */
const LISTING_HUNT_PILL_LINES = [
  'Searching listings…',
  'Watching auctions…',
  'Scanning live drops…',
  'Looking for matches…',
] as const

function HomeFeedV2Inner({
  onOpenLiveStream,
  onOpenSearch,
  onWatchLive,
  onGoLive,
  onOpenMarketplaceAuctions: _onOpenMarketplaceAuctions,
  onOpenMarketplaceShop,
  onViewAllForYou: _onViewAllForYou,
  onOpenPeerListing,
  onViewWallet,
  onOpenGifts,
  onOpenChat,
  onOpenNotifications,
  onAddHunt: _onAddHunt,
}: HomeFeedV2Props) {
  const { reels: feedReels, loading: feedLoading, error: feedError, refresh: refreshFeed } =
    useDropsApiFeed()
  const liveFeedReels = useMemo(() => dropsReelsForLiveAuctionFloor(feedReels), [feedReels])

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

  const mascotHeroMain = listingHuntActive ? (
    <ChromaKeyedMascotVideo
      key="mascot-running"
      src={runningMascotUrl}
      maxProcessWidth={EXPLORE_HERO_MASCOT_MAX_PROCESS_W}
      maxCssHeight={EXPLORE_HERO_MASCOT_MAX_CSS_H}
      chromaPixelRatioMax={4}
      chromaResolutionScale={1.85}
    />
  ) : (
    <ChromaKeyedMascot
      src={exploreHeroMascotUrl}
      maxProcessWidth={EXPLORE_HERO_MASCOT_MAX_PROCESS_W}
      maxCssHeight={EXPLORE_HERO_MASCOT_MAX_CSS_H}
      chromaPixelRatioMax={4}
      chromaResolutionScale={1.85}
    />
  )

  return (
    <>
      <div className="flex w-full min-w-0 flex-col overflow-x-hidden bg-white">
      <div className="relative z-[12] shrink-0 w-full overflow-visible">
        <div className="relative isolate z-[12] w-full overflow-visible">
          {/* Lavender cloud-night hero wallpaper + mascot straddling white scoop */}
          <div
            className="relative z-0 min-h-[min(292px,78vw)] overflow-visible bg-[#c4aed8] bg-cover bg-no-repeat px-4 pb-[min(84px,22vw)] pt-[max(0.1rem,calc(env(safe-area-inset-top,0px)+0.35rem))]"
            style={{
              backgroundImage: `url(${exploreHeroStarBannerUrl})`,
              backgroundPosition: 'center center',
            }}
          >
            <header className="fetch-explore-hero-chrome relative z-[10] flex items-center gap-2 px-0 py-2">
            <button
              type="button"
                className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/90 shadow-[0_2px_12px_rgba(0,0,0,0.22)]"
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
                className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/40 bg-white/[0.14] px-3.5 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md backdrop-saturate-150 transition-[background-color,filter] active:bg-white/[0.22]"
                aria-label="Search"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="shrink-0 text-white">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                <span className="truncate text-[15px] font-medium text-white">Search</span>
            </button>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenGifts?.()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md backdrop-saturate-150 transition-[background-color,filter] active:bg-white/[0.22]"
                  aria-label="Gifts"
                >
                  <HeaderGiftIcon className="text-white" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChat?.()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md backdrop-saturate-150 transition-[background-color,filter] active:bg-white/[0.22]"
                  aria-label="Chat"
                >
                  <FetchActivityNavIcon className="h-[21px] w-[21px] text-white" active={false} />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenNotifications?.()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/[0.14] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md backdrop-saturate-150 transition-[background-color,filter] active:bg-white/[0.22]"
                  aria-label="Notifications"
                >
                  <NotificationsNavIconFilled className="h-[23px] w-[23px] text-white" active />
                </button>
        </div>
            </header>

            <div className="pointer-events-auto absolute left-[max(1rem,calc(env(safe-area-inset-left,0px)+0.25rem))] top-[calc(env(safe-area-inset-top,0px)+min(9.35rem,min(44vw,12.85rem)))] z-[11] max-w-[min(13rem,calc(100%-5.5rem))]">
              <ExploreHeroDailyStreakChip days={dailyStreakCount} flameSrc={flameVideoUrl} />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] overflow-visible">
              <div className="relative mx-auto w-full max-w-[min(100%,28rem)] -translate-y-[7%] pb-2 pt-3 sm:-translate-y-[6%] sm:pt-3.5">
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
              </div>
            </div>

            {/* Curved scoop above body — z above mascot stack (z-6 shell). */}
            <ExploreEarthCurveDivider />

            {/* Wallet in front of mascot + curve limb; sits on scoop toward body. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[21] flex w-full max-w-none justify-center left-1/2 -translate-x-1/2 translate-y-[min(48%,12.75rem)]">
              <div className="pointer-events-auto w-full max-w-[min(100%,40rem)] px-3 sm:px-5">
                <div className="flex flex-col gap-3 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-3.5 ring-1 ring-zinc-100/85">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-4 sm:flex-nowrap sm:justify-between">
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-900">
                        Your balance
                      </p>
                      <WalletBalanceFitAmount>{fundsDisplay}</WalletBalanceFitAmount>
                      <span
                        className="mt-2 inline-flex w-fit max-w-full items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-800 ring-1 ring-emerald-300/60"
                        aria-label="Funds available to spend"
                      >
                        Available
                      </span>
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
                      className="flex w-full items-center justify-between gap-2 rounded-lg py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 active:bg-zinc-50/80"
                      aria-label="View transactions"
                    >
                      <span className="text-[13px] font-semibold text-zinc-800">View transactions</span>
                      <ChevronRight className="shrink-0 text-zinc-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <div className="relative z-[1] -mt-[min(72px,19vw)] bg-white px-3 pb-2 pt-[min(10rem,min(58vw,24.25rem))] sm:px-5">
          <div className="mx-auto flex w-full max-w-[min(100%,40rem)] flex-col">
      <div className="relative z-[3] mt-6 flex w-full min-w-0 flex-col items-center pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)] pt-0">
        <div className="grid w-full min-w-0 grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setAutoHuntOnboardingOpen(true)}
            className={
              listingHuntActive
                ? 'relative flex min-h-[4rem] min-w-0 flex-col items-start gap-0.5 rounded-xl border-0 bg-emerald-100 px-2 py-1.5 pb-4 text-left shadow-sm shadow-emerald-900/5 transition-[filter] active:brightness-95'
                : 'relative flex min-h-[4rem] min-w-0 flex-col items-start gap-0.5 rounded-xl border-0 bg-amber-100 px-2 py-1.5 pb-4 text-left shadow-sm shadow-amber-900/5 transition-[filter] active:brightness-95'
            }
            aria-label={
              listingHuntActive
                ? 'Listing hunt details and Auto Hunt settings'
                : 'Open listing hunt onboarding'
            }
          >
            <div className="flex w-full items-start justify-between gap-1">
              <IconListingHuntMini active={listingHuntActive} />
              {listingHuntActive ? (
                <span className="max-w-[2.75rem] shrink-0 truncate rounded-full bg-emerald-900/10 px-1.5 py-0.5 text-center text-[7px] font-semibold uppercase leading-none tracking-wide text-emerald-900">
                  On
                </span>
              ) : null}
            </div>
            <div className="min-w-0 pt-0">
              <p className="line-clamp-2 text-[10px] font-bold leading-snug tracking-tight text-black sm:text-[10.25px]">
                {listingHuntActive ? 'Hunting listings' : 'Hunt for listings'}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[8px] font-normal leading-snug text-zinc-700 sm:text-[8.5px]">
                {listingHuntActive ? 'Auto Hunt & settings' : 'We scan auctions for you'}
              </p>
            </div>
            <ChevronRight
              aria-hidden
              className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 text-zinc-600/50"
            />
          </button>

          <button
            type="button"
            onClick={onGoLive}
            className="relative flex min-h-[4rem] min-w-0 flex-col items-start gap-0.5 rounded-xl border-0 bg-violet-100 px-2 py-1.5 pb-4 text-left shadow-sm shadow-violet-900/5 transition-[filter] active:brightness-95"
            aria-label="Go live and earn"
          >
            <IconGoLive />
            <div className="min-w-0 pt-0">
              <p className="line-clamp-2 text-[10px] font-bold leading-snug tracking-tight text-black sm:text-[10.25px]">
                Go live & earn
              </p>
              <p className="mt-0.5 line-clamp-2 text-[8px] font-normal leading-snug text-zinc-700 sm:text-[8.5px]">
                Start your live show
              </p>
            </div>
            <ChevronRight
              aria-hidden
              className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 text-zinc-600/50"
            />
          </button>
        </div>
        <LiveAuctionFeedSection
          liveReels={liveFeedReels}
          loading={feedLoading}
          error={feedError}
          onRetry={refreshFeed}
          onOpenLiveStream={onOpenLiveStream}
          onNotifyWhenLive={onOpenNotifications}
          onGoLive={onGoLive}
          onWatchLive={onWatchLive}
          onViewShop={onOpenMarketplaceShop}
        />
        </div>
          </div>
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
