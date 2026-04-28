/**
 * Activity log — tabs (All / Bids / Wins / Outbids / Messages) reading from the
 * unified store. Messages tab is a stub that points the user to the chat hub.
 */

import { useState } from 'react'
import { AppHeader, EmptyState } from '../../components/bidwars'
import { PokiesRewardsWalletMini } from '../../components/bidwars/PokiesRewardsWalletMini'
import { useActivity } from '../../lib/data'
import type { ActivityKind } from '../../lib/data'

type Props = {
  onBack: () => void
  onOpenAuction?: (auctionId: string) => void
  onOpenMessages?: () => void
}

const TABS: Array<{ id: 'all' | 'bid' | 'win' | 'outbid' | 'message'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'bid', label: 'Bids' },
  { id: 'win', label: 'Wins' },
  { id: 'outbid', label: 'Outbids' },
  { id: 'message', label: 'Messages' },
]

const KIND_ICON: Record<ActivityKind, string> = {
  bid: '⚡',
  win: '🏆',
  outbid: '🔥',
  message: '💬',
  reminder: '⏰',
}

const KIND_TONE: Record<ActivityKind, string> = {
  bid: 'bg-violet-100 text-[#4c1d95]',
  win: 'bg-emerald-100 text-emerald-700',
  outbid: 'bg-rose-100 text-rose-700',
  message: 'bg-amber-100 text-amber-700',
  reminder: 'bg-zinc-100 text-zinc-700',
}

function relTime(ms: number): string {
  const diff = Date.now() - ms
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export default function ActivityView({ onBack, onOpenAuction, onOpenMessages }: Props) {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('all')
  const all = useActivity()
  const filtered =
    tab === 'all'
      ? all
      : tab === 'message'
        ? []
        : all.filter((entry) => entry.kind === tab || (tab === 'bid' && entry.kind === 'reminder' && false))
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd]">
      <AppHeader title="Activity" subtitle="Your bidding history" showBack onBack={onBack} />
      <nav
        className="sticky top-[3.55rem] z-[4] flex shrink-0 gap-1 overflow-x-auto bg-[#f8f6fd]/95 px-2 pb-2 pt-1 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Activity filters"
      >
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={[
                'shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.06em] ring-1 transition-colors',
                active
                  ? 'bg-[#4c1d95] text-white ring-[#4c1d95]'
                  : 'bg-white text-zinc-600 ring-zinc-200 hover:text-zinc-900',
              ].join(' ')}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      <main className="flex flex-1 flex-col gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-2">
        <PokiesRewardsWalletMini />

        {tab === 'message' ? (
          <EmptyState
            icon="💬"
            title="Messages live in chat"
            body="We rolled messages into the chat hub so threads stay together."
            ctaLabel="Open chat"
            onPress={() => onOpenMessages?.()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🚀"
            title="Nothing to show yet"
            body="Place a bid or watch an auction and it&#39;ll show up here."
          />
        ) : (
          filtered.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => entry.ref?.kind === 'auction' && onOpenAuction?.(entry.ref.auctionId)}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-zinc-200 transition-transform active:scale-[0.99]"
            >
              <span className={['grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl', KIND_TONE[entry.kind]].join(' ')}>
                {KIND_ICON[entry.kind]}
              </span>
              <span className="min-w-0 flex-1">
                <p className="line-clamp-1 text-[13px] font-black tracking-tight text-zinc-950">
                  {entry.title}
                </p>
                <p className="line-clamp-1 text-[11.5px] font-semibold text-zinc-500">{entry.body}</p>
              </span>
              <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-400">
                {relTime(entry.createdAt)}
              </span>
            </button>
          ))
        )}
      </main>
    </div>
  )
}
