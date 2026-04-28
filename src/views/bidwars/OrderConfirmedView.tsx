/**
 * Order Confirmed view — destination after winning an auction. Reads the most
 * recent order from the unified store; falls back gracefully when nothing is
 * available yet (e.g. user opens directly).
 */

import { AppHeader } from '../../components/bidwars'
import {
  formatAud,
  useAuction,
  useOrders,
  useShippingCreditCount,
} from '../../lib/data'

type Props = {
  onBack: () => void
  onContinue: () => void
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function OrderConfirmedView({ onBack, onContinue }: Props) {
  const orders = useOrders()
  const order = orders[0] ?? null
  const auction = useAuction(order?.auctionId)
  const shippingCreditsLeft = useShippingCreditCount()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd]">
      <AppHeader title="Order confirmed" showBack onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
        {order && auction ? (
          <>
            <section className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
              <span className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                <img src={auction.imageUrls[0]} alt="" className="h-full w-full object-cover" draggable={false} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">Paid</p>
                <p className="line-clamp-1 text-[16px] font-black tracking-tight text-zinc-950">
                  {auction.title}
                </p>
                <p className="text-[12px] font-semibold text-zinc-500">
                  {auction.subtitle ?? auction.category.replace(/-/g, ' ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[18px] font-black tabular-nums text-zinc-950">
                  {formatAud(order.paidCents)}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-600">
                  Saved {formatAud(order.savedCents)}
                </p>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                Shipping
              </p>
              <p className="mt-1 text-[14px] font-bold text-zinc-900">{order.shippingAddress}</p>
              {order.freeShippingApplied ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700 ring-1 ring-emerald-200">
                  <span aria-hidden>🚚</span>
                  Free shipping applied · Prize Spin
                </p>
              ) : shippingCreditsLeft > 0 ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-amber-700 ring-1 ring-amber-200">
                  <span aria-hidden>🚚</span>
                  {shippingCreditsLeft} shipping credit{shippingCreditsLeft === 1 ? '' : 's'} ready for next win
                </p>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-200">
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Status
                  </p>
                  <p className="mt-0.5 text-[13px] font-black text-zinc-900 capitalize">{order.status}</p>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                    Placed
                  </p>
                  <p className="mt-0.5 text-[13px] font-black text-zinc-900">
                    {formatDate(order.placedAt)}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                Payment
              </p>
              <p className="mt-1 text-[14px] font-bold text-zinc-900">
                Visa ··{order.paymentMethodLast4 ?? '4242'}
              </p>
              <p className="mt-1 text-[12.5px] font-medium text-zinc-500">
                Receipt sent to your email. You can view it in Activity later.
              </p>
            </section>

            <section className="rounded-3xl bg-violet-50 p-4 ring-1 ring-violet-200">
              <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#4c1d95]">
                Need help?
              </p>
              <p className="mt-1 text-[12.5px] font-semibold text-[#4c1d95]/80">
                Tap support in your profile and we&apos;ll respond within an hour.
              </p>
            </section>
          </>
        ) : (
          <section className="rounded-3xl bg-white p-6 text-center ring-1 ring-zinc-200">
            <p className="text-[15px] font-black text-zinc-900">No recent orders</p>
            <p className="mt-1 text-[12.5px] font-medium text-zinc-500">
              When you win an auction, your order details will appear here.
            </p>
          </section>
        )}

        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3.5 text-[14px] font-black uppercase tracking-[0.06em] text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/10 transition-transform active:scale-[0.985]"
          >
            Continue shopping
          </button>
        </div>
      </main>
    </div>
  )
}
