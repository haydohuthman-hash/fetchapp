/**
 * Upcoming auctions list with reminder bells. Tapping a card launches the
 * AuctionRoom in lobby mode.
 */

import { useState } from 'react'
import { AppHeader, AuctionRoom, CountdownTimer, EmptyState, LiveBadge } from '../../components/bidwars'
import {
  formatAud,
  toggleWatch,
  useIsWatching,
  useUpcomingAuctions,
} from '../../lib/data'
import type { Auction } from '../../lib/data'

type Props = {
  onBack: () => void
}

function groupByDay(auctions: Auction[]): Array<{ key: string; label: string; items: Auction[] }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const buckets = new Map<string, { key: string; label: string; items: Auction[] }>()
  for (const a of auctions) {
    const startDay = new Date(a.startsAt)
    startDay.setHours(0, 0, 0, 0)
    let label: string
    if (startDay.getTime() === today.getTime()) label = 'Today'
    else if (startDay.getTime() === tomorrow.getTime()) label = 'Tomorrow'
    else label = startDay.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
    const key = startDay.toISOString().slice(0, 10)
    if (!buckets.has(key)) buckets.set(key, { key, label, items: [] })
    buckets.get(key)!.items.push(a)
  }
  return Array.from(buckets.values())
}

export default function UpcomingAuctionsView({ onBack }: Props) {
  const upcoming = useUpcomingAuctions()
  const groups = groupByDay(upcoming)
  const [openAuctionId, setOpenAuctionId] = useState<string | null>(null)
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd]">
      <AppHeader title="Upcoming" subtitle="Set reminders for live drops" showBack onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
        {upcoming.length === 0 ? (
          <EmptyState
            icon="⏰"
            title="No upcoming auctions"
            body="Pop back later — new battles drop daily."
          />
        ) : (
          groups.map((g) => (
            <section key={g.key} className="flex flex-col gap-2">
              <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">
                {g.label}
              </p>
              {g.items.map((a) => (
                <UpcomingRow key={a.id} auction={a} onOpen={() => setOpenAuctionId(a.id)} />
              ))}
            </section>
          ))
        )}
      </main>
      <AuctionRoom
        open={openAuctionId != null}
        auctionId={openAuctionId}
        onClose={() => setOpenAuctionId(null)}
      />
    </div>
  )
}

function UpcomingRow({ auction, onOpen }: { auction: Auction; onOpen: () => void }) {
  const watching = useIsWatching(auction.id)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          <img src={auction.imageUrls[0]} alt="" className="h-full w-full object-cover" draggable={false} />
        </span>
        <span className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[13px] font-black tracking-tight text-zinc-950">
            {auction.title}
          </p>
          <p className="line-clamp-1 text-[11px] font-semibold text-zinc-500">
            Starts at {formatAud(auction.startingBidCents)} · Est. {formatAud(auction.estValueCents)}
          </p>
          <span className="mt-1 inline-flex items-center gap-1.5">
            <CountdownTimer endsAt={auction.startsAt} prefix="In" />
            <LiveBadge viewers={auction.viewerCount} size="sm" />
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => toggleWatch(auction.id)}
        aria-label={watching ? 'Reminder set' : 'Remind me'}
        className={[
          'grid h-10 w-10 shrink-0 place-items-center rounded-full ring-1 ring-zinc-200 transition-colors active:scale-95',
          watching ? 'bg-violet-100 text-[#4c1d95]' : 'bg-white text-zinc-700',
        ].join(' ')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={watching ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
      </button>
    </div>
  )
}
