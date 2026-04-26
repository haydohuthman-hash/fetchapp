import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  formatAudCents,
  formatCountLabel,
  formatMmSs,
  type LiveBidState,
  type StartingSoonBattle,
} from '../lib/fetchBidWarsBattles'

type Props = {
  battle: StartingSoonBattle
  /**
   * Current phase for this battle in the shared feed clock. Drives the pill
   * and the sticky CTA: 'upcoming' → "Starts in MM:SS" / "Enter battle",
   * 'live' → "LIVE · MM:SS" / "Join live now", 'done' → a muted ended
   * state (rare; the sheet is usually closed before a battle ends).
   */
  phase?: 'upcoming' | 'live' | 'done'
  /** Remaining seconds for this battle; driven by the shared feed clock. */
  remaining: number
  /** Shared live bid state — present when `phase === 'live'`. */
  live?: LiveBidState
  reminded: boolean
  onToggleRemind: () => void
  onEnterBattle: () => void
  onClose: () => void
}

/**
 * Bottom-sheet preview for an upcoming Bid Wars listing.
 *
 * Shows a swipeable photo gallery, the title/subtitle, est. value, condition,
 * a short description, and a live-synced countdown. The primary CTA flips to
 * "Join live now" once the shared clock hits zero so it stays in lockstep
 * with the feed and battle overlay.
 */
export function StartingSoonListingSheet({
  battle,
  phase = 'upcoming',
  remaining,
  live,
  reminded,
  onToggleRemind,
  onEnterBattle,
  onClose,
}: Props) {
  const portalTarget = typeof document !== 'undefined' ? document.body : null
  const photos = useMemo(
    () => (battle.photos && battle.photos.length > 0 ? battle.photos : [battle.imageUrl]),
    [battle.photos, battle.imageUrl],
  )

  const [activeIdx, setActiveIdx] = useState(0)
  const galleryRef = useRef<HTMLDivElement | null>(null)

  const isLive = phase === 'live' && !!live
  const isDone = phase === 'done'
  const topBidder = isLive
    ? live!.bidders.find((b) => b.id === live!.topBidderId)
    : undefined

  const handleScroll = useCallback(() => {
    const el = galleryRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
    setActiveIdx(Math.min(photos.length - 1, Math.max(0, idx)))
  }, [photos.length])

  // Lock page scroll while the sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Close on Escape for desktop / keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!portalTarget) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9996] flex flex-col justify-end"
      role="dialog"
      aria-modal
      aria-label={`${battle.title} listing details`}
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close listing details"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div className="fetch-sheet-slide-up relative z-[1] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-30px_60px_-20px_rgba(76,29,149,0.55)]">
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pt-2">
          <span className="h-1.5 w-10 rounded-full bg-zinc-300" aria-hidden />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(5.5rem+max(1rem,env(safe-area-inset-bottom,0px)))] pt-2">
          {/* Gallery */}
          <div className="relative -mx-4 overflow-hidden">
            <div
              ref={galleryRef}
              onScroll={handleScroll}
              className="fetch-sheet-gallery flex h-[18rem] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {photos.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className="relative h-full w-full shrink-0 basis-full snap-center bg-zinc-100"
                >
                  <img
                    src={src}
                    alt={`${battle.title} photo ${i + 1}`}
                    className="h-full w-full object-cover"
                    draggable={false}
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>

            {/* Counter chip */}
            {photos.length > 1 ? (
              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                {activeIdx + 1} / {photos.length}
              </span>
            ) : null}

            {/* Dots */}
            {photos.length > 1 ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <span
                    key={i}
                    className={[
                      'h-1.5 rounded-full transition-[width,background-color]',
                      i === activeIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/60',
                    ].join(' ')}
                  />
                ))}
              </div>
            ) : null}

            {/* Status pill overlaid top-left */}
            <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
              {isLive ? (
                <>
                  <span className="fetch-battle-live-pill flex items-center gap-1.5 rounded-md bg-red-600 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    LIVE · <span className="tabular-nums">{formatMmSs(remaining)}</span>
                  </span>
                  <span
                    key={`sheet-bid-${live!.currentBidCents}`}
                    className="rounded-md bg-black/70 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm"
                  >
                    Bid{' '}
                    <span className="tabular-nums">{formatAudCents(live!.currentBidCents)}</span>
                  </span>
                </>
              ) : isDone ? (
                <span className="rounded-md bg-zinc-800/80 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white/90 shadow-sm">
                  Battle ended
                </span>
              ) : (
                <span className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#4c1d95] shadow-sm">
                  Starts in {formatMmSs(remaining)}
                </span>
              )}
            </div>
          </div>

          {/* Title + price block. Shows current bid when live, est. value otherwise. */}
          <div className="mt-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4c1d95]/80">
                Battle {battle.battleNumber}
              </p>
              <p className="mt-0.5 text-[22px] font-black leading-tight text-[#1c1528]">
                {battle.title}
              </p>
              {battle.subtitle ? (
                <p className="text-[15px] font-semibold leading-tight text-zinc-500">
                  {battle.subtitle}
                </p>
              ) : null}
              {isLive && topBidder ? (
                <p className="mt-1 text-[12px] font-semibold text-zinc-500">
                  Leading{' '}
                  <span className="font-bold text-[#1c1528]">{topBidder.handle}</span>
                </p>
              ) : null}
            </div>
            {isLive ? (
              <div
                key={`sheet-price-${live!.currentBidCents}`}
                className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-right ring-1 ring-red-100"
              >
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-red-600/80">
                  Current bid
                </p>
                <p className="text-[18px] font-black leading-none tabular-nums text-red-600">
                  {formatAudCents(live!.currentBidCents)}
                </p>
                <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                  Est. {formatAudCents(battle.estValueCents)}
                </p>
              </div>
            ) : (
              <div className="shrink-0 rounded-xl bg-violet-50 px-3 py-2 text-right ring-1 ring-violet-100">
                <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#4c1d95]/70">
                  Est. value
                </p>
                <p className="text-[16px] font-black leading-none tabular-nums text-[#4c1d95]">
                  {formatAudCents(battle.estValueCents)}
                </p>
              </div>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {battle.condition ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 12l5 5L19 7"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {battle.condition}
              </span>
            ) : null}
            <span className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M16 11a4 4 0 10-4-4 4 4 0 004 4zM3 20a7 7 0 0114 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {formatCountLabel(battle.attendees)} watching
            </span>
          </div>

          {/* Description */}
          {battle.description ? (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                About this listing
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-700">
                {battle.description}
              </p>
            </div>
          ) : null}

          {/* Photo thumb strip (jump to slide) */}
          {photos.length > 1 ? (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                Photos
              </p>
              <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {photos.map((src, i) => (
                  <button
                    key={`thumb-${i}`}
                    type="button"
                    onClick={() => {
                      const el = galleryRef.current
                      if (!el) return
                      el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
                    }}
                    className={[
                      'h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 transition-[outline-width,transform] active:scale-95',
                      i === activeIdx
                        ? 'outline outline-2 outline-[#4c1d95]'
                        : 'outline outline-1 outline-zinc-200',
                    ].join(' ')}
                    aria-label={`Show photo ${i + 1}`}
                  >
                    <img
                      src={src}
                      alt=""
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sticky footer CTA */}
        <div className="absolute inset-x-0 bottom-0 z-[2] flex items-center gap-2 border-t border-zinc-100 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={onToggleRemind}
            aria-label={reminded ? `Reminder set for ${battle.title}` : `Remind me when ${battle.title} starts`}
            className={[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-[background-color,color,transform] active:scale-[0.94]',
              reminded
                ? 'bg-[#4c1d95] text-white shadow-sm'
                : 'bg-violet-50 text-[#4c1d95] ring-1 ring-violet-200',
            ].join(' ')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.65V5a2 2 0 10-4 0v.35A6 6 0 006 11v3.2c0 .53-.21 1.04-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={reminded ? 'currentColor' : 'none'}
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={isDone ? onClose : onEnterBattle}
            disabled={isDone}
            className={[
              'flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[14px] font-extrabold uppercase tracking-[0.1em] text-white transition-transform active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100',
              isLive
                ? 'fetch-battle-join-pulse bg-gradient-to-b from-red-500 via-red-600 to-red-700 shadow-[0_14px_28px_-10px_rgba(239,68,68,0.75)]'
                : isDone
                  ? 'bg-zinc-500'
                  : 'bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] shadow-[0_16px_34px_-14px_rgba(76,29,149,0.7)]',
            ].join(' ')}
          >
            {isLive ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M13 2L4.09 12.26a1 1 0 00.78 1.63L11 14l-2 8 9-10.26A1 1 0 0017.13 10.1L11 10l2-8z" />
                </svg>
                Join live
                <span className="ml-0.5 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                  {formatMmSs(remaining)}
                </span>
              </>
            ) : isDone ? (
              <>Battle ended</>
            ) : (
              <>
                Enter battle
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                  {formatMmSs(remaining)}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  )
}
