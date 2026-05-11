import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatAud, recordHuntInterestSignal, useWalletBalanceCents } from '../lib/data'
import { AUTO_HUNT_DEMO_TARGET } from '../lib/autoHuntOnboardingDemo'
import { AutoHuntTermsBody } from '../lib/autoHuntTerms'
import { fetchListingsMatchingHunt } from '../lib/huntListingSearch'
import {
  evaluateHuntAutomationGates,
  readHuntDeliveryLine,
  saveHuntDeliveryLine,
  type HuntGateFailureKind,
} from '../lib/huntStartGates'
import type { PeerListing } from '../lib/listingsApi'
import { FETCH_PROFILE_EDIT_PATH, FETCH_PROFILE_PAYMENTS_SHIPPING_PATH } from '../lib/fetchRoutes'
import { ChromaKeyedMascot } from './ChromaKeyedMascot'
import exploreHeroMascotUrl from '../assets/fetch-explore-mascot-waving-green.png'

type AutoHuntOnboardingFlowProps = {
  open: boolean
  onClose: () => void
  exploreHuntActive: boolean
  onExploreHuntChange: (active: boolean) => void
  onOpenPeerListing?: (listingId: string) => void
}

function StarryNightBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(168deg, #1c0d3a 0%, #2f1a5e 40%, #26174a 72%, #16082a 100%)',
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.5]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="auto-hunt-stars2" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="12" r="0.9" fill="white" opacity="0.55" />
            <circle cx="38" cy="54" r="0.55" fill="white" opacity="0.42" />
            <circle cx="62" cy="18" r="0.65" fill="white" opacity="0.5" />
            <circle cx="24" cy="68" r="0.45" fill="white" opacity="0.38" />
            <circle cx="72" cy="42" r="0.75" fill="white" opacity="0.48" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auto-hunt-stars2)" />
      </svg>
    </div>
  )
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 10v7M12 7h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PawIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <ellipse cx="12" cy="16" rx="5" ry="3.5" fill="currentColor" opacity="0.92" />
      <circle cx="8" cy="9.5" r="2.2" fill="currentColor" />
      <circle cx="12" cy="7.5" r="2.2" fill="currentColor" />
      <circle cx="16" cy="9.5" r="2.2" fill="currentColor" />
      <circle cx="6.5" cy="13" r="1.65" fill="currentColor" />
      <circle cx="17.5" cy="13" r="1.65" fill="currentColor" />
    </svg>
  )
}

function HuntToggleRow({
  icon,
  title,
  subtitle,
  on,
  onToggle,
  trailing,
  showSwitch = true,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  on: boolean
  onToggle: () => void
  trailing?: ReactNode
  showSwitch?: boolean
}) {
  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 py-3.5 last:border-b-0">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-zinc-900">{title}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-zinc-500">{subtitle}</p>
        {trailing ? <div className="mt-2">{trailing}</div> : null}
      </div>
      {showSwitch ? (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={onToggle}
          className={
            on
              ? 'relative mt-1 h-7 w-[46px] shrink-0 rounded-full bg-violet-600 shadow-inner shadow-violet-900/15'
              : 'relative mt-1 h-7 w-[46px] shrink-0 rounded-full bg-zinc-200'
          }
        >
          <span
            className={
              on
                ? 'absolute left-[22px] top-0.5 h-6 w-6 rounded-full bg-white shadow'
                : 'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow'
            }
          />
        </button>
      ) : null}
    </div>
  )
}

const CATEGORY_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'collectibles', label: 'Collectibles' },
  { id: 'fashion', label: 'Fashion' },
] as const

export function AutoHuntOnboardingFlow({
  open,
  onClose,
  exploreHuntActive: _exploreHuntActive,
  onExploreHuntChange,
  onOpenPeerListing,
}: AutoHuntOnboardingFlowProps) {
  const navigate = useNavigate()
  const walletBalanceCents = useWalletBalanceCents()
  const [step, setStep] = useState<1 | 2>(1)

  const [huntQuery, setHuntQuery] = useState('Vintage Sony Walkman WM-2')
  const [category, setCategory] = useState<(typeof CATEGORY_CHIPS)[number]['id']>('all')
  const [condition, setCondition] = useState('any')
  const [location, setLocation] = useState('worldwide')
  const [budgetCents, setBudgetCents] = useState<number>(AUTO_HUNT_DEMO_TARGET.maxBudgetCents)
  const [newListingsOnly, setNewListingsOnly] = useState(false)
  const [keywordTags, setKeywordTags] = useState<string[]>(['retro', 'portable'])
  const [keywordDraft, setKeywordDraft] = useState('')
  const [autoBid, setAutoBid] = useState(true)
  const [autoBuy, setAutoBuy] = useState(true)
  const [notify, setNotify] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsSheetOpen, setTermsSheetOpen] = useState(false)
  const [gateIssue, setGateIssue] = useState<HuntGateFailureKind | null>(null)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [addressDraft, setAddressDraft] = useState('')
  const [huntMatches, setHuntMatches] = useState<PeerListing[]>([])
  const [huntSearchLoading, setHuntSearchLoading] = useState(false)
  const [huntSearchError, setHuntSearchError] = useState<string | null>(null)
  const [huntUsedFallback, setHuntUsedFallback] = useState(false)

  const flushKeywordDraft = useCallback(() => {
    const parts = keywordDraft
      .split(/[,]+|\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (!parts.length) return
    setKeywordTags((prev) => Array.from(new Set([...prev, ...parts])))
    setKeywordDraft('')
  }, [keywordDraft])

  useEffect(() => {
    if (open) {
      setStep(1)
      setTermsAccepted(false)
      setGateIssue(null)
      setAddressModalOpen(false)
      setHuntMatches([])
      setHuntSearchError(null)
      setHuntUsedFallback(false)
    }
  }, [open])

  useEffect(() => {
    if (step !== 2 || !open) return
    let cancelled = false
    setHuntSearchLoading(true)
    setHuntSearchError(null)
    void fetchListingsMatchingHunt({
      huntQuery,
      categoryId: category,
      keywordTags,
      budgetCents,
      newListingsOnly,
    })
      .then((r) => {
        if (cancelled) return
        setHuntMatches(r.listings)
        setHuntUsedFallback(r.usedBroadPoolFallback)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setHuntSearchError(e instanceof Error ? e.message : 'Could not load listings')
        setHuntMatches([])
      })
      .finally(() => {
        if (cancelled) return
        setHuntSearchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [step, open, huntQuery, category, keywordTags, budgetCents, newListingsOnly])

  useEffect(() => {
    setGateIssue(null)
  }, [autoBid, autoBuy, notify])

  const goBackFromSearching = useCallback(() => {
    onExploreHuntChange(false)
    setStep(1)
  }, [onExploreHuntChange])

  const startHunt = useCallback(() => {
    if (!termsAccepted) return
    setGateIssue(null)

    const automationOn = autoBid || autoBuy
    const notifyOnly = !autoBid && !autoBuy && notify

    if (automationOn) {
      const gate = evaluateHuntAutomationGates({ autoBid, autoBuy, walletBalanceCents })
      if (gate) {
        setGateIssue(gate)
        return
      }
    }

    if (notifyOnly) {
      recordHuntInterestSignal(huntQuery)
    }

    onExploreHuntChange(true)
    setTermsSheetOpen(false)
    setStep(2)
  }, [
    termsAccepted,
    autoBid,
    autoBuy,
    notify,
    walletBalanceCents,
    huntQuery,
    onExploreHuntChange,
  ])

  const openAddressModal = useCallback(() => {
    setAddressDraft(readHuntDeliveryLine())
    setAddressModalOpen(true)
  }, [])

  const commitAddressDraft = useCallback(() => {
    const line = addressDraft.trim()
    if (line.length < 10) return
    saveHuntDeliveryLine(line)
    setAddressModalOpen(false)
    setGateIssue(null)
  }, [addressDraft])

  const openHuntListing = useCallback(
    (listingId: string) => {
      onOpenPeerListing?.(listingId)
      onClose()
    },
    [onOpenPeerListing, onClose],
  )

  if (!open) return null

  const shell = (
    <div
      className="fixed inset-0 z-[240] flex flex-col bg-[#2a1850]"
      role="dialog"
      aria-modal="true"
      aria-label={step === 1 ? 'Set up your hunt' : 'Searching'}
    >
      {step === 1 ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative z-0 min-h-[11.5rem] shrink-0 px-4 pb-10 pt-[max(0.35rem,env(safe-area-inset-top))] sm:min-h-[12.5rem]">
            <StarryNightBackdrop />
            <button
              type="button"
              onClick={onClose}
              className="relative z-[2] flex h-10 w-10 items-center justify-center rounded-full text-white/95 transition-colors active:bg-white/10"
              aria-label="Close"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <p className="relative z-[2] mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200/90">
              Step 1 of 2
            </p>
            <h1 className="relative z-[2] mt-2 max-w-[16rem] text-[1.45rem] font-bold leading-tight tracking-tight text-white sm:text-[1.6rem]">
              Set up your hunt
            </h1>
            <p className="relative z-[2] mt-1.5 max-w-[18rem] text-[14px] leading-snug text-white/82">
              Tell Fetch what you want and how to get it.
            </p>
            <div
              className="pointer-events-none absolute right-0 top-[max(2rem,env(safe-area-inset-top))] z-[3] h-[7.25rem] w-[7.25rem] max-h-[29vw] max-w-[29vw] sm:h-[8rem] sm:w-[8rem] sm:max-h-none sm:max-w-none"
              aria-hidden
            >
              <ChromaKeyedMascot
                src={exploreHeroMascotUrl}
                maxProcessWidth={260}
                className="h-full w-full items-end justify-end [&_canvas]:max-h-[8rem] [&_canvas]:h-auto"
              />
            </div>
          </div>

          <div className="relative z-[4] -mt-10 flex min-h-0 flex-1 flex-col sm:-mt-12">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-t-[1.65rem] bg-white shadow-[0_-16px_48px_rgba(0,0,0,0.35)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto w-full max-w-md px-4 pb-[max(13rem,env(safe-area-inset-bottom))] pt-5">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-semibold text-zinc-800">What are you hunting?</span>
                  <InfoIcon className="text-violet-400" />
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-zinc-200/95 bg-zinc-50/80 px-3 py-2.5 ring-1 ring-zinc-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-zinc-400">
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    value={huntQuery}
                    onChange={(e) => setHuntQuery(e.target.value)}
                    placeholder="Search listings, brands, models…"
                    className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
                  />
                  {huntQuery ? (
                    <button
                      type="button"
                      className="shrink-0 rounded-full p-1 text-zinc-400 active:bg-zinc-200/80"
                      aria-label="Clear"
                      onClick={() => setHuntQuery('')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  ) : null}
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-semibold text-zinc-800">Tags &amp; keywords</span>
                    <InfoIcon className="text-violet-400" />
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                    Optional — add words to narrow your hunt (brand, colour, era…).
                  </p>
                  <div className="mt-2 flex min-h-[2.75rem] flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/95 bg-zinc-50/70 px-2.5 py-2 ring-1 ring-zinc-100">
                    {keywordTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-100/95 px-2.5 py-1 text-[12px] font-semibold text-violet-950"
                      >
                        {tag}
                        <button
                          type="button"
                          className="rounded-full p-0.5 text-violet-600 transition-colors active:bg-violet-200/80"
                          aria-label={`Remove ${tag}`}
                          onClick={() => setKeywordTags((p) => p.filter((x) => x !== tag))}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path
                              d="M8 8l8 8M16 8l-8 8"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={keywordDraft}
                      onChange={(e) => setKeywordDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault()
                          flushKeywordDraft()
                        }
                      }}
                      onBlur={() => {
                        if (keywordDraft.trim()) flushKeywordDraft()
                      }}
                      placeholder="Type and press enter…"
                      className="min-w-[6.5rem] flex-1 bg-transparent py-0.5 text-[14px] text-zinc-900 outline-none placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-zinc-400">Categories</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {CATEGORY_CHIPS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={
                        category === c.id
                          ? 'shrink-0 rounded-full border-2 border-violet-600 bg-violet-50 px-3.5 py-2 text-[13px] font-semibold text-violet-900'
                          : 'shrink-0 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 active:bg-zinc-50'
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-dashed border-zinc-300 bg-zinc-50/80 px-3.5 py-2 text-[13px] font-medium text-zinc-500"
                  >
                    More ▾
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-zinc-500">Condition</span>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-3 pr-8 text-[13px] font-medium text-zinc-900"
                    >
                      <option value="any">Any condition</option>
                      <option value="new">New</option>
                      <option value="used">Used</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-zinc-500">Location</span>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M12 11.75a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                            stroke="currentColor"
                            strokeWidth="1.75"
                          />
                          <path
                            d="M19.5 10.2c0 5.1-6 10.05-7.16 11.03a.75.75 0 01-.68 0C10.5 20.25 4.5 15.3 4.5 10.2a7.5 7.5 0 1115 0z"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-8 pr-8 text-[13px] font-medium text-zinc-900"
                      >
                        <option value="worldwide">Worldwide</option>
                        <option value="au">Australia</option>
                        <option value="local">Near me</option>
                      </select>
                    </div>
                  </label>
                </div>

                <div className="mt-5 flex items-center gap-1">
                  <span className="text-[13px] font-semibold text-zinc-800">Max budget</span>
                  <InfoIcon className="text-violet-400" />
                </div>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-zinc-200/95 bg-white px-3 py-2 ring-1 ring-zinc-100">
                  <span className="text-[15px] font-semibold text-zinc-400">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={String(Math.round(budgetCents / 100))}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value.replace(/\D/g, ''), 10)
                      if (Number.isFinite(n)) setBudgetCents(Math.min(1_000_000, Math.max(0, n)) * 100)
                    }}
                    className="min-w-0 flex-1 text-[17px] font-bold tabular-nums text-zinc-900 outline-none"
                  />
                  <select className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[12px] font-semibold text-zinc-700">
                    <option>AUD</option>
                  </select>
                </div>

                <div className="mt-4 border-t border-zinc-100">
                  <HuntToggleRow
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                          stroke="currentColor"
                          strokeWidth="1.65"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                    title="First to buy · new listings"
                    subtitle="Fresh drops first — turn on Auto-buy or Auto-bid so we can act as soon as a match goes live."
                    on={newListingsOnly}
                    onToggle={() => setNewListingsOnly((v) => !v)}
                  />
                  <HuntToggleRow
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M12 3v3M16.2 7.8l2.1-2.1M21 12h-3M16.2 16.2l2.1 2.1M12 21v-3M7.8 16.2l-2.1 2.1M3 12h3M7.8 7.8L5.7 5.7"
                          stroke="currentColor"
                          strokeWidth="1.65"
                          strokeLinecap="round"
                        />
                      </svg>
                    }
                    title="Auto-bid"
                    subtitle="Automatically bid up to your max"
                    on={autoBid}
                    onToggle={() => setAutoBid((v) => !v)}
                  />
                  <HuntToggleRow
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M7 7h10v10H7V7z"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinejoin="round"
                        />
                        <path d="M9 11h6M9 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    }
                    title="Auto-buy"
                    subtitle="Buy it now if under budget"
                    on={autoBuy}
                    onToggle={() => setAutoBuy((v) => !v)}
                  />
                  <HuntToggleRow
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M18 8a4 4 0 10-6.8 2.8L12 12l-2-2.2A4 4 0 1018 8z"
                          stroke="currentColor"
                          strokeWidth="1.65"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                    title="Notify me"
                    subtitle="Before buying or if outbid"
                    on={notify}
                    onToggle={() => setNotify((v) => !v)}
                  />
                  </div>

                {newListingsOnly ? (
                  <div className="mt-3 rounded-xl border border-emerald-200/90 bg-emerald-50/95 px-3 py-3 ring-1 ring-emerald-100">
                    <p className="text-[12px] leading-snug text-emerald-950">
                      <span className="font-bold">First in line for new drops.</span> We surface the newest matches first;
                      with Auto-buy or Auto-bid on, Fetch aims to check out or bid as soon as a listing that fits your
                      hunt appears.
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-violet-50/90 px-3 py-3 ring-1 ring-violet-100">
                  <svg width="20" height="20" viewBox="0 0 24 24" className="mt-0.5 shrink-0 text-violet-600" fill="none">
                    <path
                      d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-[12px] leading-snug text-violet-950">
                    <span className="font-bold">Safe. Smart. Trusted.</span> Fetch checks sellers, listings and prices
                    to keep you safe.
                  </p>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[250] border-t border-zinc-200/95 bg-white/98 px-4 pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] backdrop-blur-md">
              <div className="mx-auto w-full max-w-md pb-[max(0.65rem,env(safe-area-inset-bottom))]">
                <div className="flex gap-3">
                  <input
                    id="auto-hunt-accept-terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0"
                  />
                  <label htmlFor="auto-hunt-accept-terms" className="min-w-0 cursor-pointer text-left text-[13px] leading-snug text-zinc-700">
                    I accept the{' '}
                    <button
                      type="button"
                      className="font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2"
                      onClick={(e) => {
                        e.preventDefault()
                        setTermsSheetOpen(true)
                      }}
                    >
                      terms &amp; conditions
                    </button>{' '}
                    for Auto Hunt.
                  </label>
                </div>
                {gateIssue ? (
                  <div
                    className="mt-3 rounded-xl border border-amber-200/95 bg-amber-50 px-3 py-3 text-left shadow-sm"
                    role="alert"
                  >
                    <p className="text-[13px] font-semibold text-amber-950">
                      {gateIssue === 'funds'
                        ? 'Add funds first'
                        : gateIssue === 'payment'
                          ? 'Add a payment method'
                          : 'Add a delivery address'}
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-amber-900/95">
                      {gateIssue === 'funds'
                        ? 'Auto-bid and auto-buy need wallet balance. Top up before starting.'
                        : gateIssue === 'payment'
                          ? 'We need a card on file to complete purchases and bids for you.'
                          : 'We need somewhere to ship wins when you use automation.'}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {gateIssue === 'funds' ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigate(FETCH_PROFILE_PAYMENTS_SHIPPING_PATH)
                            onClose()
                          }}
                          className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white active:bg-amber-700"
                        >
                          Add funds
                        </button>
                      ) : null}
                      {gateIssue === 'payment' ? (
                        <button
                          type="button"
                          onClick={() => {
                            navigate(FETCH_PROFILE_EDIT_PATH)
                            onClose()
                          }}
                          className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white active:bg-amber-700"
                        >
                          Payment &amp; account
                        </button>
                      ) : null}
                      {gateIssue === 'address' ? (
                        <button
                          type="button"
                          onClick={openAddressModal}
                          className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white active:bg-amber-700"
                        >
                          Enter address
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setGateIssue(null)}
                        className="rounded-lg border border-amber-300/80 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-950 active:bg-amber-100/80"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={startHunt}
                  disabled={!termsAccepted}
                  className="group mt-3 flex w-full flex-col items-center justify-center rounded-2xl bg-violet-600 py-3.5 shadow-lg shadow-violet-900/30 transition-colors enabled:active:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:shadow-none"
                >
                  <span className="flex items-center gap-2 text-[16px] font-bold text-white group-disabled:text-zinc-500">
                    <PawIcon className="text-white group-disabled:text-zinc-400" />
                    Start Hunt
                  </span>
                  <span className="mt-1 text-center text-[12px] font-medium text-violet-100/95 group-disabled:text-zinc-400">
                    {!autoBid && !autoBuy && notify
                      ? 'Sellers get a ping that you’re interested — no auto-spend'
                      : 'Fetch will find the best deals for you'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <StarryNightBackdrop />

          <header className="relative z-[3] flex shrink-0 items-center gap-2 px-4 pb-2 pt-[max(0.35rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={goBackFromSearching}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/95 transition-colors active:bg-white/10"
              aria-label="Go back"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M15 6l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-200/85">Step 2 of 2</p>
              <h2 className="text-[1.15rem] font-bold text-white">Matches from marketplace</h2>
            </div>
          </header>

          <div className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-36 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {huntSearchLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/25" />
                  <span className="absolute inset-2 animate-pulse rounded-full bg-violet-400/30" />
                  <span className="relative flex h-12 w-12 animate-spin rounded-full border-2 border-white/25 border-t-violet-300" />
                </div>
                <h3 className="mt-8 text-[1.25rem] font-bold tracking-tight text-white">Scanning listings…</h3>
                <p className="mt-3 max-w-[20rem] text-[14px] leading-relaxed text-white/80">
                  {newListingsOnly
                    ? 'Hunting fresh listings — when one that fits your hunt goes live, Auto-buy or Auto-bid can try to secure it early.'
                    : 'Querying published listings that fit your hunt and budget.'}
                </p>
              </div>
            ) : huntSearchError ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
                <p className="text-[15px] font-semibold text-rose-200">{huntSearchError}</p>
                <p className="mt-2 max-w-[18rem] text-[13px] text-white/55">
                  Check your connection and that the marketplace API is running.
                </p>
                <button
                  type="button"
                  onClick={goBackFromSearching}
                  className="mt-6 rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-[14px] font-semibold text-white backdrop-blur-sm active:bg-white/20"
                >
                  Go back
                </button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-center text-[13px] leading-snug text-white/78">
                  {huntMatches.length === 0
                    ? huntUsedFallback
                      ? 'No ranked matches in your filters — try a wider category or budget.'
                      : 'No listings matched your hunt and budget yet.'
                    : huntUsedFallback
                      ? 'Best available in your category and budget (no strong keyword match).'
                      : newListingsOnly
                        ? `Fresh picks first — ${huntMatches.length} listing${
                            huntMatches.length === 1 ? '' : 's'
                          } you could be first to buy when similar hits go live.`
                        : `Showing ${huntMatches.length} listing${huntMatches.length === 1 ? '' : 's'} from the database.`}
                </p>
                {huntMatches.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {huntMatches.map((l) => {
                      const img = l.images?.[0]?.url
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => openHuntListing(l.id)}
                          className="group flex flex-col overflow-hidden rounded-2xl border border-white/12 bg-white/5 p-2 text-left shadow-lg shadow-black/20 ring-1 ring-white/10 transition-colors active:bg-white/10"
                        >
                          <span className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-900/40">
                            {img ? (
                              <img
                                src={img}
                                alt=""
                                className="h-full w-full object-cover transition-transform group-active:scale-[1.02]"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[11px] text-white/40">
                                No image
                              </span>
                            )}
                          </span>
                          <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-snug text-white">{l.title}</p>
                          <p className="mt-0.5 text-[11px] font-medium text-violet-200/95">{formatAud(l.priceCents)}</p>
                          {l.profileDisplayName ? (
                            <p className="mt-0.5 truncate text-[10px] text-white/45">{l.profileDisplayName}</p>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={goBackFromSearching}
                  className="mx-auto mt-8 rounded-full border border-white/25 bg-white/10 px-6 py-2.5 text-[14px] font-semibold text-white backdrop-blur-sm transition-colors active:bg-white/20"
                >
                  Go back
                </button>
              </>
            )}
          </div>

          <div
            className="pointer-events-auto fixed bottom-0 left-0 right-0 z-[6] border-t border-white/15 bg-gradient-to-t from-[#150828]/98 via-[#1a0d2e]/95 to-[#1e1040]/88 px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-1">
              {huntSearchLoading ? (
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-violet-300"
                    aria-hidden
                  />
                  <p className="text-[14px] font-semibold tracking-tight text-white/95">Scanning marketplace…</p>
                </div>
              ) : (
                <>
                  <p className="text-[14px] font-semibold tracking-tight text-white/95">
                    {huntMatches.length
                      ? `${huntMatches.length} match${huntMatches.length === 1 ? '' : 'es'} · tap to open`
                      : huntSearchError
                        ? 'Search failed'
                        : 'No matches in range'}
                  </p>
                  <p className="text-[11px] text-white/50">
                    {newListingsOnly
                      ? 'First-buy mode: newest matches first · pair with Auto-buy or Auto-bid'
                      : 'Results from the live marketplace catalogue'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {addressModalOpen && step === 1 ? (
        <div
          className="fixed inset-0 z-[265] flex flex-col justify-end bg-black/55 sm:justify-center sm:px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auto-hunt-address-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss address form"
            onClick={() => setAddressModalOpen(false)}
          />
          <div className="relative z-[1] max-h-[min(88dvh,620px)] w-full overflow-hidden rounded-t-[1.25rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5">
              <button
                type="button"
                onClick={() => setAddressModalOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors active:bg-zinc-100"
                aria-label="Close"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <h2 id="auto-hunt-address-title" className="min-w-0 flex-1 text-[1.05rem] font-bold leading-tight text-zinc-900">
                Delivery address
              </h2>
            </div>
            <div className="px-4 py-4">
              <p className="text-[13px] leading-snug text-zinc-600">
                Used when auto-bid or auto-buy finds a match. Enter your full street address (at least 10
                characters).
              </p>
              <textarea
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
                rows={4}
                className="mt-3 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-[15px] text-zinc-900 outline-none ring-violet-500/0 transition-shadow focus:border-violet-300 focus:ring-2 focus:ring-violet-500/25"
                placeholder="Street, suburb, city, postcode…"
                autoComplete="street-address"
              />
              <button
                type="button"
                disabled={addressDraft.trim().length < 10}
                onClick={commitAddressDraft}
                className="mt-4 w-full rounded-2xl bg-violet-600 py-3 text-[15px] font-bold text-white shadow-lg shadow-violet-900/25 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:shadow-none enabled:active:bg-violet-700"
              >
                Save address
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {termsSheetOpen && step === 1 ? (
        <div
          className="fixed inset-0 z-[260] flex flex-col justify-end bg-black/55 sm:justify-center sm:px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auto-hunt-terms-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Dismiss terms"
            onClick={() => setTermsSheetOpen(false)}
          />
          <div className="relative z-[1] max-h-[min(88dvh,820px)] w-full overflow-hidden rounded-t-[1.25rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5">
              <button
                type="button"
                onClick={() => setTermsSheetOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors active:bg-zinc-100"
                aria-label="Close terms"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 6l-6 6 6 6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <h2 id="auto-hunt-terms-title" className="min-w-0 flex-1 text-[1.05rem] font-bold leading-tight text-zinc-900">
                Auto Hunt terms &amp; conditions
              </h2>
            </div>
            <div className="max-h-[min(70dvh,560px)] overflow-y-auto overscroll-contain px-4 py-4 pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <AutoHuntTermsBody />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )

  return createPortal(shell, document.body)
}
