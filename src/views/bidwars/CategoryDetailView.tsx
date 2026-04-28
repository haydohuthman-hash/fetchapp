/**
 * Category detail — auctions filtered by category, with status filter chips
 * (All / Live / Upcoming / Ending soon) and a search input.
 */

import { useMemo, useState } from 'react'
import { AppHeader, AuctionCard, EmptyState } from '../../components/bidwars'
import { useAuctionsByCategory } from '../../lib/data'
import type { Category, Auction } from '../../lib/data'

type Props = {
  category: Category
  onBack: () => void
  onOpenAuction: (auction: Auction) => void
}

const FILTERS: Array<{ id: 'all' | 'live' | 'upcoming' | 'ending'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live now' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ending', label: 'Ending soon' },
]

export default function CategoryDetailView({ category, onBack, onOpenAuction }: Props) {
  const [filter, setFilter] = useState<typeof FILTERS[number]['id']>('all')
  const [query, setQuery] = useState('')
  const auctions = useAuctionsByCategory(category.id)
  const filtered = useMemo(() => {
    let next = auctions
    if (filter === 'live') next = next.filter((a) => a.status === 'live')
    if (filter === 'upcoming') next = next.filter((a) => a.status === 'upcoming')
    if (filter === 'ending') next = next.filter((a) => a.status === 'ending')
    const q = query.trim().toLowerCase()
    if (q) next = next.filter((a) => a.title.toLowerCase().includes(q))
    return next
  }, [auctions, filter, query])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd]">
      <AppHeader
        title={category.title}
        subtitle={`${category.liveCount} live · ${category.upcomingCount} upcoming`}
        showBack
        onBack={onBack}
      />
      <nav
        className="sticky top-[3.55rem] z-[4] flex shrink-0 gap-1 overflow-x-auto bg-[#f8f6fd]/95 px-2 pb-2 pt-1 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filter auctions"
      >
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.id)}
              className={[
                'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.06em] ring-1 transition-colors',
                active
                  ? 'bg-[#4c1d95] text-white ring-[#4c1d95]'
                  : 'bg-white text-zinc-600 ring-zinc-200',
              ].join(' ')}
            >
              {f.label}
            </button>
          )
        })}
      </nav>
      <main className="flex flex-1 flex-col gap-3 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-2">
        <label className="flex h-11 w-full items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-zinc-200 shadow-sm focus-within:ring-2 focus-within:ring-[#c4b5fd]">
          <svg className="h-4 w-4 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM16.5 16.5L21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${category.title.toLowerCase()}`}
            className="min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
            aria-label="Search"
          />
        </label>
        {filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Nothing matches yet"
            body="Adjust your filters or check back when more drops land."
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((a) => (
              <AuctionCard key={a.id} auction={a} onPress={onOpenAuction} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
