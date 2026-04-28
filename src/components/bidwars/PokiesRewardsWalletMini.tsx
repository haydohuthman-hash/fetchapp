/**
 * Compact rewards-wallet strip surfaced in Activity, Profile, and any other
 * place we want a quick read of what the user has earned from Prize Spin.
 *
 * Reads from the unified store ([../../lib/data/store.ts](../../lib/data/store.ts))
 * so values stay in sync with bidding, checkout, listing, and pokies surfaces.
 * Time-based perks render as live countdowns and disappear when expired.
 */

import { useUserPerks, useNowEverySecond } from '../../lib/data'

function formatRemaining(expiresAt: number, now: number): string {
  const ms = expiresAt - now
  if (ms <= 0) return '—'
  const sec = Math.floor(ms / 1000)
  const hr = Math.floor(sec / 3600)
  const min = Math.floor((sec % 3600) / 60)
  if (hr >= 1) return `${hr}h ${min.toString().padStart(2, '0')}m`
  if (min >= 1) return `${min}m ${(sec % 60).toString().padStart(2, '0')}s`
  return `${sec}s`
}

export function PokiesRewardsWalletMini({ variant = 'light' }: { variant?: 'light' | 'purple' }) {
  const perks = useUserPerks()
  const now = useNowEverySecond()

  const vipLabel =
    perks.vipExpiresAt && perks.vipExpiresAt > now ? formatRemaining(perks.vipExpiresAt, now) : '—'
  const topLabel =
    perks.topBidderExpiresAt && perks.topBidderExpiresAt > now
      ? formatRemaining(perks.topBidderExpiresAt, now)
      : '—'
  const sellerLabel =
    perks.sellerBoostExpiresAt && perks.sellerBoostExpiresAt > now
      ? formatRemaining(perks.sellerBoostExpiresAt, now)
      : '—'

  const chips: Array<{ icon: string; label: string; value: string; live?: boolean }> = [
    { icon: '💎', label: 'Gems', value: `${perks.gemBalance}` },
    { icon: '🎟️', label: 'Spins', value: `${perks.freeSpins}` },
    { icon: '⚡', label: 'Boosts', value: `${perks.bidBoosts}` },
    { icon: '🚚', label: 'Ship', value: `${perks.shippingCredits}` },
    { icon: '👑', label: 'VIP', value: vipLabel, live: vipLabel !== '—' },
    { icon: '🏆', label: 'Top', value: topLabel, live: topLabel !== '—' },
    { icon: '📈', label: 'Seller', value: sellerLabel, live: sellerLabel !== '—' },
  ]

  const shell = variant === 'purple'
    ? 'bg-[#4c1d95] text-white ring-[#7c3aed]/40 shadow-[0_16px_34px_-22px_rgba(76,29,149,0.75)]'
    : 'bg-white text-zinc-950 ring-zinc-200 shadow-sm'
  const chip = variant === 'purple'
    ? 'bg-white/10 ring-white/12'
    : 'bg-violet-50 ring-violet-100'
  const liveChip = variant === 'purple'
    ? 'bg-amber-300/15 ring-amber-300/40'
    : 'bg-amber-50 ring-amber-200'
  const label = variant === 'purple' ? 'text-white/55' : 'text-zinc-500'

  return (
    <section className={['rounded-2xl p-2 ring-1', shell].join(' ')} aria-label="Rewards wallet">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] font-black uppercase tracking-[0.12em]">Rewards Wallet</p>
        <span className={['text-[9px] font-black uppercase tracking-[0.1em]', label].join(' ')}>
          Prize Spin
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {chips.map((c) => (
          <span
            key={c.label}
            className={[
              'flex min-w-0 flex-col items-center justify-center rounded-lg px-0.5 py-1 ring-1',
              c.live ? liveChip : chip,
            ].join(' ')}
            aria-label={`${c.label} ${c.value}`}
          >
            <span className="text-[13px] leading-none" aria-hidden>{c.icon}</span>
            <span className="mt-0.5 text-[10.5px] font-black tabular-nums leading-none">{c.value}</span>
            <span className={['text-[7px] font-bold uppercase leading-none tracking-[0.05em]', label].join(' ')}>
              {c.label}
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}
