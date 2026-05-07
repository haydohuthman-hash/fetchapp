import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { WalletTransaction, WalletTxnKind } from '../lib/data'
import { formatAud, useWalletBalanceCents, useWalletTxns } from '../lib/data'
import { FETCH_APP_PATH, FETCH_WALLET_ADD_CREDITS_PATH } from '../lib/fetchRoutes'

export type FetchWalletTransactionsViewProps = {
  onBack: () => void
}

const KIND_CATEGORY: Record<WalletTxnKind, string> = {
  deposit: 'Deposit',
  withdraw: 'Withdrawal',
  'peer-send': 'Transfer out',
  'win-charge': 'Purchase',
  'win-refund': 'Refund',
  reward: 'Income',
  'gift-card': 'Gift card',
  'instant-cash': 'Instant transfer',
}

function localDayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function sectionHeading(dayKey: string): string {
  const [ys, ms, ds] = dayKey.split('-').map(Number)
  const day = new Date(ys!, ms! - 1, ds!)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startDay = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const diff = Math.round((startToday - startDay) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }
  if (day.getFullYear() !== now.getFullYear()) opts.year = 'numeric'
  return day.toLocaleDateString('en-AU', opts)
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

function groupTxns(txns: WalletTransaction[]): Array<{ dayKey: string; items: WalletTransaction[] }> {
  const map = new Map<string, WalletTransaction[]>()
  for (const t of txns) {
    const k = localDayKey(t.createdAt)
    const list = map.get(k) ?? []
    list.push(t)
    map.set(k, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.createdAt - a.createdAt)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dayKey, items]) => ({ dayKey, items }))
}

function ArrowInCircle({ incoming }: { incoming: boolean }) {
  return (
    <span
      className={[
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        incoming ? 'bg-emerald-500/15 text-emerald-700' : 'bg-zinc-200/80 text-zinc-600',
      ].join(' ')}
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        {incoming ? (
          <path
            d="M12 5v14M7 10l5-5 5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M12 19V5M7 14l5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  )
}

export default function FetchWalletTransactionsView({ onBack }: FetchWalletTransactionsViewProps) {
  const navigate = useNavigate()
  const balanceCents = useWalletBalanceCents()
  const txns = useWalletTxns()

  const groups = useMemo(() => groupTxns(txns), [txns])

  return (
    <div className="min-h-dvh bg-zinc-100 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))]">
      <header
        className="sticky top-0 z-10 border-b border-zinc-200/80 bg-zinc-100/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-[min(100%,430px)] items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-800 shadow-sm ring-1 ring-zinc-200/80 transition-transform active:scale-[0.97]"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold tracking-tight text-zinc-900">Transaction history</h1>
            <p className="text-[12px] text-zinc-500">
              Everyday wallet · {txns.length} {txns.length === 1 ? 'movement' : 'movements'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(FETCH_WALLET_ADD_CREDITS_PATH)}
            className="shrink-0 rounded-full bg-zinc-900 px-3 py-2 text-[12px] font-semibold text-white shadow-sm transition-colors active:bg-zinc-800"
          >
            Add
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[min(100%,430px)] px-4 pt-4">
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/80">
          <div className="border-b border-zinc-100 px-5 pb-5 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Available balance</p>
            <p className="mt-1.5 text-[2rem] font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-[2.25rem]">
              {formatAud(balanceCents)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-dashed border-zinc-100 pt-4 text-[12px] text-zinc-500">
              <span>
                BSB <span className="font-medium text-zinc-700">484-799</span>
              </span>
              <span aria-hidden className="text-zinc-300">
                ·
              </span>
              <span>
                Account{' '}
                <span className="font-medium text-zinc-700" style={{ letterSpacing: '0.06em' }}>
                  •••• 8821
                </span>
              </span>
            </div>
          </div>

          <div className="px-5 pb-5 pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigate(FETCH_APP_PATH)}
                className="flex-1 rounded-xl bg-zinc-50 py-3 text-[13px] font-semibold text-zinc-800 ring-1 ring-zinc-200/90 transition-colors active:bg-zinc-100"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigate(FETCH_WALLET_ADD_CREDITS_PATH)}
                className="flex-1 rounded-xl bg-zinc-50 py-3 text-[13px] font-semibold text-zinc-800 ring-1 ring-zinc-200/90 transition-colors active:bg-zinc-100"
              >
                Top up
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5" aria-label="Transaction history">
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-[14px] font-semibold text-zinc-900">All activity</h2>
            <p className="text-[11px] font-medium text-zinc-400">Newest first</p>
          </div>

          {txns.length === 0 ? (
            <div className="rounded-2xl bg-white px-5 py-10 text-center shadow-sm ring-1 ring-zinc-200/80">
              <p className="text-[15px] font-medium text-zinc-800">No activity yet</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                When you top up, get paid from a live sale, or make a purchase, it will appear here like a bank feed.
              </p>
              <button
                type="button"
                onClick={() => navigate(FETCH_WALLET_ADD_CREDITS_PATH)}
                className="mt-5 rounded-full bg-zinc-900 px-5 py-2.5 text-[13px] font-semibold text-white active:bg-zinc-800"
              >
                Add money
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map(({ dayKey, items }) => (
                <div key={dayKey}>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                    {sectionHeading(dayKey)}
                  </p>
                  <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/80">
                    {items.map((t, idx) => {
                      const credit = t.amountCents >= 0
                      const category = KIND_CATEGORY[t.kind]
                      return (
                        <li
                          key={t.id}
                          className={[
                            'flex gap-3 px-4 py-3.5',
                            idx < items.length - 1 ? 'border-b border-zinc-100' : '',
                          ].join(' ')}
                        >
                          <ArrowInCircle incoming={credit} />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[14px] font-medium leading-snug text-zinc-900">
                              {t.label}
                            </p>
                            <p className="mt-0.5 text-[12px] text-zinc-500">
                              {formatTime(t.createdAt)} · {category}
                            </p>
                            <p className="mt-1 text-[11px] tabular-nums text-zinc-400">
                              Balance {formatAud(t.balanceAfterCents)}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={[
                                'text-[14px] font-semibold tabular-nums',
                                credit ? 'text-emerald-600' : 'text-zinc-900',
                              ].join(' ')}
                            >
                              {credit ? '+' : ''}
                              {formatAud(t.amountCents)}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
