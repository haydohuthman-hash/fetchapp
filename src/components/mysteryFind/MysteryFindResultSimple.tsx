import { memo, useCallback } from 'react'
import { Bookmark, Heart, Share2, Store } from 'lucide-react'
import type { MysteryFindResult } from '../../lib/mysteryFind/types'
import { MYSTERY_CATEGORY_LABEL } from '../../lib/mysteryFind/constants'
import type { MysteryRevealTierId } from '../../lib/mysteryFind/outcomeTier'
import { commerceRevealHeadline, deriveRevealTierFromValues, revealTierShortLabel } from '../../lib/mysteryFind/outcomeTier'
import { ResultCelebration } from './ResultCelebration'
import { playUiFeedback } from '../../voice/fetchFeedback'

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

/** Premium light-commerce result — no relist economy; focus on clarity & trust. */
export const MysteryFindResultSimple = memo(function MysteryFindResultSimple({
  result,
  budgetMaxCents,
  onKeep,
  onAgain,
  onShare,
  onViewSeller,
}: {
  result: MysteryFindResult
  budgetMaxCents: number
  onKeep: () => void
  onAgain: () => void
  onShare: () => void
  onViewSeller: () => void
}) {
  const { listing, paidCents, estimatedValueCents } = result
  const tier: MysteryRevealTierId = result.revealTier ?? deriveRevealTierFromValues(paidCents, estimatedValueCents)
  const headline = commerceRevealHeadline(tier)

  const onSave = useCallback(() => {
    playUiFeedback('success')
  }, [])

  return (
    <div className="relative flex flex-col gap-6 text-[var(--color-fetch-charcoal,#1c1528)]">
      <ResultCelebration tier={tier} />
      <div className="relative z-[3] text-center">
        <p
          className={[
            'text-[1.65rem] font-black leading-[1.12] tracking-tight sm:text-[1.85rem]',
            tier === 'great'
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 bg-clip-text text-transparent'
              : tier === 'rare'
                ? 'bg-gradient-to-br from-violet-700 to-fuchsia-700 bg-clip-text text-transparent'
                : 'text-[var(--color-fetch-charcoal,#1c1528)]',
          ].join(' ')}
        >
          {headline}
        </p>
        {tier === 'great' || tier === 'rare' ? (
          <p className="mt-2 text-[12px] font-medium text-[var(--color-fetch-muted,#64748b)]">
            Top-tier marketplace match for your budget.
          </p>
        ) : null}
      </div>

      <div className="relative z-[3] overflow-hidden rounded-[28px] border border-zinc-200/90 bg-white shadow-[0_24px_72px_rgba(28,21,40,0.1)] ring-1 ring-violet-100/30">
        <div className="relative max-h-[min(52vh,22rem)] w-full bg-[radial-gradient(ellipse_80%_70%_at_50%_45%,rgba(124,58,246,0.08),var(--fetch-soft-gray,#f4f2fa))]">
          <img src={listing.imageUrl} alt="" className="mx-auto h-full max-h-[min(52vh,22rem)] w-full object-contain" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
          <button
            type="button"
            className="absolute right-3 top-3 rounded-full bg-white/95 p-2.5 shadow-[0_4px_20px_rgba(28,21,40,0.12)] ring-1 ring-white/80 backdrop-blur-sm"
            aria-label="Favorite"
            onClick={() => playUiFeedback('success')}
          >
            <Heart className="h-5 w-5 text-violet-600" strokeWidth={2} />
          </button>
        </div>
        <div className="space-y-4 px-4 pb-5 pt-5">
          <div>
            <p className="text-[18px] font-bold leading-snug tracking-tight">{listing.title}</p>
            <button
              type="button"
              onClick={onViewSeller}
              className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-violet-700 hover:text-violet-800"
            >
              <Store className="h-4 w-4" strokeWidth={2} />
              View seller · {sellerPlain(listing.sellerDisplayName)} · ★{listing.sellerRating.toFixed(1)}
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-100 bg-[var(--fetch-soft-gray,#f4f2fa)]/90 px-3.5 py-3.5">
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="text-[var(--color-fetch-muted,#64748b)]">You paid</span>
              <span className="font-bold tabular-nums">{aud(paidCents)}</span>
            </div>
            <div className="mt-2.5 flex justify-between gap-3 border-t border-zinc-200/80 pt-2.5 text-[13px]">
              <span className="text-[var(--color-fetch-muted,#64748b)]">Your max spend</span>
              <span className="font-bold tabular-nums text-zinc-800">{aud(budgetMaxCents)}</span>
            </div>
            <div className="mt-2.5 flex justify-between gap-3 border-t border-zinc-200/80 pt-2.5 text-[13px]">
              <span className="text-[var(--color-fetch-muted,#64748b)]">Estimated marketplace value</span>
              <span className="font-black tabular-nums text-violet-700">{aud(estimatedValueCents)}</span>
            </div>
            <div className="mt-2.5 flex justify-between gap-3 border-t border-zinc-200/80 pt-2.5 text-[12px] text-[var(--color-fetch-muted,#64748b)]">
              <span>Category</span>
              <span className="font-semibold text-zinc-800">{MYSTERY_CATEGORY_LABEL[listing.category]}</span>
            </div>
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-[var(--color-fetch-muted,#64748b)]">
              Ship-to-you delivery · tracked where available · authenticity verified per seller listing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-900">
              {revealTierShortLabel(tier)}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
              Buyer protection
            </span>
          </div>

          <button
            type="button"
            onClick={onKeep}
            className="relative w-full overflow-hidden rounded-[22px] bg-gradient-to-r from-violet-600 via-violet-600 to-fuchsia-600 py-[1.02rem] text-[15px] font-extrabold text-white shadow-[0_12px_36px_rgba(124,58,237,0.32)] ring-1 ring-white/25 transition-[transform,filter] duration-150 active:scale-[0.99] active:brightness-95"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/18 to-transparent" />
            <span className="relative">Keep this item</span>
          </button>

          <button
            type="button"
            onClick={onAgain}
            className="w-full rounded-[22px] border-2 border-zinc-200 bg-white py-3.5 text-[14px] font-bold text-zinc-900 shadow-sm transition-[transform] active:scale-[0.99]"
          >
            Reveal another find
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onShare}
              className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-200 bg-white py-3 text-[10px] font-bold text-zinc-700 shadow-sm transition-[transform,background-color] active:scale-[0.98] hover:bg-zinc-50"
            >
              <Share2 className="h-4 w-4" strokeWidth={2} />
              Share
            </button>
            <button
              type="button"
              onClick={onViewSeller}
              className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-200 bg-white py-3 text-[10px] font-bold text-zinc-700 shadow-sm transition-[transform,background-color] active:scale-[0.98] hover:bg-zinc-50"
            >
              <Store className="h-4 w-4" strokeWidth={2} />
              Seller
            </button>
            <button
              type="button"
              onClick={onSave}
              className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-200 bg-white py-3 text-[10px] font-bold text-zinc-700 shadow-sm transition-[transform,background-color] active:scale-[0.98] hover:bg-zinc-50"
            >
              <Bookmark className="h-4 w-4" strokeWidth={2} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
