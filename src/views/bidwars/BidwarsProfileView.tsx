/**
 * Bid Wars profile — stats, watchlist, addresses, payment, support, invite. Sits
 * alongside the existing FetchProfilePage so we don't disrupt that flow; this is
 * the entry from the Bid Wars surfaces.
 */

import { AppHeader, AuctionCard, EmptyState } from '../../components/bidwars'
import { PokiesRewardsWalletMini } from '../../components/bidwars/PokiesRewardsWalletMini'
import {
  formatAud,
  useAuctions,
  useBidwarsUser,
  useWatchlist,
} from '../../lib/data'
import type { Auction } from '../../lib/data'

type Props = {
  onBack: () => void
  onWatchlistOpen?: (auctionId: string) => void
  onOpenWallet: () => void
  onOpenRewards: () => void
  onInvite?: () => void
}

export default function BidwarsProfileView({
  onBack,
  onWatchlistOpen,
  onOpenWallet,
  onOpenRewards,
  onInvite,
}: Props) {
  const user = useBidwarsUser()
  const auctions = useAuctions()
  const watchlist = useWatchlist()
  const watchlistAuctions = watchlist
    .map((id) => auctions.find((a) => a.id === id))
    .filter((a): a is Auction => Boolean(a))

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd]">
      <AppHeader title="Profile" showBack onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center gap-3">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-violet-100 ring-2 ring-violet-200">
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[18px] font-black tracking-tight text-zinc-950">{user.displayName}</p>
              <p className="text-[12px] font-bold text-zinc-500">{user.handle}</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-violet-100 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-[#4c1d95]"
            >
              Edit
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat label="Battles won" value={user.battlesWon.toString()} />
            <Stat label="Total won" value={formatAud(user.totalWonCents)} />
            <Stat label="Win rate" value={`${Math.round(user.winRate * 100)}%`} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenWallet}
            className="flex flex-col items-start gap-1 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-zinc-200 transition-transform active:scale-[0.98]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-[18px] font-black text-[#4c1d95]">
              💼
            </span>
            <span className="text-[12.5px] font-black tracking-tight text-zinc-950">Wallet</span>
            <span className="text-[10.5px] font-bold text-zinc-500">Funds, withdrawals & gifts</span>
          </button>
          <button
            type="button"
            onClick={onOpenRewards}
            className="flex flex-col items-start gap-1 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-zinc-200 transition-transform active:scale-[0.98]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-[18px] font-black text-amber-700">
              🏅
            </span>
            <span className="text-[12.5px] font-black tracking-tight text-zinc-950">Rewards</span>
            <span className="text-[10.5px] font-bold text-zinc-500">XP, streaks & perks</span>
          </button>
        </section>

        <PokiesRewardsWalletMini />

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <p className="text-[12px] font-black uppercase tracking-[0.14em] text-zinc-500">Watchlist</p>
          {watchlistAuctions.length === 0 ? (
            <EmptyState icon="❤️" title="Nothing watched yet" body="Tap the heart on a card to watch it." />
          ) : (
            <div className="-mx-2 mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {watchlistAuctions.map((a) => (
                <span key={a.id} className="w-[10rem] shrink-0">
                  <AuctionCard auction={a} onPress={() => onWatchlistOpen?.(a.id)} />
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-zinc-200">
          <ProfileRow icon="📍" title="Shipping address" value="12 Adelaide St, Brisbane QLD" />
          <ProfileRow icon="💳" title="Payment methods" value="Visa ··4242" />
          <ProfileRow icon="🔔" title="Notifications" value="Pushes on" />
          <ProfileRow icon="🛟" title="Help center" value="Chat with support" />
          <ProfileRow icon="🤝" title="Invite friends" value="$15 each, both ways" onPress={onInvite} />
        </section>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-3 text-center ring-1 ring-zinc-200">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className="mt-0.5 text-[14px] font-black tabular-nums text-zinc-950">{value}</p>
    </div>
  )
}

function ProfileRow({
  icon,
  title,
  value,
  onPress,
}: {
  icon: string
  title: string
  value: string
  onPress?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-center gap-3 border-b border-zinc-100 px-2 py-3 text-left last:border-0"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100 text-[18px]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-black tracking-tight text-zinc-950">{title}</p>
        <p className="line-clamp-1 text-[11px] font-semibold text-zinc-500">{value}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-zinc-300">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
