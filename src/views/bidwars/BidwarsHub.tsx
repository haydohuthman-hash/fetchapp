/**
 * BidwarsHub — a single self-contained surface that mounts every new Bid Wars
 * screen (Activity, Wallet, Rewards, Profile, Upcoming, Browse, Category
 * detail, Auction Room, Order Confirmed) with a small in-memory router.
 *
 * Existing app shell tabs and routes are untouched; this hub is opened as an
 * overlay (e.g. from the Activity bottom-nav tab or the Profile/account chip).
 */

import { useEffect, useState, type ReactNode } from 'react'
import { ambientRegisterBidWars } from '../../lib/audio/fetchAmbientMusic'
import { createPortal } from 'react-dom'
import { AuctionRoom } from '../../components/bidwars'
import type { Auction, Category } from '../../lib/data'
import ActivityView from './ActivityView'
import BidwarsProfileView from './BidwarsProfileView'
import BrowseView from './BrowseView'
import CategoryDetailView from './CategoryDetailView'
import OrderConfirmedView from './OrderConfirmedView'
import RewardsView from './RewardsView'
import UpcomingAuctionsView from './UpcomingAuctionsView'
import WalletView from './WalletView'

export type BidwarsHubView =
  | { kind: 'activity' }
  | { kind: 'wallet' }
  | { kind: 'rewards' }
  | { kind: 'profile' }
  | { kind: 'upcoming' }
  | { kind: 'browse' }
  | { kind: 'category'; category: Category }
  | { kind: 'order' }

type Props = {
  open: boolean
  initial: BidwarsHubView
  onClose: () => void
  onOpenChat?: () => void
  /** Same bottom nav as the home shell so Activity / hub profile keep the dock visible. */
  bottomNav?: ReactNode
}

export function BidwarsHub({ open, initial, onClose, onOpenChat, bottomNav }: Props) {
  const [stack, setStack] = useState<BidwarsHubView[]>([initial])
  const [openAuction, setOpenAuction] = useState<Auction | null>(null)
  const [postWin, setPostWin] = useState(false)

  useEffect(() => {
    const active = open && openAuction != null
    if (active) ambientRegisterBidWars(1)
    return () => {
      if (active) ambientRegisterBidWars(-1)
    }
  }, [open, openAuction])

  // Reset to initial when reopened.
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setStack([initial])
  }

  if (!open) return null
  if (typeof document === 'undefined') return null

  const top = stack[stack.length - 1]
  const goBack = () => {
    if (stack.length > 1) setStack((s) => s.slice(0, -1))
    else onClose()
  }
  const push = (v: BidwarsHubView) => setStack((s) => [...s, v])
  const reset = (v: BidwarsHubView) => setStack([v])

  const onOpenAuction = (a: Auction) => setOpenAuction(a)

  const onAuctionRoomClose = () => {
    setOpenAuction(null)
    if (postWin) {
      setPostWin(false)
      reset({ kind: 'order' })
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9970] flex flex-col bg-[#f8f6fd]"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {top.kind === 'activity' ? (
        <ActivityView
          onBack={goBack}
          onOpenAuction={(id) => {
            const a = (() => {
              return null as Auction | null
            })()
            void a
            // Activity row links into Auction Room via id; we'd resolve via
            // store lookup, but for the demo we just ignore — opening the
            // auction is best handled from cards. Could call useAuction(id).
            void id
          }}
          onOpenMessages={onOpenChat}
        />
      ) : null}
      {top.kind === 'wallet' ? <WalletView onBack={goBack} /> : null}
      {top.kind === 'rewards' ? (
        <RewardsView onBack={goBack} onInvite={() => undefined} />
      ) : null}
      {top.kind === 'profile' ? (
        <BidwarsProfileView
          onBack={goBack}
          onWatchlistOpen={(id) => {
            void id
          }}
          onOpenWallet={() => push({ kind: 'wallet' })}
          onOpenRewards={() => push({ kind: 'rewards' })}
          onInvite={() => undefined}
        />
      ) : null}
      {top.kind === 'upcoming' ? <UpcomingAuctionsView onBack={goBack} /> : null}
      {top.kind === 'browse' ? (
        <BrowseView
          onBack={goBack}
          onOpenCategory={(category) => push({ kind: 'category', category })}
        />
      ) : null}
      {top.kind === 'category' ? (
        <CategoryDetailView
          category={top.category}
          onBack={goBack}
          onOpenAuction={onOpenAuction}
        />
      ) : null}
      {top.kind === 'order' ? <OrderConfirmedView onBack={goBack} onContinue={onClose} /> : null}

      <AuctionRoom
        open={openAuction != null}
        auctionId={openAuction?.id ?? null}
        onClose={onAuctionRoomClose}
        onViewOrder={() => {
          setPostWin(true)
          setOpenAuction(null)
          reset({ kind: 'order' })
        }}
        onFindSimilar={() => {
          if (openAuction) push({ kind: 'category', category: openAuction.category as unknown as Category })
        }}
      />
      </div>
      {bottomNav ? (
        <div className="fetch-home-marketplace-shell-footer shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
          {bottomNav}
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
