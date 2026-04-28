import { useEffect, useState } from 'react'

type RewardsWallet = {
  freeSpins: number
  bidBoosts: number
  shippingCredits: number
  sellerBoostMinutes: number
  vipMinutes: number
  topBidderMinutes: number
  mysteryPending: number
  jackpotsHit: number
}

const STORE_KEY = 'fetchit.pokies.state.v1'

const DEFAULT_WALLET: RewardsWallet = {
  freeSpins: 0,
  bidBoosts: 0,
  shippingCredits: 0,
  sellerBoostMinutes: 0,
  vipMinutes: 0,
  topBidderMinutes: 0,
  mysteryPending: 0,
  jackpotsHit: 0,
}

function loadWallet(): RewardsWallet {
  if (typeof window === 'undefined') return DEFAULT_WALLET
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return DEFAULT_WALLET
    const parsed = JSON.parse(raw) as { wallet?: Partial<RewardsWallet> }
    return { ...DEFAULT_WALLET, ...(parsed.wallet ?? {}) }
  } catch {
    return DEFAULT_WALLET
  }
}

export function PokiesRewardsWalletMini({ variant = 'light' }: { variant?: 'light' | 'purple' }) {
  const [wallet, setWallet] = useState<RewardsWallet>(() => loadWallet())

  useEffect(() => {
    const refresh = () => setWallet(loadWallet())
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const chips: Array<{ icon: string; label: string; value: string }> = [
    { icon: '🎟️', label: 'Spins', value: `${wallet.freeSpins}` },
    { icon: '⚡', label: 'Boosts', value: `${wallet.bidBoosts}` },
    { icon: '🚚', label: 'Ship', value: `${wallet.shippingCredits}` },
    { icon: '📈', label: 'Seller', value: wallet.sellerBoostMinutes > 0 ? `${wallet.sellerBoostMinutes}m` : '—' },
    { icon: '👑', label: 'VIP', value: wallet.vipMinutes > 0 ? `${Math.floor(wallet.vipMinutes / 60)}h` : '—' },
    { icon: '🏆', label: 'Top', value: wallet.topBidderMinutes > 0 ? `${Math.floor(wallet.topBidderMinutes / 60)}h` : '—' },
  ]

  const shell = variant === 'purple'
    ? 'bg-[#4c1d95] text-white ring-[#7c3aed]/40 shadow-[0_16px_34px_-22px_rgba(76,29,149,0.75)]'
    : 'bg-white text-zinc-950 ring-zinc-200 shadow-sm'
  const chip = variant === 'purple'
    ? 'bg-white/10 ring-white/12'
    : 'bg-violet-50 ring-violet-100'
  const label = variant === 'purple' ? 'text-white/55' : 'text-zinc-500'

  return (
    <section className={['rounded-2xl p-2 ring-1', shell].join(' ')} aria-label="Rewards wallet">
      <div className="flex items-center justify-between px-0.5">
        <p className="text-[11px] font-black uppercase tracking-[0.12em]">Rewards Wallet</p>
        <span className={['text-[9px] font-black uppercase tracking-[0.1em]', label].join(' ')}>
          Prize Spin
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-6 gap-1">
        {chips.map((c) => (
          <span
            key={c.label}
            className={['flex min-w-0 flex-col items-center justify-center rounded-lg px-0.5 py-1 ring-1', chip].join(' ')}
            aria-label={`${c.label} ${c.value}`}
          >
            <span className="text-[13px] leading-none" aria-hidden>{c.icon}</span>
            <span className="mt-0.5 text-[11px] font-black tabular-nums leading-none">{c.value}</span>
            <span className={['text-[7px] font-bold uppercase leading-none tracking-[0.05em]', label].join(' ')}>
              {c.label}
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}
