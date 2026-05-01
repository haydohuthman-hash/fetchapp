/**
 * Fetchit Mystery Flip — Duolingo-inspired risk/reward card flip game.
 *
 * No real money. Rewards are in-app gifts (gems, bid tokens, coins, energy boosts).
 * Hit a bomb and you lose all unclaimed gifts on the current floor; cash out to
 * keep them and start fresh on the next floor.
 *
 * Persistence:
 *  - Cashed-out gems sync to `fetch.home.demoGems.v1` so the home gem chip
 *    reflects the new balance.
 *  - Best streak is stored under `fetch.home.mysteryFlip.v1`. When wiring
 *    real backend later, swap `loadGameState` / `saveGameState` for an API.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import gemIconUrl from '../../assets/pokies-icons/gem.png'
import coinIconUrl from '../../assets/pokies-icons/coins.png'
import mascotUrl from '../../assets/pokies-mascot-peek.png'
import { playUiFeedback } from '../../voice/fetchFeedback'

const DEMO_GEMS_STORAGE_KEY = 'fetch.home.demoGems.v1'
const MYSTERY_FLIP_STORAGE_KEY = 'fetch.home.mysteryFlip.v1'

const FLIPS_TO_NEXT_FLOOR = 5

type RewardKind = 'gems' | 'bid' | 'coins' | 'energy'

type RewardSpec = {
  kind: RewardKind
  amount: number
}

type Card =
  | { id: string; revealed: false; bomb: false; reward: RewardSpec }
  | { id: string; revealed: true; bomb: false; reward: RewardSpec }
  | { id: string; revealed: false; bomb: true }
  | { id: string; revealed: true; bomb: true }

type GiftBag = {
  gems: number
  bid: number
  coins: number
  energy: number
}

type RiskTier = 'low' | 'medium' | 'high' | 'extreme'

type FloorConfig = {
  bombs: number
  rewardMultiplier: number
  riskTier: RiskTier
  riskCopy: string
  riskAccent: string
}

const EMPTY_BAG: GiftBag = { gems: 0, bid: 0, coins: 0, energy: 0 }

function floorConfig(floor: number): FloorConfig {
  if (floor >= 10) {
    return {
      bombs: 3,
      rewardMultiplier: 2.4,
      riskTier: 'extreme',
      riskCopy: 'Extreme rewards. Extreme danger.',
      riskAccent: '#dc2626',
    }
  }
  if (floor >= 6) {
    return {
      bombs: floor >= 8 ? 3 : 2,
      rewardMultiplier: 1.8,
      riskTier: 'high',
      riskCopy: 'Big gifts, watch your step!',
      riskAccent: '#ea580c',
    }
  }
  if (floor >= 3) {
    return {
      bombs: floor >= 4 ? 2 : 1,
      rewardMultiplier: 1.4,
      riskTier: 'medium',
      riskCopy: 'Better rewards, more bombs!',
      riskAccent: '#7c3aed',
    }
  }
  return {
    bombs: 1,
    rewardMultiplier: 1,
    riskTier: 'low',
    riskCopy: 'Warm up. Grab some easy gifts.',
    riskAccent: '#16a34a',
  }
}

function loadHomeGems(): number {
  try {
    const raw = window.localStorage.getItem(DEMO_GEMS_STORAGE_KEY)
    const n = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(n) ? Math.max(0, n) : 0
  } catch {
    return 0
  }
}

function saveHomeGems(next: number) {
  try {
    window.localStorage.setItem(DEMO_GEMS_STORAGE_KEY, String(Math.max(0, next)))
  } catch {
    /* ignore */
  }
}

type StoredGameState = {
  bestStreak: number
  totalClaimed: GiftBag
}

function loadGameState(): StoredGameState {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(MYSTERY_FLIP_STORAGE_KEY) || 'null',
    ) as Partial<StoredGameState> | null
    return {
      bestStreak: Math.max(0, Number(parsed?.bestStreak) || 0),
      totalClaimed: {
        gems: Math.max(0, Number(parsed?.totalClaimed?.gems) || 0),
        bid: Math.max(0, Number(parsed?.totalClaimed?.bid) || 0),
        coins: Math.max(0, Number(parsed?.totalClaimed?.coins) || 0),
        energy: Math.max(0, Number(parsed?.totalClaimed?.energy) || 0),
      },
    }
  } catch {
    return { bestStreak: 0, totalClaimed: { ...EMPTY_BAG } }
  }
}

function saveGameState(state: StoredGameState) {
  try {
    window.localStorage.setItem(MYSTERY_FLIP_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

/** Fisher-Yates shuffle. */
function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickReward(multiplier: number): RewardSpec {
  const roll = Math.random()
  if (roll < 0.45) {
    const base = 50 + Math.floor(Math.random() * 6) * 10
    return { kind: 'gems', amount: Math.round(base * multiplier) }
  }
  if (roll < 0.7) {
    const base = 50 + Math.floor(Math.random() * 6) * 25
    return { kind: 'coins', amount: Math.round(base * multiplier) }
  }
  if (roll < 0.88) {
    const base = 1 + Math.floor(Math.random() * 2)
    return { kind: 'bid', amount: Math.max(1, Math.round(base * multiplier)) }
  }
  return { kind: 'energy', amount: 1 }
}

function buildGrid(floor: number): Card[] {
  const cfg = floorConfig(floor)
  const total = 9
  const bombCount = Math.min(cfg.bombs, total - 2)
  const rewardCount = total - bombCount
  const cards: Card[] = []
  for (let i = 0; i < bombCount; i++) {
    cards.push({ id: `bomb-${i}`, revealed: false, bomb: true })
  }
  for (let i = 0; i < rewardCount; i++) {
    cards.push({
      id: `reward-${i}`,
      revealed: false,
      bomb: false,
      reward: pickReward(cfg.rewardMultiplier),
    })
  }
  return shuffle(cards)
}

function rewardLabel(r: RewardSpec): string {
  switch (r.kind) {
    case 'gems':
      return `${r.amount} GEMS`
    case 'coins':
      return `${r.amount} COINS`
    case 'bid':
      return `${r.amount} BID`
    case 'energy':
      return `${r.amount} ENERGY`
  }
}

function bagGemValue(b: GiftBag): number {
  return (
    b.gems +
    Math.round(b.coins * 0.4) +
    b.bid * 60 +
    b.energy * 30
  )
}

function addReward(b: GiftBag, r: RewardSpec): GiftBag {
  switch (r.kind) {
    case 'gems':
      return { ...b, gems: b.gems + r.amount }
    case 'coins':
      return { ...b, coins: b.coins + r.amount }
    case 'bid':
      return { ...b, bid: b.bid + r.amount }
    case 'energy':
      return { ...b, energy: b.energy + r.amount }
  }
}

function bagsAdd(a: GiftBag, b: GiftBag): GiftBag {
  return {
    gems: a.gems + b.gems,
    bid: a.bid + b.bid,
    coins: a.coins + b.coins,
    energy: a.energy + b.energy,
  }
}

/* ─────────────────────────── Icon helpers ─────────────────────────── */

function GemIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src={gemIconUrl}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className="select-none object-contain"
      style={{ width: size, height: size }}
    />
  )
}

function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src={coinIconUrl}
      alt=""
      width={size}
      height={size}
      draggable={false}
      className="select-none object-contain"
      style={{ width: size, height: size }}
    />
  )
}

function BoltIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="#facc15" stroke="#a16207" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function TicketIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M14 6v12" stroke="#15803d" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  )
}

function BombIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <circle cx="11" cy="14" r="7" fill="#1c1340" />
      <path d="M15 7l3-3M16 5l3-1-1 3" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="12.5" r="1.4" fill="#fff" opacity="0.55" />
    </svg>
  )
}

function PawIcon({ className = '', color = '#7c3aed' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <ellipse cx="16" cy="22" rx="6.5" ry="6" fill={color} />
      <ellipse cx="9" cy="13" rx="2.6" ry="3.4" fill={color} />
      <ellipse cx="23" cy="13" rx="2.6" ry="3.4" fill={color} />
      <ellipse cx="13" cy="8" rx="2.4" ry="3.2" fill={color} />
      <ellipse cx="19" cy="8" rx="2.4" ry="3.2" fill={color} />
    </svg>
  )
}

function ChestIcon({ open: chestOpen = false, className = '' }: { open?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <rect x="4" y="14" width="24" height="14" rx="2" fill="#7c3aed" stroke="#4c1d95" strokeWidth="1.5" />
      <path
        d={chestOpen ? 'M4 14c0-6 24-6 24 0v-4H4v4Z' : 'M4 14c0-6 24-6 24 0v2H4v-2Z'}
        fill="#a78bfa"
        stroke="#4c1d95"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="14" y="14" width="4" height="6" rx="1" fill="#facc15" stroke="#a16207" strokeWidth="1" />
    </svg>
  )
}

/* ─────────────────────────── Sub-components ─────────────────────────── */

const GameTopNav = memo(function GameTopNav({
  gemBalance,
  onClose,
  onAddGems,
}: {
  gemBalance: number
  onClose: () => void
  onAddGems: () => void
}) {
  return (
    <header className="sticky top-0 z-[5] border-b border-violet-100 bg-white/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex max-w-md items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Mystery Flip"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#1c1340] active:bg-violet-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <span className="select-none text-[16px] font-black tracking-[-0.04em] text-[#1c1340]">
          Fetch<span className="text-[#7c3aed]">it</span>
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 ring-1 ring-violet-200">
            <GemIcon size={14} />
            <span className="text-[12px] font-black tabular-nums text-[#1c1340]">{gemBalance}</span>
            <button
              type="button"
              onClick={onAddGems}
              aria-label="Add gems"
              className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#7c3aed] text-white active:bg-[#6d28d9]"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-[#1c1340] active:bg-violet-100"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 10a6 6 0 1 0-12 0c0 7-2.5 7-2.5 8h17S18 17 18 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M9.5 20a2.8 2.8 0 0 0 5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#ef4444] ring-2 ring-white" />
          </button>
        </div>
      </div>
    </header>
  )
})

const GameHero = memo(function GameHero() {
  return (
    <section className="relative mx-auto mt-3 max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-violet-50 via-white to-violet-100/60 px-4 pb-3 pt-4 ring-1 ring-violet-100">
      <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden>
        <PawIcon className="absolute -left-2 top-3 h-8 w-8 opacity-25" color="#c4b5fd" />
        <PawIcon className="absolute right-10 -top-1 h-6 w-6 rotate-12 opacity-25" color="#c4b5fd" />
        <PawIcon className="absolute bottom-3 left-1/3 h-5 w-5 -rotate-12 opacity-20" color="#c4b5fd" />
        <span className="absolute right-4 bottom-4 h-2 w-2 rounded-full bg-violet-300/60" />
        <span className="absolute right-12 top-6 h-1.5 w-1.5 rounded-full bg-violet-300/60" />
      </div>

      <div className="relative flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7c3aed]">Mini game</p>
          <h1 className="mt-0.5 text-[26px] font-black leading-[0.95] tracking-[-0.05em] text-[#1c1340]">
            MYSTERY FLIP
          </h1>
          <p className="mt-1 text-[12.5px] font-bold leading-snug text-[#3b2f5e]">
            Flip cards. Grab gifts.{' '}
            <span className="text-[#dc2626]">Avoid bombs.</span>
          </p>
        </div>
        <img
          src={mascotUrl}
          alt=""
          className="fetch-mflip-mascot pointer-events-none h-[88px] w-[88px] shrink-0 select-none object-contain"
          draggable={false}
        />
      </div>
    </section>
  )
})

function RiskPanel({
  floor,
  safeFlips,
  cfg,
}: {
  floor: number
  safeFlips: number
  cfg: FloorConfig
}) {
  const pct = Math.min(100, Math.round((safeFlips / FLIPS_TO_NEXT_FLOOR) * 100))
  const unlocked = safeFlips >= FLIPS_TO_NEXT_FLOOR
  return (
    <section
      className="mx-auto mt-3 max-w-md rounded-2xl bg-white p-3 ring-1 ring-violet-100 shadow-[0_10px_24px_-22px_rgba(28,19,64,0.45)]"
      aria-label="Floor and risk"
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white"
          aria-label={`Floor ${floor}`}
        >
          <span className="text-[8px] font-black uppercase leading-none tracking-[0.14em] opacity-80">Floor</span>
          <span className="text-[18px] font-black leading-none">{floor}</span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: cfg.riskAccent }}>
              Risk level: {cfg.riskTier}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[12px] font-bold text-[#3b2f5e]">{cfg.riskCopy}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-violet-100">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="shrink-0 text-[10px] font-black tabular-nums text-[#1c1340]">
              {Math.min(safeFlips, FLIPS_TO_NEXT_FLOOR)} / {FLIPS_TO_NEXT_FLOOR} safe flips
            </p>
          </div>
        </div>
        <ChestIcon open={unlocked} className={['h-12 w-12 shrink-0', unlocked ? 'fetch-mflip-chest-pop' : ''].join(' ')} />
      </div>
    </section>
  )
}

type CardState = 'hidden' | 'revealedReward' | 'revealedBomb' | 'disabled'

function FlipCard({
  card,
  index,
  state,
  flipKey,
  onFlip,
}: {
  card: Card
  index: number
  state: CardState
  flipKey: number
  onFlip: (idx: number) => void
}) {
  const isRevealed = card.revealed
  const isBomb = card.bomb
  const isHidden = state === 'hidden'
  const isDisabled = state === 'disabled' && !isRevealed
  const cardLabel = isRevealed
    ? isBomb
      ? 'Bomb! Game over.'
      : `Revealed ${rewardLabel(card.reward)}`
    : 'Hidden mystery card'

  return (
    <button
      type="button"
      disabled={!isHidden}
      onClick={() => onFlip(index)}
      aria-label={cardLabel}
      data-revealed={isRevealed ? 'true' : 'false'}
      data-bomb={isBomb ? 'true' : 'false'}
      data-flip-key={flipKey}
      className={[
        'fetch-mflip-card group relative aspect-square w-full select-none [perspective:900px]',
        isHidden ? '' : 'fetch-mflip-card--flipped',
        isDisabled ? 'opacity-55 grayscale' : '',
        isBomb && isRevealed ? 'fetch-mflip-card--bomb' : '',
        !isBomb && isRevealed ? 'fetch-mflip-card--reward' : '',
      ].join(' ')}
    >
      <span className="fetch-mflip-card-inner">
        {/* BACK */}
        <span className="fetch-mflip-card-face fetch-mflip-card-back">
          <span className="absolute inset-1 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] shadow-[inset_0_-3px_0_rgba(0,0,0,0.18),0_8px_18px_-12px_rgba(124,58,237,0.6)]" />
          <span className="absolute inset-1 rounded-2xl ring-1 ring-white/35" />
          <PawIcon className="relative h-10 w-10 opacity-70" color="#ede9fe" />
          <span className="pointer-events-none absolute -top-px left-1/2 h-3 w-12 -translate-x-1/2 rounded-b-full bg-white/30" />
        </span>
        {/* FRONT */}
        <span
          className={[
            'fetch-mflip-card-face fetch-mflip-card-front',
            isBomb
              ? 'bg-gradient-to-b from-[#fff1f2] to-[#fee2e2] ring-2 ring-[#fca5a5]'
              : 'bg-white ring-1 ring-violet-100',
          ].join(' ')}
        >
          {isBomb ? (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1">
              <BombIcon className="fetch-mflip-bomb h-10 w-10" />
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#dc2626]">Bomb</span>
            </span>
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-1">
              <RewardArt reward={card.reward} />
              <span className="text-center text-[11px] font-black leading-none tracking-[-0.02em] text-[#1c1340]">
                {rewardLabel(card.reward)}
              </span>
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

function RewardArt({ reward }: { reward: RewardSpec }) {
  switch (reward.kind) {
    case 'gems':
      return <GemIcon size={36} />
    case 'coins':
      return <CoinIcon size={36} />
    case 'bid':
      return <TicketIcon className="h-9 w-9" />
    case 'energy':
      return <BoltIcon className="h-9 w-9" />
  }
}

function CardGrid({
  grid,
  gameOver,
  onFlip,
  flipKeys,
}: {
  grid: Card[]
  gameOver: boolean
  onFlip: (idx: number) => void
  flipKeys: number[]
}) {
  return (
    <section className="mx-auto mt-3 max-w-md rounded-3xl bg-white p-3 ring-1 ring-violet-100" aria-label="Mystery card grid">
      <div className="grid grid-cols-3 gap-2.5">
        {grid.map((card, idx) => {
          const state: CardState = card.revealed
            ? card.bomb
              ? 'revealedBomb'
              : 'revealedReward'
            : gameOver
              ? 'disabled'
              : 'hidden'
          return (
            <FlipCard
              key={card.id}
              card={card}
              index={idx}
              state={state}
              flipKey={flipKeys[idx] ?? 0}
              onFlip={onFlip}
            />
          )
        })}
      </div>
    </section>
  )
}

function GiftsPanel({
  unclaimed,
  totalValue,
  highlight,
}: {
  unclaimed: GiftBag
  totalValue: number
  highlight: boolean
}) {
  return (
    <section
      className={[
        'mx-auto mt-3 max-w-md rounded-2xl bg-white p-3 ring-1 ring-violet-100 transition',
        highlight ? 'fetch-mflip-gifts-pop' : '',
      ].join(' ')}
      aria-label="Your unclaimed gifts"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7c3aed]">Your gifts</p>
        <div className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 ring-1 ring-violet-100">
          <span className="text-[9px] font-black uppercase tracking-[0.12em] text-[#3b2f5e]">Total value</span>
          <GemIcon size={12} />
          <span className="text-[11px] font-black tabular-nums text-[#1c1340]">{totalValue}</span>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <GiftStat icon={<GemIcon size={18} />} label="Gems" value={unclaimed.gems} accent="#7c3aed" />
        <GiftStat icon={<TicketIcon className="h-4 w-4" />} label="Bid" value={unclaimed.bid} accent="#16a34a" />
        <GiftStat icon={<CoinIcon size={18} />} label="Coins" value={unclaimed.coins} accent="#d97706" />
        <GiftStat icon={<BoltIcon className="h-4 w-4" />} label="Energy" value={unclaimed.energy} accent="#ca8a04" />
      </div>
    </section>
  )
}

function GiftStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-violet-50/70 px-1 py-2 ring-1 ring-violet-100">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-violet-100">
        {icon}
      </span>
      <span className="mt-1 text-[9px] font-black uppercase tracking-[0.1em]" style={{ color: accent }}>
        {label}
      </span>
      <span className="text-[14px] font-black leading-none tabular-nums text-[#1c1340]">{value}</span>
    </div>
  )
}

function WarningPanel({ visible }: { visible: boolean }) {
  return (
    <section
      className={[
        'mx-auto mt-3 max-w-md rounded-2xl border-2 border-[#fca5a5] bg-[#fff5f5] p-2.5',
        visible ? 'fetch-mflip-warning-pulse' : '',
      ].join(' ')}
      aria-live="polite"
      role="status"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-[#fecaca]">
          <BombIcon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black uppercase tracking-[0.04em] text-[#dc2626]">
            {visible ? 'Hit a bomb' : 'Careful now!'}
          </p>
          <p className="text-[11px] font-bold leading-snug text-[#7f1d1d]">
            {visible
              ? 'YOU LOSE ALL UNCLAIMED GIFTS!'
              : 'One wrong move and it\u2019s game over.'}
          </p>
        </div>
      </div>
    </section>
  )
}

function HowToPlayPanel() {
  const steps: { icon: React.ReactNode; copy: string }[] = [
    {
      icon: <PawIcon className="h-5 w-5" />,
      copy: 'Flip a card to reveal your prize.',
    },
    {
      icon: <GemIcon size={18} />,
      copy: 'Collect as many gifts as you can.',
    },
    {
      icon: <BombIcon className="h-5 w-5" />,
      copy: 'Hit a bomb and lose it all.',
    },
  ]
  return (
    <section className="mx-auto mt-3 max-w-md rounded-2xl bg-white p-3 ring-1 ring-violet-100" aria-label="How to play">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#7c3aed]">How to play</p>
      <ol className="mt-2 grid grid-cols-1 gap-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-50 ring-1 ring-violet-100">
              {s.icon}
            </span>
            <span className="text-[11.5px] font-bold leading-snug text-[#1c1340]">
              <span className="mr-1 text-[#7c3aed]">{i + 1}.</span>
              {s.copy}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ActionButtons({
  flipCost,
  canCashOut,
  hasUnclaimed,
  onPrimaryHint,
  onCashOut,
  gameOver,
  onTryAgain,
}: {
  flipCost: number
  canCashOut: boolean
  hasUnclaimed: boolean
  onPrimaryHint: () => void
  onCashOut: () => void
  gameOver: boolean
  onTryAgain: () => void
}) {
  return (
    <div className="mx-auto mt-3 grid max-w-md grid-cols-5 gap-2">
      {gameOver ? (
        <button
          type="button"
          onClick={onTryAgain}
          className="col-span-5 flex h-14 items-center justify-center gap-2 rounded-2xl border-b-[4px] border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2"
        >
          <span className="text-[15px] font-black uppercase tracking-[0.06em]">Try again</span>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onPrimaryHint}
            className="col-span-3 flex h-14 items-center justify-center gap-2 rounded-2xl border-b-[4px] border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2"
            aria-label={`Flip card. Cost ${flipCost} gem.`}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="4" y="3" width="13" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
                <rect x="7" y="6" width="13" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" fill="rgba(255,255,255,0.18)" />
              </svg>
            </span>
            <span className="text-[15px] font-black uppercase tracking-[0.06em]">Flip card</span>
            <span className="ml-1 flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-black">
              <GemIcon size={12} />
              <span className="tabular-nums">{flipCost}</span>
            </span>
          </button>
          <button
            type="button"
            disabled={!canCashOut}
            onClick={onCashOut}
            className={[
              'col-span-2 flex h-14 flex-col items-center justify-center rounded-2xl border-b-[4px] text-white shadow-none transition-[transform,border-bottom-width] duration-150 active:translate-y-0.5 active:border-b-2',
              canCashOut
                ? 'border-[#15803d] bg-gradient-to-b from-[#4ade80] to-[#16a34a]'
                : 'border-emerald-300 bg-gradient-to-b from-emerald-200 to-emerald-300 opacity-70',
            ].join(' ')}
            aria-label={hasUnclaimed ? 'Cash out and keep all gifts' : 'Nothing to cash out yet'}
          >
            <span className="text-[14px] font-black uppercase leading-none tracking-[0.06em]">Cash out</span>
            <span className="mt-0.5 text-[8.5px] font-black uppercase leading-none tracking-[0.16em] text-white/85">
              Keep all gifts
            </span>
          </button>
        </>
      )}
    </div>
  )
}

function RetentionCard({ bestStreak }: { bestStreak: number }) {
  return (
    <section className="mx-auto mt-3 max-w-md rounded-2xl bg-gradient-to-r from-[#1c1340] to-[#3b2f5e] p-3 text-white ring-1 ring-[#1c1340]/20">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 4h12l-1 5a5 5 0 0 1-10 0L6 4Z"
              fill="#facc15"
              stroke="#fde68a"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path d="M9 17h6v3H9v-3Z" fill="#a78bfa" stroke="#ddd6fe" strokeWidth="1.4" />
            <path d="M8 20h8" stroke="#ddd6fe" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-black uppercase tracking-[0.05em]">Go higher, win bigger!</p>
          <p className="mt-0.5 text-[11px] font-medium text-white/80">
            Each floor gets riskier but rewards get better.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <p className="text-[8.5px] font-black uppercase tracking-[0.14em] text-white/60">Best streak</p>
          <div className="mt-0.5 flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 3h12v3a6 6 0 0 1-12 0V3Z" fill="#facc15" stroke="#fde68a" strokeWidth="1.4" />
              <path d="M9 14h6v6H9v-6Z" fill="#a78bfa" />
            </svg>
            <span className="text-[16px] font-black tabular-nums">{bestStreak}</span>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-white/60">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  )
}

function BottomNav({ onClose }: { onClose: () => void }) {
  // Bottom nav inside the overlay: Home returns to the app shell. Other tabs
  // currently dismiss the overlay too so the user lands back on the main app —
  // wire to the parent navigation when promoting beyond the overlay.
  type NavItem = { id: string; label: string; icon: React.ReactNode; active?: boolean }
  const items: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      active: true,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'browse',
      label: 'Browse',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    { id: 'sell', label: 'Sell', icon: null },
    {
      id: 'activity',
      label: 'Activity',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 12h4l2-7 4 14 2-7h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
  ]
  return (
    <nav
      aria-label="App navigation"
      className="sticky bottom-0 z-[5] mt-3 border-t border-violet-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/85"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        {items.map((it) =>
          it.id === 'sell' ? (
            <button
              key={it.id}
              type="button"
              onClick={onClose}
              aria-label="Sell"
              className="mx-auto -mt-5 flex h-12 w-12 items-center justify-center rounded-full border-b-[4px] border-[#4c1d95] bg-gradient-to-b from-[#a78bfa] to-[#7c3aed] text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.7)] active:translate-y-0.5 active:border-b-2"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <button
              key={it.id}
              type="button"
              onClick={onClose}
              className={[
                'flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5',
                it.active ? 'text-[#7c3aed]' : 'text-[#5b4f7a]',
              ].join(' ')}
              aria-current={it.active ? 'page' : undefined}
            >
              {it.icon}
              <span className="text-[9px] font-black uppercase tracking-[0.08em]">{it.label}</span>
            </button>
          ),
        )}
      </div>
    </nav>
  )
}

/* ─────────────────────────── Toast ─────────────────────────── */

function Toast({ open, title, body }: { open: boolean; title: string; body?: string }) {
  if (!open) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.6rem,env(safe-area-inset-top,0px))] z-[10] flex justify-center px-3">
      <div className="fetch-mflip-toast pointer-events-auto flex max-w-[22rem] items-center gap-2 rounded-2xl bg-[#1c1340] px-3 py-2 text-white shadow-[0_18px_40px_-16px_rgba(28,19,64,0.6)]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-400/40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12.5l4.2 4.2L19 7" stroke="#4ade80" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-black uppercase tracking-[0.06em]">{title}</p>
          {body ? <p className="text-[11px] font-medium text-white/75">{body}</p> : null}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── Page ─────────────────────────── */

export type MysteryFlipPageProps = {
  open: boolean
  onClose: () => void
}

export function MysteryFlipPage({ open, onClose }: MysteryFlipPageProps) {
  const initialState = useMemo(loadGameState, [])
  const [floor, setFloor] = useState(1)
  const [grid, setGrid] = useState<Card[]>(() => buildGrid(1))
  const [unclaimed, setUnclaimed] = useState<GiftBag>({ ...EMPTY_BAG })
  const [gameOver, setGameOver] = useState(false)
  const [bestStreak, setBestStreak] = useState(initialState.bestStreak)
  const [homeGems, setHomeGems] = useState(() => loadHomeGems())
  const [flipKeys, setFlipKeys] = useState<number[]>(() => Array(9).fill(0))
  const [warningVisible, setWarningVisible] = useState(false)
  const [giftsHighlight, setGiftsHighlight] = useState(false)
  const [toast, setToast] = useState<{ title: string; body?: string } | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const giftsHighlightTimerRef = useRef<number | null>(null)
  const warningTimerRef = useRef<number | null>(null)
  const totalClaimedRef = useRef(initialState.totalClaimed)

  const cfg = useMemo(() => floorConfig(floor), [floor])
  const safeFlips = useMemo(
    () => grid.filter((c) => c.revealed && !c.bomb).length,
    [grid],
  )
  const totalValue = useMemo(() => bagGemValue(unclaimed), [unclaimed])
  const hasUnclaimed = totalValue > 0

  /** Refresh `homeGems` from storage whenever the overlay reopens. */
  useEffect(() => {
    if (open) setHomeGems(loadHomeGems())
  }, [open])

  /** Lock body scroll while overlay is open. */
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
      if (giftsHighlightTimerRef.current != null) window.clearTimeout(giftsHighlightTimerRef.current)
      if (warningTimerRef.current != null) window.clearTimeout(warningTimerRef.current)
    }
  }, [])

  const showToast = useCallback((next: { title: string; body?: string }) => {
    if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
    setToast(next)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400)
  }, [])

  const flashGiftsPanel = useCallback(() => {
    if (giftsHighlightTimerRef.current != null) window.clearTimeout(giftsHighlightTimerRef.current)
    setGiftsHighlight(true)
    giftsHighlightTimerRef.current = window.setTimeout(() => setGiftsHighlight(false), 540)
  }, [])

  const flashWarning = useCallback(() => {
    if (warningTimerRef.current != null) window.clearTimeout(warningTimerRef.current)
    setWarningVisible(true)
    warningTimerRef.current = window.setTimeout(() => setWarningVisible(false), 2400)
  }, [])

  const advanceToFloor = useCallback((nextFloor: number) => {
    setFloor(nextFloor)
    setGrid(buildGrid(nextFloor))
    setGameOver(false)
    setFlipKeys(Array(9).fill(0))
  }, [])

  const handleFlip = useCallback(
    (idx: number) => {
      if (gameOver) return
      const card = grid[idx]
      if (!card || card.revealed) return

      const flipped: Card = card.bomb
        ? { ...card, revealed: true }
        : { ...card, revealed: true }
      const nextGrid = grid.map((c, i) => (i === idx ? flipped : c))
      setGrid(nextGrid)
      setFlipKeys((prev) => prev.map((k, i) => (i === idx ? k + 1 : k)))

      if (card.bomb) {
        setGameOver(true)
        setUnclaimed({ ...EMPTY_BAG })
        flashWarning()
        playUiFeedback('error')
        if (typeof window !== 'undefined' && 'vibrate' in window.navigator) {
          try {
            window.navigator.vibrate?.([10, 40, 80])
          } catch {
            /* ignore */
          }
        }
        showToast({ title: 'Hit a bomb', body: 'You lost all unclaimed gifts.' })
        return
      }

      const nextBag = addReward(unclaimed, card.reward)
      setUnclaimed(nextBag)
      flashGiftsPanel()
      playUiFeedback('coin_hit')

      const nextSafeFlips = nextGrid.filter((c) => c.revealed && !c.bomb).length
      if (nextSafeFlips >= FLIPS_TO_NEXT_FLOOR) {
        // Auto-advance: keep unclaimed gifts so the streak compounds.
        const newFloor = floor + 1
        playUiFeedback('success')
        showToast({ title: `Floor ${newFloor} unlocked`, body: 'Risk and rewards rising!' })
        window.setTimeout(() => {
          setFloor(newFloor)
          setGrid(buildGrid(newFloor))
          setFlipKeys(Array(9).fill(0))
        }, 600)
      }
    },
    [floor, gameOver, grid, unclaimed, flashGiftsPanel, flashWarning, showToast],
  )

  const handleCashOut = useCallback(() => {
    if (!hasUnclaimed) return
    const collected = unclaimed
    const nextHomeGems = homeGems + collected.gems
    saveHomeGems(nextHomeGems)
    setHomeGems(nextHomeGems)
    const nextStreak = Math.max(bestStreak, floor)
    setBestStreak(nextStreak)
    totalClaimedRef.current = bagsAdd(totalClaimedRef.current, collected)
    saveGameState({ bestStreak: nextStreak, totalClaimed: totalClaimedRef.current })
    setUnclaimed({ ...EMPTY_BAG })
    showToast({
      title: 'Gifts saved!',
      body: `+${collected.gems} gems · +${collected.coins} coins`,
    })
    playUiFeedback('payment_success')
    advanceToFloor(1)
  }, [advanceToFloor, bestStreak, floor, hasUnclaimed, homeGems, showToast, unclaimed])

  const handleTryAgain = useCallback(() => {
    advanceToFloor(1)
    setUnclaimed({ ...EMPTY_BAG })
    showToast({ title: 'New round', body: 'Fresh grid. Fresh chance.' })
  }, [advanceToFloor, showToast])

  const handlePrimaryHint = useCallback(() => {
    showToast({ title: 'Tap any card', body: 'Flips are free in this demo!' })
  }, [showToast])

  const handleAddGems = useCallback(() => {
    const next = homeGems + 50
    saveHomeGems(next)
    setHomeGems(next)
    showToast({ title: '+50 gems', body: 'Demo top-up added.' })
    playUiFeedback('gems_collect')
  }, [homeGems, showToast])

  if (!open) return null

  return createPortal(
    <div className="fetch-mflip-overlay fixed inset-0 z-[60] flex flex-col bg-[#f6f3ff] text-[#1c1340]">
      <GameTopNav gemBalance={homeGems} onClose={onClose} onAddGems={handleAddGems} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 [-webkit-overflow-scrolling:touch]">
        <GameHero />
        <RiskPanel floor={floor} safeFlips={safeFlips} cfg={cfg} />
        <CardGrid grid={grid} gameOver={gameOver} onFlip={handleFlip} flipKeys={flipKeys} />
        <GiftsPanel unclaimed={unclaimed} totalValue={totalValue} highlight={giftsHighlight} />
        <WarningPanel visible={warningVisible} />
        <HowToPlayPanel />
        <ActionButtons
          flipCost={1}
          canCashOut={hasUnclaimed && !gameOver}
          hasUnclaimed={hasUnclaimed}
          onPrimaryHint={handlePrimaryHint}
          onCashOut={handleCashOut}
          gameOver={gameOver}
          onTryAgain={handleTryAgain}
        />
        <RetentionCard bestStreak={bestStreak} />
      </div>

      <BottomNav onClose={onClose} />
      <Toast open={toast != null} title={toast?.title ?? ''} body={toast?.body} />
    </div>,
    document.body,
  )
}

export default MysteryFlipPage
