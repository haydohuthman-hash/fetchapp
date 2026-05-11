import { memo, useCallback, useMemo, useState } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import type { MysteryFindResult } from '../../lib/mysteryFind/types'
import { MYSTERY_CATEGORY_LABEL } from '../../lib/mysteryFind/constants'
import type { MysteryRevealTierId } from '../../lib/mysteryFind/outcomeTier'
import {
  deriveRevealTierFromValues,
  outcomeTierHeadline,
  outcomeTierSubheadline,
  revealTierShortLabel,
} from '../../lib/mysteryFind/outcomeTier'
import { computeInstantRelistOffer } from '../../lib/mysteryFind/instantRelistOffer'
import { finalizeInstantRelistSession, tryBeginInstantRelist } from '../../lib/mysteryFind/instantRelistGuards'
import { appendMysterySessionLog } from '../../lib/mysteryFind/mysterySessionLog'
import { creditWalletMysteryRelist } from '../../lib/data/store'
import { playUiFeedback } from '../../voice/fetchFeedback'
import { InstantRelistModal } from './InstantRelistModal'
import { ResultCelebration } from './ResultCelebration'

function aud(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function sellerPlain(name: string): string {
  return name.replace(/^@/, '').trim()
}

function referenceTierTitle(tier: MysteryRevealTierId): { pre: string; main: string; mainClass: string } {
  switch (tier) {
    case 'great':
      return {
        pre: 'You found a',
        main: 'Great Find!',
        mainClass:
          'text-[2.15rem] font-black leading-none text-emerald-400 drop-shadow-[0_0_28px_rgba(34,197,94,0.55)] sm:text-5xl',
      }
    case 'rare':
      return {
        pre: 'You found a',
        main: 'Rare Find!',
        mainClass:
          'text-[2.15rem] font-black leading-none text-violet-300 drop-shadow-[0_0_28px_rgba(167,139,250,0.5)] sm:text-5xl',
      }
    case 'fair':
      return {
        pre: 'You found a',
        main: 'Fair Value',
        mainClass: 'text-[2rem] font-black leading-none text-violet-200 sm:text-4xl',
      }
    case 'lower':
      return {
        pre: 'You found a',
        main: 'Lower Value',
        mainClass: 'text-[2rem] font-black leading-none text-amber-200 sm:text-4xl',
      }
    default:
      return {
        pre: 'You found',
        main: 'Your find',
        mainClass: 'text-[2rem] font-black leading-none text-white sm:text-4xl',
      }
  }
}

function tierBadgeTone(tier: MysteryRevealTierId): string {
  switch (tier) {
    case 'rare':
      return 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-transparent'
    case 'great':
      return 'bg-emerald-600 text-white border-transparent'
    case 'fair':
      return 'bg-violet-50 text-violet-950 border-violet-200'
    default:
      return 'bg-amber-50 text-amber-950 border-amber-200'
  }
}

export const MysteryResultCard = memo(function MysteryResultCard({
  result,
  budgetMinCents,
  budgetMaxCents,
  onKeep,
  onShare,
  onFollowSeller,
  onTryAgain,
  visual = 'default',
}: {
  result: MysteryFindResult
  budgetMinCents: number
  budgetMaxCents: number
  onKeep: () => void
  onShare: () => void
  onFollowSeller: () => void
  onTryAgain: () => void
  visual?: 'default' | 'pack' | 'reference'
}) {
  const { listing, paidCents, estimatedValueCents } = result
  const pack = visual === 'pack'
  const reference = visual === 'reference'

  const tier: MysteryRevealTierId = result.revealTier ?? deriveRevealTierFromValues(paidCents, estimatedValueCents)
  const relistOffer = useMemo(() => computeInstantRelistOffer(result), [result])

  const [modalOpen, setModalOpen] = useState(false)
  const [successCreditCents, setSuccessCreditCents] = useState<number | null>(null)
  const [guardHint, setGuardHint] = useState<string | null>(null)

  const listedCents = listing.compareAtCents > 0 ? listing.compareAtCents : estimatedValueCents
  const delivery = listing.shipsLocalFast ? 'Pickup where available · fast local delivery' : 'Ships nationwide · tracked parcel'

  const headline = outcomeTierHeadline(tier)
  const subheadline = outcomeTierSubheadline(tier)

  const diffCents = estimatedValueCents - paidCents

  const supportiveHint =
    tier === 'lower' ? null : (
      <p className="m-0 text-[12px] font-medium leading-snug">
        Potential resale upside depends on marketplace demand. Instant Relist credit is there when you want to pivot
        quickly.
      </p>
    )

  const openRelistModal = useCallback(() => {
    setGuardHint(null)
    if (!relistOffer.eligible || relistOffer.creditCents <= 0) {
      setGuardHint('Instant Relist isn’t available for this find — you can keep the item or reveal again.')
      playUiFeedback('error')
      return
    }
    const guard = tryBeginInstantRelist(result.sessionId)
    if (!guard.ok) {
      if (guard.reason === 'daily_limit') {
        setGuardHint(
          'You’ve reached today’s Instant Relist limit. Try again tomorrow, or keep hunting with another find.',
        )
      } else {
        setGuardHint('This find was already relisted for credit.')
      }
      playUiFeedback('error')
      return
    }
    setModalOpen(true)
  }, [relistOffer.creditCents, relistOffer.eligible, result.sessionId])

  const closeModal = useCallback(() => setModalOpen(false), [])

  const onAcceptCredit = useCallback(() => {
    const credit = relistOffer.creditCents
    if (credit <= 0 || !relistOffer.eligible) return
    finalizeInstantRelistSession(result.sessionId)
    creditWalletMysteryRelist({
      amountCents: credit,
      mysteryFindSessionId: result.sessionId,
      listingId: listing.id,
      listingTitle: listing.title,
    })

    const syntheticListingId = `relist:${listing.id}:${result.sessionId}`
    const now = new Date().toISOString()
    appendMysterySessionLog({
      id: result.sessionId,
      userId: null,
      category: listing.category,
      budgetMin: budgetMinCents,
      budgetMax: budgetMaxCents,
      vibe: 'safe_pick',
      status: 'instant_relist_completed',
      selectedListingId: listing.id,
      paidAmountCents: paidCents,
      estimatedValueCents,
      createdAt: now,
      updatedAt: now,
      userSpendCents: paidCents,
      sellerPayoutCents: relistOffer.sellerPayoutEstimateCents,
      platformMarginCents: Math.max(0, paidCents - credit),
      resultType: tier,
      instantRelistEligible: true,
      instantRelistCreditCents: credit,
      relistAccepted: true,
      relistedListingId: syntheticListingId,
      creditIssuedCents: credit,
    })

    setModalOpen(false)
    setSuccessCreditCents(credit)
    playUiFeedback('success')
  }, [
    budgetMaxCents,
    budgetMinCents,
    estimatedValueCents,
    listing.category,
    listing.id,
    listing.title,
    paidCents,
    relistOffer.creditCents,
    relistOffer.eligible,
    relistOffer.sellerPayoutEstimateCents,
    result.sessionId,
    tier,
  ])

  if (successCreditCents !== null) {
    if (reference) {
      return (
        <div className="space-y-5 text-center">
          <div className="rounded-2xl border border-emerald-500/25 bg-zinc-900/80 px-4 py-8">
            <p className="text-sm font-semibold text-zinc-400">Relisted · credit added</p>
            <p className="mt-2 text-2xl font-black text-emerald-400">{aud(successCreditCents)}</p>
            <p className="mx-auto mt-3 max-w-[22rem] text-[13px] leading-relaxed text-zinc-400">
              Your Marketplace Credit is available now. Use it on Fetchit, live auctions, or marketplace purchases.
            </p>
          </div>
          <button
            type="button"
            onClick={onTryAgain}
            className="w-full rounded-2xl border-2 border-white/90 py-4 text-[15px] font-bold text-white active:scale-[0.99]"
          >
            Reveal another find
          </button>
        </div>
      )
    }
    return (
      <div className="space-y-6 text-center">
        <div
          className={[
            'rounded-[1.15rem] border px-4 py-8',
            pack
              ? 'border-cyan-500/30 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black shadow-[0_0_48px_rgba(34,211,238,0.12)]'
              : 'border-violet-100 bg-gradient-to-b from-violet-50/90 to-white',
          ].join(' ')}
        >
          <p
            className={[
              'text-[1.4rem] font-black leading-tight tracking-tight',
              pack ? 'bg-gradient-to-r from-amber-200 to-cyan-200 bg-clip-text text-transparent' : 'text-zinc-950',
            ].join(' ')}
          >
            Relisted. {aud(successCreditCents)} credit added.
          </p>
          <p className={['mx-auto mt-3 max-w-[22rem] text-[13px] font-medium leading-relaxed', pack ? 'text-zinc-400' : 'text-zinc-600'].join(' ')}>
            Your Marketplace Credit is available now. Use it on Fetchit, live auctions, or marketplace purchases.
          </p>
        </div>
        <button
          type="button"
          onClick={onTryAgain}
          className={[
            'w-full rounded-2xl py-4 text-[16px] font-extrabold active:scale-[0.99]',
            pack
              ? 'bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 text-zinc-950 shadow-[0_0_28px_rgba(217,70,239,0.35)]'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white',
          ].join(' ')}
        >
          {pack ? 'Open another pack' : 'Reveal another find'}
        </button>
      </div>
    )
  }

  if (reference) {
    const hero = referenceTierTitle(tier)
    return (
      <>
        <div className="flex flex-col gap-4 pb-2 text-white">
          <ResultCelebration tier={tier} />
          {guardHint ? (
            <p className="rounded-xl border border-amber-500/35 bg-amber-950/50 px-3 py-2.5 text-center text-[12px] font-semibold text-amber-100">
              {guardHint}
            </p>
          ) : null}

          <div className="text-center">
            <p className="text-[15px] text-zinc-400">{hero.pre}</p>
            <p className={`mt-1 font-black ${hero.mainClass}`}>{hero.main}</p>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white text-zinc-900 shadow-[0_16px_48px_rgba(0,0,0,0.35)]">
            <div className="relative aspect-[4/5] max-h-[min(52vh,22rem)] w-full bg-zinc-100">
              <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow-md"
                aria-label="Favorite"
                onClick={() => playUiFeedback('success')}
              >
                <Heart className="h-5 w-5 text-zinc-700" strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-3 px-4 pb-4 pt-3">
              <p className="text-[15px] font-black leading-snug tracking-tight">{listing.title}</p>
              <button
                type="button"
                onClick={onFollowSeller}
                className="text-[13px] font-bold text-violet-600 underline decoration-violet-300 underline-offset-2"
              >
                View seller
              </button>

              <div className="space-y-2 border-t border-zinc-100 pt-3 text-[13px] font-medium">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">You paid (max):</span>
                  <span className="font-bold tabular-nums text-zinc-900">{aud(budgetMaxCents)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Estimated resale value:</span>
                  <span className="font-bold tabular-nums text-zinc-900">{aud(estimatedValueCents)}</span>
                </div>
                {diffCents > 0 ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500">Potential resale upside:</span>
                    <span className="font-black tabular-nums text-emerald-600">+{aud(diffCents)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">Instant relist credit:</span>
                  <span className="font-black tabular-nums text-violet-600">
                    {relistOffer.eligible ? aud(relistOffer.creditCents) : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-extrabold text-emerald-300">
              {revealTierShortLabel(tier)}
            </span>
            <span className="rounded-full border border-violet-500/40 bg-violet-600/25 px-3 py-1.5 text-[11px] font-extrabold text-violet-100">
              Buyer protection
            </span>
          </div>

          <div className={relistOffer.eligible ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-2'}>
            {relistOffer.eligible ? (
              <button
                type="button"
                onClick={openRelistModal}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-white py-3.5 text-[12px] font-extrabold text-white active:scale-[0.99]"
              >
                <span>Relist instantly</span>
                <span className="mt-0.5 text-[11px] font-semibold text-zinc-300">~{aud(relistOffer.creditCents)}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onKeep}
              className={`flex items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-[12px] font-extrabold text-white shadow-lg shadow-violet-900/40 active:scale-[0.99] ${relistOffer.eligible ? '' : 'w-full'}`}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              Keep item
            </button>
          </div>

          <button
            type="button"
            onClick={onTryAgain}
            className="w-full rounded-2xl border-2 border-white/95 bg-transparent py-3.5 text-[14px] font-bold text-white active:scale-[0.99]"
          >
            Reveal another find
          </button>

          <div className="flex items-center justify-center gap-3 rounded-xl bg-black/80 px-3 py-3 text-center text-[11px] leading-snug text-zinc-400">
            <span className="flex shrink-0 -space-x-2" aria-hidden>
              <span className="h-7 w-7 rounded-full bg-violet-500 ring-2 ring-[#0F0F1B]" />
              <span className="h-7 w-7 rounded-full bg-emerald-500 ring-2 ring-[#0F0F1B]" />
              <span className="h-7 w-7 rounded-full bg-amber-400 ring-2 ring-[#0F0F1B]" />
            </span>
            <span>Recent finds: See what others uncovered.</span>
          </div>
        </div>

        <InstantRelistModal
          open={modalOpen}
          userSpendCents={paidCents}
          estimatedValueCents={estimatedValueCents}
          instantRelistCreditCents={relistOffer.creditCents}
          sellerPayoutEstimateCents={relistOffer.sellerPayoutEstimateCents}
          acceptLabel={`Accept ${aud(relistOffer.creditCents)} Fetchit Credit`}
          onAccept={onAcceptCredit}
          onKeepInstead={() => {
            setModalOpen(false)
            onKeep()
          }}
          onClose={closeModal}
        />
      </>
    )
  }

  return (
    <div className={['space-y-4', pack ? 'text-zinc-100' : ''].join(' ')}>
      <div className="space-y-1.5 text-center">
        <p
          className={[
            'text-[22px] font-black leading-[1.1] tracking-tight',
            pack ? 'bg-gradient-to-r from-cyan-200 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent' : 'text-zinc-950',
          ].join(' ')}
        >
          {headline}
        </p>
        {subheadline ? (
          <p className={['text-[14px] font-semibold leading-snug', pack ? 'text-zinc-400' : 'text-zinc-600'].join(' ')}>{subheadline}</p>
        ) : null}
      </div>

      {guardHint ? (
        <p
          className={[
            'rounded-2xl border px-3 py-2.5 text-center text-[12px] font-semibold',
            pack ? 'border-amber-500/40 bg-amber-950/50 text-amber-100' : 'border-amber-200/90 bg-amber-50 text-amber-950',
          ].join(' ')}
        >
          {guardHint}
        </p>
      ) : null}

      <div
        className={[
          'relative overflow-hidden rounded-[1.15rem] border shadow-sm',
          pack
            ? 'border-cyan-500/25 bg-zinc-900/90 shadow-[0_0_40px_rgba(217,70,239,0.1)] shadow-zinc-950/80'
            : 'border-violet-100 bg-white shadow-violet-950/5',
        ].join(' ')}
      >
        <div className="relative">
          <ResultCelebration tier={tier} />
          <div className="relative z-[3] overflow-hidden rounded-t-[1.1rem]">
            <div className="relative aspect-[4/5] w-full max-h-[min(72vh,28rem)] bg-zinc-100">
              <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15" />

              <span
                className={[
                  'absolute left-2.5 top-2.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wide',
                  tierBadgeTone(tier),
                ].join(' ')}
              >
                {revealTierShortLabel(tier)}
              </span>
              <span
                className={[
                  'absolute bottom-2.5 left-2.5 rounded-full border px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm',
                  pack
                    ? 'border-cyan-500/40 bg-zinc-950/85 text-cyan-100'
                    : 'border-zinc-200/90 bg-white/95 text-zinc-800',
                ].join(' ')}
              >
                {MYSTERY_CATEGORY_LABEL[listing.category]}
              </span>
              {listing.mysterySource === 'mystery_relist' ? (
                <span
                  className={[
                    'absolute bottom-2.5 right-2.5 rounded-full border px-2 py-0.5 text-[9px] font-bold',
                    pack
                      ? 'border-fuchsia-500/35 bg-fuchsia-950/80 text-fuchsia-100'
                      : 'border-violet-200 bg-violet-50/95 text-violet-900',
                  ].join(' ')}
                >
                  Circulating inventory
                </span>
              ) : null}
            </div>
          </div>
          <div className="relative z-[4] space-y-2 px-3 pb-4 pt-3">
            <div>
              <p className={['text-[13px] font-black leading-snug tracking-tight', pack ? 'text-zinc-50' : 'text-zinc-950'].join(' ')}>
                {listing.title}
              </p>
            </div>

            <div className={['flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold', pack ? 'text-zinc-300' : 'text-zinc-800'].join(' ')}>
              <span>
                Trusted seller · {sellerPlain(listing.sellerDisplayName)} ★{listing.sellerRating.toFixed(1)}
              </span>
              <span className={['hidden sm:inline', pack ? 'text-zinc-600' : 'text-zinc-300'].join(' ')} aria-hidden>
                •
              </span>
              <span className={pack ? 'text-zinc-400' : 'text-zinc-600'}>Buyer protected</span>
            </div>

            <div
              className={[
                'rounded-2xl border px-3 py-3',
                pack
                  ? 'border-cyan-500/20 bg-gradient-to-b from-zinc-950/90 to-black/80'
                  : 'border-violet-100 bg-gradient-to-b from-violet-50/80 to-white',
              ].join(' ')}
            >
              <div className="space-y-2 text-[13px]">
                <div
                  className={['flex justify-between gap-3 border-b pb-2', pack ? 'border-zinc-700/90' : 'border-violet-100/90'].join(' ')}
                >
                  <span className={pack ? 'text-zinc-400' : 'text-zinc-600'}>You paid</span>
                  <span className={['font-black', pack ? 'text-zinc-50' : 'text-zinc-950'].join(' ')}>{aud(paidCents)}</span>
                </div>
                <div
                  className={['flex justify-between gap-3 border-b pb-2', pack ? 'border-zinc-700/90' : 'border-violet-100/90'].join(' ')}
                >
                  <span className={pack ? 'text-zinc-400' : 'text-zinc-600'}>Estimated resale value</span>
                  <span className={['font-black', pack ? 'text-zinc-50' : 'text-zinc-950'].join(' ')}>{aud(estimatedValueCents)}</span>
                </div>
                {diffCents > 0 ? (
                  <div
                    className={['flex justify-between gap-3 border-b pb-2', pack ? 'border-zinc-700/90' : 'border-violet-100/90'].join(' ')}
                  >
                    <span className={pack ? 'text-zinc-400' : 'text-zinc-600'}>Potential resale upside</span>
                    <span className="font-black text-emerald-400">+{aud(diffCents)}</span>
                  </div>
                ) : diffCents === 0 ? (
                  <p
                    className={[
                      'border-b pb-2 text-[12px] font-medium',
                      pack ? 'border-zinc-700/90 text-cyan-200/90' : 'border-violet-100/90 text-violet-800',
                    ].join(' ')}
                  >
                    Potential resale vs spend: in line with what you paid (estimate).
                  </p>
                ) : (
                  <p
                    className={[
                      'border-b pb-2 text-[12px] font-medium leading-snug',
                      pack ? 'border-zinc-700/90 text-amber-200/95' : 'border-violet-100/90 text-amber-900',
                    ].join(' ')}
                  >
                    Estimated resale is softer vs what you paid — use Instant Relist credit to stay liquid and reveal
                    again.
                  </p>
                )}
                <div className="flex justify-between gap-3 pt-0.5">
                  <span className={pack ? 'text-zinc-400' : 'text-zinc-600'}>Instant relist credit</span>
                  <span className={['font-black', pack ? 'text-fuchsia-300' : 'text-violet-700'].join(' ')}>
                    {relistOffer.eligible ? aud(relistOffer.creditCents) : '—'}
                  </span>
                </div>
              </div>
              <p className={['mt-2 text-[10px] font-medium leading-snug', pack ? 'text-zinc-500' : 'text-zinc-500'].join(' ')}>
                Listing sticker {aud(listedCents)} · demand-weighted estimate · not guaranteed resale
              </p>
            </div>

            <div
              className={[
                'rounded-xl border px-2.5 py-2 text-[11px] font-medium leading-snug',
                pack ? 'border-zinc-700/90 bg-zinc-950/70 text-zinc-300' : 'border-zinc-100 bg-zinc-50/80 text-zinc-700',
              ].join(' ')}
            >
              <span className={['font-extrabold', pack ? 'text-zinc-100' : 'text-zinc-900'].join(' ')}>{delivery}</span>
            </div>

            {supportiveHint ? (
              <div
                className={[
                  'rounded-xl border px-3 py-2.5 text-[12px]',
                  pack ? 'border-fuchsia-500/25 bg-fuchsia-950/20 text-zinc-300' : 'border-violet-100 bg-violet-50/50 text-zinc-600',
                ].join(' ')}
              >
                {supportiveHint}
              </div>
            ) : null}

            {listing.soldViaMysteryFind ? (
              <p
                className={[
                  'rounded-xl border px-2.5 py-2 text-[10px] font-semibold leading-snug',
                  pack ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-100/90' : 'border-violet-100 bg-violet-50/90 text-violet-950',
                ].join(' ')}
              >
                Matched checkout (demo hold) · seller payout follows your Fetchit minimum terms.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={onKeep}
          className={[
            'rounded-2xl py-4 text-[15px] font-extrabold active:scale-[0.99]',
            pack
              ? 'bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400 text-zinc-950 shadow-[0_0_28px_rgba(217,70,239,0.35)]'
              : 'bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-600 text-white',
          ].join(' ')}
        >
          Keep item
        </button>

        {relistOffer.eligible ? (
          <button
            type="button"
            onClick={openRelistModal}
            className={[
              'rounded-2xl border-2 py-3.5 text-[15px] font-extrabold active:scale-[0.99]',
              pack
                ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'border-violet-200 bg-violet-50 text-violet-950',
            ].join(' ')}
          >
            <span className="block">Relist instantly</span>
            <span className={['mt-0.5 block text-[12px] font-bold', pack ? 'text-cyan-200/90' : 'text-violet-700'].join(' ')}>
              ~{aud(relistOffer.creditCents)} credit
            </span>
          </button>
        ) : (
          <p
            className={[
              'rounded-2xl border px-3 py-3 text-center text-[12px] font-medium leading-relaxed',
              pack ? 'border-zinc-700 bg-zinc-900/80 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-600',
            ].join(' ')}
          >
            Instant relist credit isn&apos;t available on this find. Keep the item or reveal another.
          </p>
        )}

        <button
          type="button"
          onClick={onTryAgain}
          className={[
            'rounded-2xl border border-dashed py-3.5 text-[14px] font-bold',
            pack ? 'border-fuchsia-500/40 bg-zinc-950/80 text-fuchsia-200' : 'border-violet-300 bg-white text-violet-800',
          ].join(' ')}
        >
          Open another pack
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onShare}
            className={[
              'rounded-2xl border py-3 text-[13px] font-bold',
              pack ? 'border-zinc-600 bg-zinc-900/70 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900',
            ].join(' ')}
          >
            Share reveal
          </button>
          <button
            type="button"
            onClick={onFollowSeller}
            className={[
              'rounded-2xl border py-3 text-[13px] font-bold',
              pack ? 'border-zinc-600 bg-zinc-900/70 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900',
            ].join(' ')}
          >
            Follow seller
          </button>
        </div>
      </div>

      <InstantRelistModal
        open={modalOpen}
        userSpendCents={paidCents}
        estimatedValueCents={estimatedValueCents}
        instantRelistCreditCents={relistOffer.creditCents}
        sellerPayoutEstimateCents={relistOffer.sellerPayoutEstimateCents}
        acceptLabel={`Accept ${aud(relistOffer.creditCents)} Fetchit Credit`}
        onAccept={onAcceptCredit}
        onKeepInstead={() => {
          setModalOpen(false)
          onKeep()
        }}
        onClose={closeModal}
      />
    </div>
  )
})
