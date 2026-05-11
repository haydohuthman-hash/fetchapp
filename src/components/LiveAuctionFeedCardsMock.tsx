import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { DropCategoryId, DropReel } from '../lib/drops/types'
import {
  ExploreStoryComposerModal,
  ExploreStoryViewerModal,
  type PublishedExploreStory,
} from './ExploreStoryComposerModal'
import { dropReelIsLivestreamCapable } from '../lib/liveFeedDemo'
import { listingImageAbsoluteUrl } from '../lib/listingsApi'
import AddStoryCircle from './AddStoryCircle'
import { isFetchAppLocalHostname } from '../lib/fetchDevDemo'
import { dropReelToLiveFeedStream, type LiveFeedStream } from '../lib/liveFeedDemo'

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const REGION_META: Partial<Record<DropReel['region'], { code: string; name: string }>> & {
  default: { code: string; name: string }
} = {
  SEQ: { code: 'AU', name: 'Australia' },
  NSW: { code: 'AU', name: 'Australia' },
  VIC: { code: 'AU', name: 'Australia' },
  AU_WIDE: { code: 'AU', name: 'Australia' },
  default: { code: 'AU', name: 'Australia' },
}

const CATEGORY_TAG: Partial<Record<DropCategoryId, string>> = {
  supplies: 'Supplies',
  local_pickup: 'Local pickup',
  b2b: 'Business',
  promo: 'Promo',
  community: 'Community',
  services: 'Services',
}

/** Explore live strip — wired to real feed filtering */
export type ExploreLiveCategoryKey =
  | 'foryou'
  | 'following'
  | 'pokemon'
  | 'sports'
  | 'streetwear'
  | 'coins'

function exploreLiveSearchBlob(reel: DropReel): string {
  const catLabels = reel.categories.map((c) => CATEGORY_TAG[c] ?? c).join(' ')
  return `${reel.title} ${reel.blurb} ${reel.seller} ${catLabels}`.toLowerCase()
}

function filterDropReelsByExploreCategory(
  reels: DropReel[],
  key: ExploreLiveCategoryKey,
): DropReel[] {
  if (key === 'foryou') return reels
  if (key === 'following') {
    return reels.filter((r) => (r.growthVelocityScore ?? 0) >= 1.06)
  }
  return reels.filter((r) => {
    const b = exploreLiveSearchBlob(r)
    switch (key) {
      case 'pokemon':
        return /\b(pokemon|pokémon|tcg|pikachu|charizard|booster)\b/i.test(b)
      case 'sports':
        return /\b(sport|jersey|ball|nba|afl|nfl|graded|psa|collectible|card)\b/i.test(b)
      case 'streetwear':
        return /\b(sneaker|street|nike|jordan|yeezy|hoodie|apparel|fashion|kick|windbreaker|jacket)\b/i.test(b)
      case 'coins':
        return /\b(coin|bullion|gold|silver|numismatic|mint)\b/i.test(b)
      default:
        return true
    }
  })
}

type FeedCard = {
  stream: LiveFeedStream
  reel: DropReel
  thumbSquareSrc: string
  thumbCarouselSrc: string
  username: string
  sellerCountryCode: string
  sellerCountry: string
  title: string
  tags: [string, string]
  viewerDisplay: string
  commentsDisplay: string
  avatarUrl: string
}

function formatViewerDisplay(stream: LiveFeedStream): string {
  return stream.watchersLabel || String(Math.max(0, stream.watchers))
}

function streamToFeedCard(reel: DropReel, index: number): FeedCard {
  const stream = dropReelToLiveFeedStream(reel, index)
  const thumbSquareSrc =
    stream.imageUrl?.trim() ||
    stream.portraitImageUrl?.trim() ||
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="144" height="144"%3E%3Crect width="144" height="144" rx="28" fill="%23e4e4e7"/%3E%3C/svg%3E'
  const thumbCarouselSrc = stream.portraitImageUrl?.trim() || thumbSquareSrc
  const h = hash(stream.id)
  const commentsDisplay = String(12 + ((h * 17) % 920))
  const meta = REGION_META[reel.region] ?? REGION_META.default
  const cats = reel.categories.slice(0, 2).filter(Boolean)
  const tagA = (cats[0] && CATEGORY_TAG[cats[0]]) || 'Live'
  const tagB = (cats[1] && CATEGORY_TAG[cats[1]]) || 'Now'
  const handle = stream.seller.replace(/^@+/u, '').trim() || 'seller'

  return {
    stream,
    reel,
    thumbSquareSrc,
    thumbCarouselSrc,
    username: handle,
    sellerCountryCode: meta.code,
    sellerCountry: meta.name,
    title: stream.title?.trim() || 'Live stream',
    tags: [tagA, tagB],
    viewerDisplay: formatViewerDisplay(stream),
    commentsDisplay,
    avatarUrl: `https://i.pravatar.cc/96?u=${encodeURIComponent(stream.id)}`,
  }
}

function IconStatEye({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 5C7 5 3.73 9.36 3 12c.73 2.64 4 7 9 7s8.27-4.36 9-7c-.73-2.64-4-7-9-7z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function IconStatChat({ className }: { className?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M21 15a4 4 0 004-4V7l-8 5-4-3-8 5v8a4 4 0 004 4h12z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconMenuDots({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

function IconSparkle({ className = 'h-[13px] w-[13px] shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.05 6.93L19 11l-5.95 2.07L12 19l-1.05-5.93L5 11l5.95-2.07L12 2z" opacity="0.95" />
    </svg>
  )
}

function IconHeart({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden strokeWidth="2">
      <path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPokeball({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden strokeWidth="2">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeLinecap="round" />
      <path d="M3 12h18" stroke="currentColor" />
      <circle cx="12" cy="12" r="3.1" fill="white" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconBasketball({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden strokeWidth="1.85">
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeLinecap="round" />
      <path d="M4.73 16.73c4.72-5.54 11.82-11.82 14.54-14.54M18.73 18.73C14.73 13.73 10.73 11.73 8.73 9.73M3 12h18" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

function IconHoodie({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden strokeWidth="2">
      <path
        d="M7 7V5a3 3 0 016 0v2M5 9l-2 4v7h18v-7l-2-4M5 9h14M9 9v9M15 9v9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCoin({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className} aria-hidden strokeWidth="2">
      <circle cx="12" cy="12" r="8" stroke="currentColor" />
      <path d="M12 8v8M9.5 10.5h5M9.5 13.5h5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}

function rowDividerPadding(index: number, len: number) {
  if (len <= 1) return 'pb-2 pt-0.5'
  if (index === 0) return 'pb-3.5 pt-0.5'
  if (index === len - 1) return 'pb-0 pt-4'
  return 'pt-4 pb-3.5'
}

export type ExploreStoryItem = {
  id: string
  label: string
  imageUrl: string
  kind: 'user' | 'mine'
  reelId?: string
  /** Local clip published from this session (object URL). */
  videoBlobUrl?: string
}

function reelStoryThumbUrl(reel: DropReel): string {
  const raw = reel.liveCoverSquareUrl || reel.imageUrls?.[0] || reel.poster
  const t = raw?.trim()
  if (!t) return ''
  if (/^https?:\/\//iu.test(t) || t.startsWith('data:')) return t
  return listingImageAbsoluteUrl(t)
}

function buildFeedStoryRingItems(reels: DropReel[]): ExploreStoryItem[] {
  const seen = new Set<string>()
  const fromFeed: ExploreStoryItem[] = []
  for (const r of reels) {
    const thumb = reelStoryThumbUrl(r)
    if (!thumb) continue
    const authorKey = r.authorId?.trim() || r.id
    if (seen.has(authorKey)) continue
    seen.add(authorKey)
    const handle = r.seller.replace(/^@+/u, '').trim() || 'Live'
    const short = handle.length > 11 ? `${handle.slice(0, 10)}…` : handle
    fromFeed.push({
      id: `story-feed-${authorKey}`,
      label: short,
      imageUrl: thumb,
      kind: 'user',
      reelId: r.id,
    })
    if (fromFeed.length >= 12) break
  }
  return fromFeed
}

function localStoryLabel(overlayText: string): string {
  const t = overlayText.trim()
  if (!t) return 'Your clip'
  return t.length > 11 ? `${t.slice(0, 10)}…` : t
}

function StoryRingAvatar({ item }: { item: ExploreStoryItem }) {
  const ringSource = item.imageUrl.trim()
  if (!ringSource) {
    return (
      <div className="mx-auto flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-zinc-200 text-[11px] font-bold text-zinc-700">
        Live
      </div>
    )
  }
  return (
    <div className="mx-auto rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-700 p-[2.5px]">
      <div className="rounded-full bg-white p-[2.5px]">
        <img
          src={ringSource}
          alt=""
          className="h-14 w-14 rounded-full bg-zinc-100 object-cover"
          draggable={false}
        />
      </div>
    </div>
  )
}

/** Instagram-style rings — lead slot (Add story) + clips + live sellers from reel art. */
function ExploreStoriesRow({
  leadSlot,
  items,
  onSelect,
}: {
  leadSlot: ReactNode
  items: ExploreStoryItem[]
  onSelect: (item: ExploreStoryItem) => void
}) {
  if (!leadSlot && items.length === 0) return null
  return (
    <div
      className={[
        'flex -mx-3 mb-3 gap-3.5 overflow-x-auto pb-1.5 pl-3 pr-3 sm:-mx-5 sm:gap-4 sm:pl-5 sm:pr-5',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
      ].join(' ')}
      aria-label="Stories — your clips and sellers going live"
    >
      {leadSlot}
      <ul className="m-0 flex list-none gap-3.5 p-0">
        {items.map((it) => (
          <li key={it.id} className="w-[4.8rem] shrink-0">
            <button
              type="button"
              onClick={() => onSelect(it)}
              className="flex w-full flex-col items-center gap-1.5 text-center outline-none [-webkit-tap-highlight-color:transparent] transition-[filter] active:brightness-95"
              aria-label={
                it.kind === 'mine'
                  ? `Play your story: ${it.label}`
                  : `Watch ${it.label} live story`
              }
            >
              <StoryRingAvatar item={it} />
              <span className="w-full max-w-[4.8rem] truncate text-[11px] font-medium leading-tight text-zinc-700">
                {it.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LiveThumbBadge({ placement = 'corner' }: { placement?: 'corner' | 'portraitBottom' }) {
  const cls =
    placement === 'portraitBottom'
      ? 'pointer-events-none absolute bottom-2.5 left-2 z-[1] sm:bottom-3 sm:left-2.5'
      : 'pointer-events-none absolute left-2 top-1 z-[1] sm:left-2.5 sm:top-1.5'

  return (
    <div className={cls} aria-hidden>
      <span className="inline-flex shrink-0 items-center gap-[5px] rounded-full bg-red-600 px-[7px] py-[4px] text-[9px] font-semibold uppercase tracking-[0.04em] text-white sm:px-2 sm:py-1 sm:text-[9.5px]">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-white sm:h-1.5 sm:w-1.5" />
        Live
      </span>
    </div>
  )
}

function CategoryPillsRow({
  activeKey,
  onSelect,
}: {
  activeKey: ExploreLiveCategoryKey
  onSelect: (key: ExploreLiveCategoryKey) => void
}) {
  const items: { key: ExploreLiveCategoryKey; label: string; icon: ReactNode }[] = [
    {
      key: 'foryou',
      label: 'For You',
      icon: <IconSparkle className="h-5 w-5 shrink-0 text-current sm:h-[22px] sm:w-[22px]" />,
    },
    {
      key: 'following',
      label: 'Following',
      icon: <IconHeart className="h-5 w-5 shrink-0 text-current sm:h-[22px] sm:w-[22px]" />,
    },
    {
      key: 'pokemon',
      label: 'Pokémon',
      icon: <IconPokeball className="h-5 w-5 shrink-0 text-current sm:h-[22px] sm:w-[22px]" />,
    },
    {
      key: 'sports',
      label: 'Sports',
      icon: <IconBasketball className="h-5 w-5 shrink-0 text-current sm:h-[22px] sm:w-[22px]" />,
    },
    {
      key: 'streetwear',
      label: 'Streetwear',
      icon: <IconHoodie className="h-5 w-5 shrink-0 text-current sm:h-[22px] sm:w-[22px]" />,
    },
    {
      key: 'coins',
      label: 'Coins & More',
      icon: <IconCoin className="h-5 w-5 shrink-0 text-current sm:h-[22px] sm:w-[22px]" />,
    },
  ]

  return (
    <div
      className={[
        '-mx-3 mb-5 flex gap-1.5 overflow-x-auto bg-white py-2 pl-3 pr-3 sm:-mx-5 sm:pl-5 sm:pr-5',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
      ].join(' ')}
      role="tablist"
      aria-label="Live feed categories"
    >
      {items.map((it) => {
        const on = it.key === activeKey
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(it.key)}
            className={[
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold leading-none tracking-[-0.01em]',
              'outline-none [-webkit-tap-highlight-color:transparent] transition-[background-color,color,border-color,filter] duration-200 active:brightness-[0.96]',
              on
                ? 'border-transparent bg-zinc-950 text-white'
                : 'border-zinc-200/90 bg-transparent text-zinc-600',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400',
            ].join(' ')}
          >
            {it.icon}
            <span className="whitespace-nowrap">{it.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function LiveAuctionRowCard({
  card,
  dividerClass,
  onPress,
  onOpenSellerProfile,
}: {
  card: FeedCard
  dividerClass: string
  onPress?: () => void
  onOpenSellerProfile?: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (onOpenSellerProfile && (e.target as HTMLElement).closest('[data-live-seller-profile]')) {
          onOpenSellerProfile()
          return
        }
        onPress?.()
      }}
      className={[
        'flex w-full min-w-0 flex-row items-stretch gap-3 rounded-2xl bg-white text-left',
        dividerClass,
        onPress || onOpenSellerProfile ? 'cursor-pointer outline-none ring-0 transition-[filter] active:brightness-[0.985]' : '',
      ].join(' ')}
    >
      <div className="relative aspect-square w-[42%] min-w-0 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 sm:w-[44%]">
        <img src={card.thumbSquareSrc} alt="" className="h-full w-full object-cover" draggable={false} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.12] via-transparent to-black/[0.05]" />
        <LiveThumbBadge placement="corner" />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col py-1 pl-0 pr-0.5 sm:py-1.5 sm:pr-1">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <img src={card.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" draggable={false} />
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            <span
              title={card.username}
              data-live-seller-profile={onOpenSellerProfile ? '' : undefined}
              className={
                onOpenSellerProfile
                  ? 'min-w-0 truncate text-[11px] font-bold leading-snug tracking-[-0.02em] text-violet-700 underline decoration-violet-300 underline-offset-2 sm:text-[12px]'
                  : 'min-w-0 truncate text-[11px] font-bold leading-snug tracking-[-0.02em] text-zinc-900 sm:text-[12px]'
              }
            >
              {card.username}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
            <span
              className="inline-flex shrink-0 items-center rounded-full border border-violet-300 bg-violet-50/90 px-2 py-[3px] text-[9.5px] font-semibold text-violet-700 sm:px-2.5 sm:text-[10px]"
              aria-hidden
            >
              Follow
            </span>
            <span
              className="flex h-7 w-7 shrink-0 flex-none items-center justify-center rounded-full border border-transparent text-zinc-400"
              aria-label="More"
            >
              <IconMenuDots className="h-4 w-4 -translate-x-px" />
            </span>
          </div>
        </div>

        <div className="mt-0.5 flex min-h-0 flex-col gap-2 sm:gap-2.5">
          <h3 className="line-clamp-2 text-left text-[10.5px] font-bold leading-[1.12] tracking-[-0.015em] text-black sm:text-[11px] sm:leading-[1.15]">
            {card.title}
          </h3>
          <div className="flex flex-wrap gap-1">
            {card.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-violet-100 px-2 py-[3px] text-[9.5px] font-semibold leading-none text-violet-900 sm:text-[10px]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-4 pt-2 text-zinc-500 sm:gap-5 sm:pt-2.5">
          <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums text-zinc-600">
            <IconStatEye className="h-3.5 w-3.5 text-zinc-400" />
            {card.viewerDisplay}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums text-zinc-600">
            <IconStatChat className="h-3.5 w-3.5 text-zinc-400" />
            {card.commentsDisplay}
            <span
              className="ml-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-zinc-400"
              title={card.sellerCountry}
              aria-label={`Seller region: ${card.sellerCountry}`}
            >
              {card.sellerCountryCode}
            </span>
          </span>
        </div>
      </div>
    </button>
  )
}

function WhatnotCarouselLiveCue({ viewerCount }: { viewerCount: string }) {
  return (
    <div className="pointer-events-none" aria-hidden>
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#ef4444] px-2 py-1 ring-[0.5px] ring-black/25">
        <span className="h-[6px] w-[6px] shrink-0 animate-pulse rounded-full bg-white" />
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-white">Live</span>
        <span className="h-3 w-px shrink-0 bg-white/35" aria-hidden />
        <span className="inline-flex items-center gap-0.5 pr-0.5">
          <IconStatEye className="h-2.5 w-2.5 shrink-0 text-white/92" />
          <span className="text-[10px] font-bold tabular-nums tracking-tight text-white">{viewerCount}</span>
        </span>
      </span>
    </div>
  )
}

function PortraitLiveTileBackdropAndTop({ card }: { card: FeedCard }) {
  return (
    <>
      <img
        src={card.thumbCarouselSrc}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[30%] bg-gradient-to-b from-black/55 via-black/14 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] min-h-[55%] bg-gradient-to-t from-black via-black/[0.78] to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-start px-3 pt-3 pb-1">
        <WhatnotCarouselLiveCue viewerCount={card.viewerDisplay} />
      </div>
    </>
  )
}

function PortraitLiveTileBottomFooter({
  card,
  onSellerProfileClick,
}: {
  card: FeedCard
  onSellerProfileClick?: () => void
}) {
  const avatar = (
    <img
      src={card.avatarUrl}
      alt=""
      className="h-6 w-6 shrink-0 rounded-full object-cover ring-[0.75px] ring-white/25"
      draggable={false}
    />
  )

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] p-3.5 pb-3.5 pt-10">
      <div className="flex min-w-0 flex-col gap-1.5">
        {onSellerProfileClick ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSellerProfileClick()
              }}
              className="pointer-events-auto relative z-[5] flex min-w-0 max-w-full items-center gap-2 rounded-md py-0.5 pr-1 text-left transition-colors active:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
            >
              {avatar}
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug tracking-[-0.015em] text-white sm:text-[11.25px]">
                {card.username}
              </span>
            </button>
            <p className="pointer-events-none min-w-0 pl-0 text-[10px] font-medium leading-snug text-white/78 sm:text-[10.25px]">
              <span className="line-clamp-2 block">{card.title}</span>
            </p>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              {avatar}
              <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug tracking-[-0.015em] text-white sm:text-[11.25px]">
                {card.username}
              </p>
            </div>
            <p className="pointer-events-none min-w-0 text-[10px] font-medium leading-snug text-white/78 sm:text-[10.25px]">
              <span className="line-clamp-2 block">{card.title}</span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/** Portrait tile body: backdrop, full-area watch tap target, optional profile on display name. */
function PortraitLiveTileLayers({
  card,
  onSelect,
  onOpenSellerProfile,
}: {
  card: FeedCard
  onSelect?: () => void
  onOpenSellerProfile?: (reel: DropReel) => void
}) {
  const sellerTap =
    onOpenSellerProfile && card.reel.authorId?.trim()
      ? () => onOpenSellerProfile(card.reel)
      : undefined

  return (
    <>
      <PortraitLiveTileBackdropAndTop card={card} />
      <button
        type="button"
        className="absolute inset-0 z-[3] bg-transparent outline-none ring-0"
        onClick={() => onSelect?.()}
        aria-label={`Watch live stream — ${card.username}: ${card.title}`}
        title={card.title}
      />
      <PortraitLiveTileBottomFooter card={card} onSellerProfileClick={sellerTap} />
    </>
  )
}

function LivePortraitGrid({
  cards,
  onSelect,
  onOpenSellerProfile,
}: {
  cards: FeedCard[]
  onSelect?: (reel: DropReel) => void
  onOpenSellerProfile?: (reel: DropReel) => void
}) {
  if (!cards.length) return null

  return (
    <div className="grid w-full grid-cols-2 gap-1.5 sm:gap-2">
      {cards.map((c, i) => (
        <div
          key={c.stream.id}
          className="relative w-full min-w-0 overflow-hidden rounded-lg bg-zinc-950 ring-[0.75px] ring-black/65 transition-[filter] active:brightness-[0.97]"
        >
          <div className="relative w-full shrink-0 overflow-hidden rounded-lg bg-zinc-800 pt-[152%]">
            <PortraitLiveTileLayers
              card={c}
              onSelect={onSelect ? () => onSelect(c.reel) : undefined}
              onOpenSellerProfile={onOpenSellerProfile}
            />
          </div>
          <span className="sr-only">
            Live stream {i + 1} of {cards.length}
          </span>
        </div>
      ))}
    </div>
  )
}

function VerticalLiveCarouselStrip({
  cards,
  onSelect,
  onOpenSellerProfile,
}: {
  cards: FeedCard[]
  onSelect?: (reel: DropReel) => void
  onOpenSellerProfile?: (reel: DropReel) => void
}) {
  if (!cards.length) return null

  return (
    <div
      className="-mx-3 pb-6 pt-1 sm:-mx-5"
      role="region"
      aria-roledescription="carousel"
      aria-label="Live shows going on now"
    >
      <div
        className={[
          'flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-2 pt-1 scroll-px-3 sm:gap-3 sm:px-5 sm:scroll-px-5',
          '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        ].join(' ')}
      >
        {cards.map((c, i) => (
          <div
            key={c.stream.id}
            className={[
              'relative shrink-0 snap-center overflow-hidden rounded-lg bg-zinc-950 ring-[0.75px] ring-black/65 transition-[filter] active:brightness-[0.97]',
              'w-[calc((100vw-2.5rem)/2.2)] sm:w-[calc((100vw-3.5rem)/2.2)]',
            ].join(' ')}
          >
            <div className="relative w-full shrink-0 overflow-hidden rounded-lg bg-zinc-800 pt-[152%]">
              <PortraitLiveTileLayers
                card={c}
                onSelect={onSelect ? () => onSelect(c.reel) : undefined}
                onOpenSellerProfile={onOpenSellerProfile}
              />
            </div>
            <span className="sr-only">
              Live stream {i + 1} of {cards.length}, {c.username}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function IconLiveFloorQuiet({ className }: { className?: string }) {
  return (
    <svg className={className} width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.35" className="text-violet-200" />
      <path
        d="M8.5 10.5c0-1.2 1-2.2 2.3-2.4.3 1.2 1.3 2.1 2.5 2.4M12 8.1V7M12 17v-1.1"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        className="text-violet-500"
      />
      <path
        d="M9.2 14.3h5.6a1.2 1.2 0 010 2.4H9.2a1.2 1.2 0 010-2.4z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        className="text-violet-400"
      />
    </svg>
  )
}

function LiveFeedEmptyOffline({
  onNotifyWhenLive,
  onGoLive,
  onWatchLive,
  onViewShop,
}: {
  onNotifyWhenLive?: () => void
  onGoLive?: () => void
  onWatchLive?: () => void
  onViewShop?: () => void
}) {
  return (
    <div
      role="status"
      className="mx-auto mt-8 flex w-full max-w-[22rem] flex-col items-center justify-center rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/90 via-white to-zinc-50/40 px-5 py-9 text-center shadow-sm shadow-violet-900/[0.04] sm:max-w-[24rem] sm:py-10"
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-violet-100">
        <IconLiveFloorQuiet />
      </div>
      <p className="text-[15px] font-bold tracking-tight text-zinc-900">No one is live right now</p>
      <p className="mt-2 text-[13px] leading-snug text-zinc-600">
        Start the first show or browse the live hub — your buyers are one tap away.
      </p>
      <div className="mt-5 flex w-full flex-col gap-2.5">
        {onWatchLive ? (
          <button
            type="button"
            onClick={() => onWatchLive()}
            className="w-full rounded-xl bg-violet-600 px-4 py-3 text-[14px] font-bold text-white shadow-md shadow-violet-600/25 transition-[filter] active:brightness-95"
          >
            Watch live
          </button>
        ) : null}
        {onNotifyWhenLive ? (
          <button
            type="button"
            onClick={() => onNotifyWhenLive()}
            className="w-full rounded-xl bg-violet-600 px-4 py-3 text-[14px] font-bold text-white shadow-md shadow-violet-600/25 transition-[filter] active:brightness-95"
          >
            Get notified when someone&apos;s live
          </button>
        ) : null}
        {onViewShop ? (
          <button
            type="button"
            onClick={() => onViewShop()}
            className="w-full rounded-xl border border-zinc-200/95 bg-white px-4 py-3 text-[14px] font-semibold text-zinc-900 shadow-sm shadow-zinc-900/[0.04] transition-colors active:bg-zinc-50"
          >
            View the shop
          </button>
        ) : null}
        {onGoLive ? (
          <button
            type="button"
            onClick={() => onGoLive()}
            className="w-full rounded-xl border border-violet-200/95 bg-white px-4 py-3 text-[14px] font-semibold text-violet-900 transition-[filter] active:bg-violet-50/80"
          >
            Be the first live
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FeedSkeletonTwoUp() {
  return (
    <div className="mt-1 grid w-full grid-cols-2 gap-1.5 sm:mt-2 sm:gap-2" aria-busy aria-label="Loading live feed">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={String(i)}
          className="relative overflow-hidden rounded-2xl bg-zinc-200/90 pt-[152%] animate-pulse"
        />
      ))}
    </div>
  )
}

function FeedSkeleton() {
  const showLocalMockChrome = isFetchAppLocalHostname()

  return (
    <div className="mt-3 w-full space-y-5 px-0" aria-busy aria-label="Loading live feed">
      {showLocalMockChrome ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={String(i)} className="h-9 w-[5.75rem] shrink-0 animate-pulse rounded-full bg-zinc-200/90" />
          ))}
        </div>
      ) : null}
      <div className="-mx-3 flex gap-2 px-3 sm:-mx-5 sm:px-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={String(i)} className="aspect-[220/336] flex-1 min-w-[32%] max-w-[40%] animate-pulse rounded-2xl bg-zinc-200/90 sm:min-w-0 sm:max-w-none" />
        ))}
      </div>
      <div className="space-y-6 pt-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={String(i)} className="flex gap-3">
            <div className="aspect-square w-[42%] animate-pulse rounded-2xl bg-zinc-200/90 sm:w-[44%]" />
            <div className="flex min-h-[7.5rem] flex-1 flex-col gap-2 pt-2">
              <div className="h-5 w-[55%] animate-pulse rounded-md bg-zinc-200/85" />
              <div className="h-4 w-[90%] animate-pulse rounded-md bg-zinc-200/80" />
              <div className="h-4 w-[70%] animate-pulse rounded-md bg-zinc-200/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CAROUSEL_MAX = 10

export type LiveAuctionFeedSectionProps = {
  liveReels: DropReel[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onOpenLiveStream?: (reel: DropReel) => void
  /** Opens alerts / inbox so viewers can enable live notifications. */
  onNotifyWhenLive?: () => void
  /** Seller go-live wizard. */
  onGoLive?: () => void
  /** Navigate to Fetchit realtime hub `/lives`. */
  onWatchLive?: () => void
  /** Browse static marketplace listings (shop). */
  onViewShop?: () => void
  /** 2-column portrait grid (no carousel or row list). */
  presentation?: 'default' | 'twoUpPortraitGrid'
  /** Resolved from {@link DropReel.authorId} — opens marketplace live in the home shell. */
  onOpenSellerProfile?: (reel: DropReel) => void
}

export const LiveAuctionFeedSection = memo(function LiveAuctionFeedSection({
  liveReels,
  loading,
  error,
  onRetry,
  onOpenLiveStream,
  onNotifyWhenLive,
  onGoLive,
  onWatchLive,
  onViewShop,
  presentation = 'default',
  onOpenSellerProfile,
}: LiveAuctionFeedSectionProps) {
  const [exploreCategory, setExploreCategory] = useState<ExploreLiveCategoryKey>('foryou')

  const filteredLiveReels = useMemo(
    () => filterDropReelsByExploreCategory(liveReels, exploreCategory),
    [liveReels, exploreCategory],
  )

  const cards = useMemo(() => {
    const out: FeedCard[] = []
    filteredLiveReels.forEach((reel, i) => {
      out.push(streamToFeedCard(reel, i))
    })
    return out
  }, [filteredLiveReels])

  const showCategoryEmpty =
    !loading && !error && liveReels.length > 0 && filteredLiveReels.length === 0

  const carouselCards = useMemo(() => cards.slice(0, Math.min(CAROUSEL_MAX, cards.length)), [cards])

  const blobUrlsRef = useRef<string[]>([])

  const [composerOpen, setComposerOpen] = useState(false)
  const [viewerVideoUrl, setViewerVideoUrl] = useState<string | null>(null)
  const [localStoryClips, setLocalStoryClips] = useState<PublishedExploreStory[]>([])

  blobUrlsRef.current = localStoryClips.map((c) => c.blobUrl)

  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  const exploreStoryItems = useMemo((): ExploreStoryItem[] => {
    const mine: ExploreStoryItem[] = localStoryClips.map((c) => ({
      id: `story-local-${c.id}`,
      label: localStoryLabel(c.overlayText),
      imageUrl: c.posterDataUrl,
      kind: 'mine',
      videoBlobUrl: c.blobUrl,
    }))
    return [...mine, ...buildFeedStoryRingItems(liveReels)]
  }, [liveReels, localStoryClips])

  const handleExploreStoryPress = (item: ExploreStoryItem): void => {
    if (item.kind === 'mine' && item.videoBlobUrl) {
      setViewerVideoUrl(item.videoBlobUrl)
      return
    }
    if (!item.reelId) return
    const reel = liveReels.find((r) => r.id === item.reelId)
    if (reel && dropReelIsLivestreamCapable(reel) && onOpenLiveStream) {
      onOpenLiveStream(reel)
    }
  }

  const handlePublishLocalStory = (clip: PublishedExploreStory): void => {
    setLocalStoryClips((prev) => [clip, ...prev].slice(0, 10))
  }

  const showSkeleton = loading && liveReels.length === 0
  const showEmpty =
    !loading && !error && liveReels.length === 0
  const showErrorOnly = Boolean(error && liveReels.length === 0 && !loading)
  const twoUpGrid = presentation === 'twoUpPortraitGrid'

  return (
    <section
      className={
        twoUpGrid
          ? 'mt-2 w-full min-w-0 px-0 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-0 sm:mt-3'
          : 'mt-5 w-full min-w-0 px-0 pb-6 pt-0'
      }
      aria-label="Live auctions from the feed"
    >
      {!showSkeleton ? (
        <>
          <ExploreStoriesRow
            leadSlot={<AddStoryCircle onRecordVideo={() => setComposerOpen(true)} />}
            items={exploreStoryItems}
            onSelect={handleExploreStoryPress}
          />
          <CategoryPillsRow activeKey={exploreCategory} onSelect={setExploreCategory} />
        </>
      ) : null}

      <ExploreStoryComposerModal
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onPublish={handlePublishLocalStory}
      />

      <ExploreStoryViewerModal
        open={Boolean(viewerVideoUrl)}
        videoUrl={viewerVideoUrl}
        onClose={() => setViewerVideoUrl(null)}
      />

      {showSkeleton ? twoUpGrid ? <FeedSkeletonTwoUp /> : <FeedSkeleton /> : null}

      {showErrorOnly ? (
        <div className="mt-6 rounded-2xl border border-zinc-200/90 bg-zinc-50/90 px-4 py-5 text-center sm:mx-0">
          <p className="text-[14px] font-semibold text-zinc-900">Live previews aren&apos;t showing yet</p>
          <p className="mt-1.5 text-[12px] leading-snug text-zinc-500">
            Streams will land here as soon as sellers go live. Turn on alerts and we&apos;ll let you know when someone starts.
          </p>
          <div className="mx-auto mt-4 flex w-full max-w-xs flex-col gap-2">
            <button
              type="button"
              className="w-full rounded-xl bg-violet-600 px-4 py-2.5 text-[14px] font-bold text-white shadow-md shadow-violet-600/25 transition-[filter] active:brightness-95"
              onClick={() => {
                if (onNotifyWhenLive) onNotifyWhenLive()
                else onRetry()
              }}
            >
              Get notified when someone&apos;s live
            </button>
            {onViewShop ? (
              <button
                type="button"
                className="w-full rounded-xl border border-zinc-200/95 bg-white px-4 py-2.5 text-[14px] font-semibold text-zinc-900 shadow-sm shadow-zinc-900/[0.04] transition-colors active:bg-zinc-50"
                onClick={() => onViewShop()}
              >
                View the shop
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showEmpty ? (
        <LiveFeedEmptyOffline
          onNotifyWhenLive={onNotifyWhenLive}
          onGoLive={onGoLive}
          onWatchLive={onWatchLive}
          onViewShop={onViewShop}
        />
      ) : null}

      {showCategoryEmpty ? (
        <div
          role="status"
          className="mx-auto mt-6 w-full max-w-[22rem] rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/90 to-white px-5 py-8 text-center shadow-sm shadow-violet-900/[0.04]"
        >
          <p className="text-[15px] font-bold text-zinc-900">Nothing live in this category</p>
          <p className="mt-1.5 text-[13px] leading-snug text-zinc-600">
            Try another tab above, or go back to For You for the full wall.
          </p>
          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 text-[14px] font-bold text-white shadow-md shadow-violet-600/25 transition-[filter] active:brightness-95"
            onClick={() => setExploreCategory('foryou')}
          >
            Show all live
          </button>
        </div>
      ) : null}

      {!showSkeleton && cards.length > 0 ? (
        twoUpGrid ? (
          <LivePortraitGrid
            cards={cards}
            onSelect={onOpenLiveStream}
            onOpenSellerProfile={onOpenSellerProfile}
          />
        ) : (
          <>
            <div className="border-b border-zinc-200/90 px-3 pb-5 sm:px-0">
              <VerticalLiveCarouselStrip
                cards={carouselCards}
                onSelect={onOpenLiveStream}
                onOpenSellerProfile={onOpenSellerProfile}
              />
            </div>

            <div className="flex flex-col divide-y divide-zinc-200/90">
              {cards.map((c, index) => (
                <LiveAuctionRowCard
                  key={c.stream.id}
                  card={c}
                  dividerClass={rowDividerPadding(index, cards.length)}
                  onPress={onOpenLiveStream ? () => onOpenLiveStream(c.reel) : undefined}
                  onOpenSellerProfile={
                    onOpenSellerProfile && c.reel.authorId?.trim()
                      ? () => onOpenSellerProfile(c.reel)
                      : undefined
                  }
                />
              ))}
            </div>
          </>
        )
      ) : null}
    </section>
  )
})

/** @deprecated Use `LiveAuctionFeedSection`. Kept for legacy imports. */
export const LiveAuctionFeedCardsMock = LiveAuctionFeedSection
