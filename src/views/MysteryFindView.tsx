import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gift, HelpCircle, Lock, Shield, X } from 'lucide-react'
import { FETCH_APP_PATH } from '../lib/fetchRoutes'
import type { MysteryCategorySelectId, MysteryFindResult } from '../lib/mysteryFind/types'
import { budgetFromMaxSpendDollars } from '../lib/mysteryFind/budgetFromSlider'
import { MYSTERY_MOCK_INVENTORY } from '../lib/mysteryFind/mockInventory'
import { pickMysteryListing } from '../lib/mysteryFind/selectListing'
import { appendMysteryHistory } from '../lib/mysteryFind/historyStorage'
import { playUiFeedback } from '../voice/fetchFeedback'
import { FetchitCategoryChips } from '../components/mysteryFind/FetchitCategoryChips'
import { MysteryFindPremiumHero } from '../components/mysteryFind/MysteryFindPremiumHero'
import { MysteryFindMaxSpendPremium } from '../components/mysteryFind/MysteryFindMaxSpendPremium'
import { MysteryWhatCouldHappenSimple } from '../components/mysteryFind/MysteryWhatCouldHappenSimple'
import { MysteryCommunityFindsRail } from '../components/mysteryFind/MysteryCommunityFindsRail'
import { MysteryRevealScreen } from '../components/mysteryFind/MysteryRevealScreen'
import { MysteryFindResultSimple } from '../components/mysteryFind/MysteryFindResultSimple'

const HOW_STEPS = [
  'Set your max spend',
  'Choose a category (or Surprise Me)',
  'We search real seller listings',
  'Reveal your matched item',
  'Keep it or pass — pay only when you confirm',
]

type Phase = 'spin' | 'reveal' | 'result'

function maxSpendLabel(usd: number): string {
  const u = Math.min(Math.max(Math.round(usd), 20), 500)
  return u >= 500 ? '$500+' : `$${u}`
}

export default function MysteryFindView() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('spin')
  const [maxSpendUsd, setMaxSpendUsd] = useState(300)
  const [lane, setLane] = useState<MysteryCategorySelectId>('surprise')
  const [result, setResult] = useState<MysteryFindResult | null>(null)
  const [shuffle, setShuffle] = useState<string[]>([])
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const resultForHistoryRef = useRef<MysteryFindResult | null>(null)
  const historyWrittenRef = useRef(false)

  const budget = useMemo(() => budgetFromMaxSpendDollars(maxSpendUsd), [maxSpendUsd])

  const resetToSpin = useCallback(() => {
    setResult(null)
    setShuffle([])
    resultForHistoryRef.current = null
    historyWrittenRef.current = false
    setPhase('spin')
  }, [])

  const startReveal = useCallback(() => {
    const sid = `mf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    try {
      const picked = pickMysteryListing({
        category: lane,
        budget,
        sessionId: sid,
      })
      setResult(picked)
      resultForHistoryRef.current = picked
      historyWrittenRef.current = false
      const pool = MYSTERY_MOCK_INVENTORY.filter(
        (x) => x.category === picked.listing.category && x.id !== picked.listing.id,
      )
      const urls = pool.map((x) => x.imageUrl).filter(Boolean)
      const decoys = [...urls].sort(() => Math.random() - 0.5).slice(0, 18)
      setShuffle(decoys.length > 0 ? decoys : [picked.listing.imageUrl])
      setPhase('reveal')
    } catch {
      playUiFeedback('error')
    }
  }, [lane, budget])

  const onRevealDone = useCallback(() => {
    const r = resultForHistoryRef.current
    if (r && !historyWrittenRef.current) {
      historyWrittenRef.current = true
      appendMysteryHistory({ ...r, savedAt: new Date().toISOString() })
    }
    setPhase('result')
  }, [])

  const onShare = useCallback(() => {
    const text = result ? `Mystery Find on Fetchit — ${result.listing.title}` : 'Mystery Find on Fetchit'
    if (navigator.share) {
      void navigator.share({ title: 'Mystery Find', text }).catch(() => undefined)
    } else {
      void navigator.clipboard.writeText(text).then(
        () => playUiFeedback('success'),
        () => undefined,
      )
    }
  }, [result])

  const onHeader = useCallback(() => {
    if (phase === 'spin' || phase === 'reveal') {
      navigate(FETCH_APP_PATH)
      return
    }
    resetToSpin()
  }, [navigate, phase, resetToSpin])

  return (
    <div
      className={[
        'min-h-dvh text-[var(--color-fetch-charcoal,#1c1528)] antialiased',
        phase === 'reveal'
          ? ''
          : 'bg-[radial-gradient(ellipse_100%_75%_at_50%_-18%,rgba(124,58,237,0.14),var(--fetch-app-bg,#f8f6fd))] pt-[max(0.5rem,env(safe-area-inset-top))]',
      ].join(' ')}
    >
      {phase !== 'reveal' ? (
        <header className="sticky top-0 z-30 border-b border-violet-100/70 bg-white/85 px-3 py-3 shadow-[0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-600 active:bg-zinc-100"
              aria-label="Close"
              onClick={onHeader}
            >
              <X className="h-5 w-5" strokeWidth={2.2} />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <Gift className="h-4 w-4 shrink-0 text-violet-600" strokeWidth={2.2} />
              <h1 className="truncate text-center text-[17px] font-bold tracking-tight text-[var(--color-fetch-charcoal,#1c1528)]">
                Mystery Find
              </h1>
            </div>
            <button
              type="button"
              className="flex max-w-[8.5rem] shrink-0 items-center gap-1 text-right text-[12px] font-semibold text-violet-700"
              onClick={() => setHowItWorksOpen(true)}
            >
              <span className="hidden sm:inline">How it works</span>
              <span className="sm:hidden">How</span>
              <HelpCircle className="h-4 w-4 shrink-0 text-violet-600" strokeWidth={2.2} />
            </button>
          </div>
        </header>
      ) : null}

      {phase === 'spin' ? (
        <>
          <main className="mx-auto w-full max-w-lg space-y-7 px-4 pb-[13.5rem] pt-3">
            <div className="flex flex-col items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/90 bg-white/90 px-4 py-2.5 text-[12px] font-semibold text-violet-900 shadow-[0_12px_36px_rgba(91,33,182,0.09)] backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative m-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Real items from real sellers
              </div>
              <p className="max-w-[20rem] text-center text-[12px] font-medium leading-relaxed text-[var(--color-fetch-muted,#64748b)]">
                Every reveal matches a real marketplace listing.
              </p>
            </div>

            <MysteryFindPremiumHero />

            <MysteryFindMaxSpendPremium valueUsd={maxSpendUsd} onChange={setMaxSpendUsd} />

            <section className="space-y-3 pt-0.5">
              <div className="flex items-center gap-2 px-0.5">
                <span className="h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" aria-hidden />
                <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Category</h2>
                <span className="h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-zinc-200 to-transparent" aria-hidden />
              </div>
              <FetchitCategoryChips value={lane} onChange={setLane} />
            </section>

            <MysteryWhatCouldHappenSimple />

            <MysteryCommunityFindsRail />

            <div className="flex items-start gap-3.5 rounded-[26px] border border-zinc-200/90 bg-white px-4 py-4 shadow-[0_16px_48px_rgba(28,21,40,0.06)] ring-1 ring-violet-100/40">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 shadow-sm">
                <Shield className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-bold text-[var(--color-fetch-charcoal,#1c1528)]">Buyer protection on every reveal.</p>
                <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-[var(--color-fetch-muted,#64748b)]">
                  If a seller can&apos;t complete the order, you&apos;ll receive marketplace credit per Fetchit policy.
                </p>
              </div>
            </div>
          </main>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-violet-100/80 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-12px_48px_rgba(28,21,40,0.07)] backdrop-blur-xl backdrop-saturate-150">
            <div className="mx-auto w-full max-w-lg space-y-2">
              <button
                type="button"
                onClick={startReveal}
                className="relative w-full overflow-hidden rounded-[22px] bg-gradient-to-r from-violet-600 via-violet-600 to-fuchsia-600 py-[1.05rem] text-[16px] font-extrabold text-white shadow-[0_12px_40px_rgba(124,58,237,0.38)] ring-1 ring-white/20 transition-[transform,filter] duration-150 active:scale-[0.985] active:brightness-95"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/18 to-transparent opacity-90" />
                <span className="relative">Reveal my find — max {maxSpendLabel(maxSpendUsd)}</span>
              </button>
              <p className="flex items-center justify-center gap-2 text-center text-[11px] font-medium text-[var(--color-fetch-muted,#64748b)]">
                <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" strokeWidth={2.2} />
                You&apos;ll only pay after confirming your item.
              </p>
            </div>
          </div>
        </>
      ) : null}

      {phase === 'reveal' && result ? (
        <main className="min-h-dvh bg-[var(--fetch-app-bg,#f8f6fd)]">
          <MysteryRevealScreen
            variant="light"
            stripImages={shuffle}
            winnerImage={result.listing.imageUrl}
            winnerTitle={result.listing.title}
            onDone={onRevealDone}
          />
        </main>
      ) : null}

      {phase === 'result' && result ? (
        <main className="min-h-dvh bg-[var(--fetch-app-bg,#f8f6fd)] px-4 pb-12 pt-5">
          <div className="mx-auto w-full max-w-lg">
            <MysteryFindResultSimple
              result={result}
              budgetMaxCents={budget.maxCents}
              onKeep={() => {
                playUiFeedback('success')
                navigate(FETCH_APP_PATH)
              }}
              onAgain={resetToSpin}
              onShare={onShare}
              onViewSeller={() => {
                playUiFeedback('success')
              }}
            />
          </div>
        </main>
      ) : null}

      {howItWorksOpen ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 p-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mf-how-title"
        >
          <button
            type="button"
            className="min-h-0 flex-1 cursor-default"
            aria-label="Dismiss"
            onClick={() => setHowItWorksOpen(false)}
          />
          <div className="rounded-t-[28px] border border-zinc-200/90 bg-white px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl">
            <div className="mx-auto w-full max-w-lg">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300" />
              <p id="mf-how-title" className="text-center text-[17px] font-black text-[var(--color-fetch-charcoal,#1c1528)]">
                How it works
              </p>
              <ol className="mt-4 space-y-2.5">
                {HOW_STEPS.map((s, i) => (
                  <li key={s} className="flex gap-3 text-[13px] font-semibold leading-snug text-zinc-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-black text-violet-800">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="mt-6 w-full rounded-[20px] bg-gradient-to-r from-violet-600 to-violet-700 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_28px_rgba(124,58,237,0.35)]"
                onClick={() => setHowItWorksOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
