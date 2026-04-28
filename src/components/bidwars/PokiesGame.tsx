/**
 * Fetchit Prize Spin — a Duolingo/arcade-style 3x3 prize machine.
 *
 * No real money gambling. Spins cost in-app gems (or free spins). All rewards
 * are app perks (boosts, vouchers, free shipping credit, badges, free spins,
 * etc.) and have no cash value.
 *
 * Stages: idle → charging → spinningFast → spinningSlow → reveal → claimed → idle.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { depositWallet, useWalletBalanceCents, withdrawWallet } from '../../lib/data'
import bidBoostIcon from '../../assets/pokies-icons/bid-boost.png'
import fastBidIcon from '../../assets/pokies-icons/fast-bid.png'
import freeShippingIcon from '../../assets/pokies-icons/free-shipping.png'
import gemIcon from '../../assets/pokies-icons/gem.png'
import jackpotIcon from '../../assets/pokies-icons/jackpot.png'
import mascotPeekUrl from '../../assets/pokies-mascot-peek.png'
import mysteryPrizeIcon from '../../assets/pokies-icons/mystery-prize.png'
import sellerBoostIcon from '../../assets/pokies-icons/seller-boost.png'
import topBidderIcon from '../../assets/pokies-icons/top-bidder.png'
import treasureChestIcon from '../../assets/pokies-icons/treasure-chest.png'
import vipPassIcon from '../../assets/pokies-icons/vip-pass.png'

/** Goals the Earn-Free-Spins card can redirect the user to. */
export type FreeSpinTaskGoal = 'live' | 'list' | 'streak' | 'invite'

type Props = {
  open: boolean
  onClose: () => void
  /**
   * Called when the user taps the Earn button on a free-spin task. The parent
   * is expected to dismiss the pokies overlay (or navigate) so the user can
   * complete the task. After the user comes back, the task shows a Claim button.
   */
  onEarnTask?: (goal: FreeSpinTaskGoal) => void
}

export type SpinStage =
  | 'idle'
  | 'charging'
  | 'spinning'
  | 'reveal'
  | 'claimed'

type Rarity = 'common' | 'uncommon' | 'rare' | 'jackpot'

type RewardId =
  | 'gem'
  | 'bidBoost'
  | 'freeSpin'
  | 'mysteryPrize'
  | 'topBidder'
  | 'freeShipping'
  | 'sellerBoost'
  | 'vipPass'
  | 'jackpot'

type Reward = {
  id: RewardId
  name: string
  icon: string
  rarity: Rarity
  description: string
  benefit: string
}

type RewardOutcome = {
  reward: Reward
  /** Display string, e.g. `+10 gems`, `+$1`, `24h`. */
  valueLabel: string
  /** Internal effect applied to wallet/state. */
  effect: RewardEffect
}

type RewardEffect =
  | { type: 'gems'; amount: number }
  | { type: 'bidBoostsCount'; amount: number }
  | { type: 'freeSpins'; amount: number }
  | { type: 'mystery' }
  | { type: 'topBidderMinutes'; durationMinutes: number }
  | { type: 'shippingCreditsCount'; amount: number }
  | { type: 'sellerBoostMinutes'; durationMinutes: number }
  | { type: 'vipMinutes'; durationMinutes: number }
  | { type: 'jackpot' }

type SpinTierId = 'mini' | 'basic' | 'boost' | 'jackpot'

type SpinTier = {
  id: SpinTierId
  label: string
  cost: number
  blurb: string
  weights: Record<RewardId, number>
  freeSpinEligible: boolean
}

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

/* -------------------------- Reward definitions -------------------------- */

const REWARDS: Record<RewardId, Reward> = {
  gem: {
    id: 'gem',
    name: 'Gem',
    icon: gemIcon,
    rarity: 'common',
    description: 'Adds bonus gems to your wallet.',
    benefit: 'Use gems to spin or unlock perks.',
  },
  bidBoost: {
    id: 'bidBoost',
    name: 'Bid Boost',
    icon: bidBoostIcon,
    rarity: 'common',
    description: 'Adds +$1 to your next eligible bid.',
    benefit: 'Helps you bid faster in live auctions.',
  },
  freeSpin: {
    id: 'freeSpin',
    name: 'Free Spin',
    icon: fastBidIcon,
    rarity: 'common',
    description: 'A free Prize Spin you can use later.',
    benefit: 'Stack them for risk-free spins.',
  },
  mysteryPrize: {
    id: 'mysteryPrize',
    name: 'Mystery Prize',
    icon: mysteryPrizeIcon,
    rarity: 'uncommon',
    description: 'A random reward from the prize pool.',
    benefit: 'Could be gems, boosts, discounts, or spins.',
  },
  topBidder: {
    id: 'topBidder',
    name: 'Top Bidder',
    icon: topBidderIcon,
    rarity: 'uncommon',
    description: 'Wear a temporary Top Bidder badge.',
    benefit: 'Stand out in live auctions for 24h.',
  },
  freeShipping: {
    id: 'freeShipping',
    name: 'Free Shipping',
    icon: freeShippingIcon,
    rarity: 'common',
    description: 'Free shipping credit on your next order.',
    benefit: 'Apply at checkout. Save big.',
  },
  sellerBoost: {
    id: 'sellerBoost',
    name: 'Seller Boost',
    icon: sellerBoostIcon,
    rarity: 'uncommon',
    description: 'Boost a listing or live sale visibility.',
    benefit: 'Get more views and bidders for 30 mins.',
  },
  vipPass: {
    id: 'vipPass',
    name: 'VIP Pass',
    icon: vipPassIcon,
    rarity: 'rare',
    description: 'Unlock VIP status for 24h.',
    benefit: 'Better reward odds, exclusive access.',
  },
  jackpot: {
    id: 'jackpot',
    name: 'Jackpot',
    icon: jackpotIcon,
    rarity: 'jackpot',
    description: 'Mega bundle: gems, boosts, VIP and more.',
    benefit: 'A huge boost to your Fetchit account.',
  },
}

/** Tile order in the 3x3 grid. */
const TILE_ORDER: RewardId[] = [
  'gem',
  'bidBoost',
  'freeSpin',
  'mysteryPrize',
  'topBidder',
  'freeShipping',
  'sellerBoost',
  'vipPass',
  'jackpot',
]

const TIERS: SpinTier[] = [
  {
    id: 'mini',
    label: 'Mini',
    cost: 5,
    blurb: 'Mostly gems & quick boosts',
    freeSpinEligible: false,
    weights: {
      gem: 36, bidBoost: 18, freeSpin: 12, mysteryPrize: 6, topBidder: 4,
      freeShipping: 14, sellerBoost: 6, vipPass: 3, jackpot: 1,
    },
  },
  {
    id: 'basic',
    label: 'Basic',
    cost: 25,
    blurb: 'Balanced mix of rewards',
    freeSpinEligible: true,
    weights: {
      gem: 24, bidBoost: 18, freeSpin: 14, mysteryPrize: 12, topBidder: 8,
      freeShipping: 10, sellerBoost: 8, vipPass: 5, jackpot: 1,
    },
  },
  {
    id: 'boost',
    label: 'Boost',
    cost: 50,
    blurb: 'Better odds for boosts',
    freeSpinEligible: false,
    weights: {
      gem: 14, bidBoost: 26, freeSpin: 10, mysteryPrize: 12, topBidder: 12,
      freeShipping: 8, sellerBoost: 16, vipPass: 8, jackpot: 4,
    },
  },
  {
    id: 'jackpot',
    label: 'Jackpot',
    cost: 125,
    blurb: 'Best chance for VIP & jackpot',
    freeSpinEligible: false,
    weights: {
      gem: 8, bidBoost: 14, freeSpin: 8, mysteryPrize: 16, topBidder: 12,
      freeShipping: 6, sellerBoost: 14, vipPass: 14, jackpot: 8,
    },
  },
]

const DEFAULT_WALLET: RewardsWallet = {
  freeSpins: 3,
  bidBoosts: 0,
  shippingCredits: 0,
  sellerBoostMinutes: 0,
  vipMinutes: 0,
  topBidderMinutes: 0,
  mysteryPending: 0,
  jackpotsHit: 0,
}

/* -------------------------- Persistence helper -------------------------- */

const DAILY_TARGET = 10

type DailyProgress = { date: string; count: number }

type PersistedState = {
  wallet: RewardsWallet
  selectedTier: SpinTierId
  daily: DailyProgress
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const DEFAULT_DAILY: DailyProgress = { date: '', count: 0 }

function loadPersisted(): PersistedState {
  if (typeof window === 'undefined') {
    return { wallet: DEFAULT_WALLET, selectedTier: 'basic', daily: DEFAULT_DAILY }
  }
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) {
      return { wallet: DEFAULT_WALLET, selectedTier: 'basic', daily: DEFAULT_DAILY }
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    const today = todayKey()
    const daily: DailyProgress = parsed.daily?.date === today
      ? { date: today, count: parsed.daily.count ?? 0 }
      : { date: today, count: 0 }
    return {
      wallet: { ...DEFAULT_WALLET, ...(parsed.wallet ?? {}) },
      selectedTier: (parsed.selectedTier as SpinTierId) ?? 'basic',
      daily,
    }
  } catch {
    return { wallet: DEFAULT_WALLET, selectedTier: 'basic', daily: DEFAULT_DAILY }
  }
}

function savePersisted(state: PersistedState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
}

/* -------------------------- Reward picking ------------------------------ */

function pickRewardByTier(tier: SpinTier): Reward {
  const total = TILE_ORDER.reduce((sum, id) => sum + (tier.weights[id] ?? 0), 0)
  let r = Math.random() * total
  for (const id of TILE_ORDER) {
    const w = tier.weights[id] ?? 0
    if ((r -= w) <= 0) return REWARDS[id]
  }
  return REWARDS.gem
}

function rewardOutcome(reward: Reward, tierId: SpinTierId): RewardOutcome {
  switch (reward.id) {
    case 'gem': {
      const amount = tierId === 'jackpot' ? 100 : tierId === 'boost' ? 25 : tierId === 'basic' ? 10 : 5
      return { reward, valueLabel: `+${amount} gems`, effect: { type: 'gems', amount } }
    }
    case 'bidBoost': {
      const amount = tierId === 'jackpot' ? 3 : tierId === 'boost' ? 2 : 1
      return { reward, valueLabel: `+${amount} bid boost${amount === 1 ? '' : 's'}`, effect: { type: 'bidBoostsCount', amount } }
    }
    case 'freeSpin': {
      const amount = tierId === 'jackpot' ? 5 : tierId === 'boost' ? 2 : 1
      return { reward, valueLabel: `+${amount} free spin${amount === 1 ? '' : 's'}`, effect: { type: 'freeSpins', amount } }
    }
    case 'mysteryPrize':
      return { reward, valueLabel: 'Mystery prize', effect: { type: 'mystery' } }
    case 'topBidder':
      return { reward, valueLabel: '24h badge', effect: { type: 'topBidderMinutes', durationMinutes: 60 * 24 } }
    case 'freeShipping':
      return { reward, valueLabel: '+1 shipping credit', effect: { type: 'shippingCreditsCount', amount: 1 } }
    case 'sellerBoost': {
      const minutes = tierId === 'jackpot' ? 60 : 30
      return { reward, valueLabel: `${minutes} min boost`, effect: { type: 'sellerBoostMinutes', durationMinutes: minutes } }
    }
    case 'vipPass':
      return { reward, valueLabel: '24h VIP', effect: { type: 'vipMinutes', durationMinutes: 60 * 24 } }
    case 'jackpot':
      return { reward, valueLabel: '+250 gems · +5 spins · VIP', effect: { type: 'jackpot' } }
  }
}

/* ------------------------------- Audio --------------------------------- */

let pokiesAudioCtx: AudioContext | null = null

function getPokiesAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!pokiesAudioCtx || pokiesAudioCtx.state === 'closed') pokiesAudioCtx = new AC()
  if (pokiesAudioCtx.state === 'suspended') void pokiesAudioCtx.resume().catch(() => undefined)
  return pokiesAudioCtx
}

type Tone =
  | 'lever' | 'charge' | 'tick' | 'tickSlow' | 'lose' | 'buy' | 'free'
  | 'win-gem' | 'win-bidBoost' | 'win-freeSpin' | 'win-mysteryPrize'
  | 'win-topBidder' | 'win-freeShipping' | 'win-sellerBoost'
  | 'win-vipPass' | 'win-jackpot' | 'win-miss'

function playTone(kind: Tone) {
  const ctx = getPokiesAudioCtx()
  if (!ctx) return
  try {
    const master = ctx.createGain()
    master.gain.value = kind === 'tick' || kind === 'tickSlow' ? 0.12 : 0.22
    master.connect(ctx.destination)
    const now = ctx.currentTime
    const play = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', peak = 0.75) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0.0001, now + start)
      gain.gain.exponentialRampToValueAtTime(peak, now + start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      osc.connect(gain).connect(master)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.04)
    }
    if (kind === 'lever') {
      play(140, 0, 0.12, 'sawtooth')
      play(80, 0.08, 0.2, 'triangle')
      play(1100, 0.22, 0.07, 'square')
    } else if (kind === 'charge') {
      play(260, 0, 0.5, 'sawtooth', 0.4)
      play(620, 0.06, 0.5, 'triangle', 0.3)
    } else if (kind === 'tick') {
      play(620 + Math.random() * 440, 0, 0.04, 'square')
    } else if (kind === 'tickSlow') {
      play(360 + Math.random() * 180, 0, 0.07, 'square')
    } else if (kind === 'win-gem') {
      // Sparkly bell — bright triangle ascent.
      ;[1046, 1318, 1568, 2093].forEach((f, i) => play(f, i * 0.06, 0.2, 'triangle', 0.7))
    } else if (kind === 'win-bidBoost') {
      // Punchy power-up — saw + triangle.
      play(220, 0, 0.18, 'sawtooth', 0.55)
      ;[523, 784, 1046].forEach((f, i) => play(f, i * 0.07, 0.22, 'triangle'))
    } else if (kind === 'win-freeSpin') {
      // Springy ascending sweep.
      ;[523, 659, 784, 988, 1175].forEach((f, i) => play(f, i * 0.05, 0.18, 'triangle'))
    } else if (kind === 'win-mysteryPrize') {
      // Mystery: dip then rise.
      ;[523, 392, 659, 988, 1318].forEach((f, i) => play(f, i * 0.08, 0.26, 'sine'))
    } else if (kind === 'win-topBidder') {
      // Trumpet-like fanfare.
      ;[392, 523, 659, 523, 784].forEach((f, i) => play(f, i * 0.1, 0.28, 'sawtooth', 0.5))
    } else if (kind === 'win-freeShipping') {
      // Airy whoosh — two long sine pads.
      play(523, 0, 0.4, 'sine', 0.45)
      play(784, 0.18, 0.45, 'sine', 0.4)
    } else if (kind === 'win-sellerBoost') {
      // Power-up zap.
      ;[330, 494, 740, 988].forEach((f, i) => play(f, i * 0.05, 0.18, 'square', 0.45))
      play(1568, 0.28, 0.18, 'triangle', 0.55)
    } else if (kind === 'win-vipPass') {
      // Regal chord progression.
      ;[392, 523, 659, 784, 1046, 1318].forEach((f, i) => play(f, i * 0.09, 0.32, 'triangle', 0.55))
      play(196, 0, 0.55, 'sawtooth', 0.4)
    } else if (kind === 'win-jackpot') {
      // Big dramatic ladder + sparkle tail.
      ;[392, 523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => play(f, i * 0.07, 0.26, 'triangle'))
      play(80, 0, 0.6, 'sawtooth', 0.6)
      play(3520, 0.55, 0.4, 'sine', 0.3)
      ;[2637, 3136, 3951].forEach((f, i) => play(f, 0.7 + i * 0.06, 0.18, 'triangle', 0.5))
    } else if (kind === 'win-miss') {
      // Soft "aw" — descending two notes.
      play(440, 0, 0.18, 'sine', 0.35)
      play(330, 0.18, 0.22, 'sine', 0.3)
    } else if (kind === 'lose') {
      play(220, 0, 0.18, 'sawtooth')
      play(150, 0.12, 0.2, 'triangle')
    } else if (kind === 'buy') {
      ;[392, 523, 659].forEach((f, i) => play(f, i * 0.06, 0.16, 'triangle'))
    } else if (kind === 'free') {
      ;[784, 988, 1175].forEach((f, i) => play(f, i * 0.07, 0.18, 'triangle'))
    }
    window.setTimeout(() => {
      try { master.disconnect() } catch { /* ignore */ }
    }, 1_400)
  } catch {
    /* best effort */
  }
}

let stopPokiesMusic: (() => void) | null = null

function startPokiesMusic(): void {
  if (stopPokiesMusic) return
  const ctx = getPokiesAudioCtx()
  if (!ctx) return

  const master = ctx.createGain()
  master.gain.value = 0.026
  master.connect(ctx.destination)

  // Chill arcade bed: slower, softer, mostly sine/triangle tones so it supports
  // the page without feeling like a loud casino loop.
  const lead = [261.63, 329.63, 392, 493.88, 392, 329.63, 293.66, 349.23]
  const bass = [65.41, 65.41, 98, 82.41]
  let step = 0

  const note = (freq: number, start: number, dur: number, type: OscillatorType, peak: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
    osc.connect(gain).connect(master)
    osc.start(start)
    osc.stop(start + dur + 0.03)
  }

  const tick = () => {
    const now = ctx.currentTime
    const leadFreq = lead[step % lead.length] ?? 523
    note(leadFreq, now, 0.34, 'sine', 0.24)
    if (step % 2 === 0) {
      note(leadFreq * 2, now + 0.09, 0.22, 'triangle', 0.08)
    }
    if (step % 4 === 0) {
      note(bass[Math.floor(step / 4) % bass.length] ?? 98, now, 0.58, 'triangle', 0.12)
    }
    step += 1
  }

  tick()
  const interval = window.setInterval(tick, 560)
  stopPokiesMusic = () => {
    window.clearInterval(interval)
    const now = ctx.currentTime
    try {
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)
      window.setTimeout(() => {
        try { master.disconnect() } catch { /* ignore */ }
      }, 280)
    } catch {
      try { master.disconnect() } catch { /* ignore */ }
    }
    stopPokiesMusic = null
  }
}

function stopArcadeMusic(): void {
  stopPokiesMusic?.()
}

/** Apply a streak multiplier to gem / free-spin rewards. Other reward kinds are
 * left alone (you can't really "multiply" a 24h VIP pass), but the multiplier
 * is still surfaced visually next to the reward name. */
function applyMultiplier(out: RewardOutcome, mult: number): RewardOutcome {
  if (mult <= 1) return out
  if (out.effect.type === 'gems') {
    const amount = out.effect.amount * mult
    return {
      ...out,
      effect: { type: 'gems', amount },
      valueLabel: `+${amount} gems · ${mult}x streak`,
    }
  }
  if (out.effect.type === 'freeSpins') {
    const amount = out.effect.amount * mult
    return {
      ...out,
      effect: { type: 'freeSpins', amount },
      valueLabel: `+${amount} free spin${amount === 1 ? '' : 's'} · ${mult}x streak`,
    }
  }
  return { ...out, valueLabel: `${out.valueLabel} · ${mult}x streak` }
}

function playWinSoundFor(rewardId: RewardId | null) {
  if (!rewardId) return playTone('win-miss')
  switch (rewardId) {
    case 'gem': return playTone('win-gem')
    case 'bidBoost': return playTone('win-bidBoost')
    case 'freeSpin': return playTone('win-freeSpin')
    case 'mysteryPrize': return playTone('win-mysteryPrize')
    case 'topBidder': return playTone('win-topBidder')
    case 'freeShipping': return playTone('win-freeShipping')
    case 'sellerBoost': return playTone('win-sellerBoost')
    case 'vipPass': return playTone('win-vipPass')
    case 'jackpot': return playTone('win-jackpot')
  }
}

/* ============================== Component ============================== */

/** Probability that any given spin produces a 3-of-a-kind win. */
const WIN_CHANCE = 0.2

export function PokiesGame({ open, onClose, onEarnTask }: Props) {
  const wallet = useWalletBalanceCents()
  // Treat $0.01 == 1 gem so the existing wallet store still drives the balance.
  const gemBalance = Math.floor(wallet / 100)

  const initial = useMemo(() => loadPersisted(), [])
  const [rewardsWallet, setRewardsWallet] = useState<RewardsWallet>(initial.wallet)
  const [selectedTier, setSelectedTier] = useState<SpinTierId>(initial.selectedTier)
  const [stage, setStage] = useState<SpinStage>('idle')
  /** Per-column target icons for the next/current reel landing. */
  const [targets, setTargets] = useState<[RewardId, RewardId, RewardId] | null>(null)
  const [spinSeed, setSpinSeed] = useState(0)
  const [outcome, setOutcome] = useState<RewardOutcome | null>(null)
  /** True when the most recent reveal was a 3-of-a-kind win. */
  const [didWin, setDidWin] = useState(false)
  const [missMessage, setMissMessage] = useState<string | null>(null)
  /** Cinematic banner shown over the machine on win/jackpot/miss. */
  const [revealBanner, setRevealBanner] = useState<'big' | 'mega' | 'jackpot' | 'miss' | null>(null)
  /** Streak of consecutive 3-of-a-kind wins; resets on miss. */
  const [streak, setStreak] = useState(0)
  /** Daily spin progress; on first spin of a new day it auto-resets. */
  const [daily, setDaily] = useState<DailyProgress>(initial.daily.date === todayKey() ? initial.daily : { date: todayKey(), count: 0 })
  /** Full-screen flash overlay when the jackpot lands. */
  const [jackpotFlash, setJackpotFlash] = useState(false)
  const [autoSpin, setAutoSpin] = useState(false)
  const [autoSpinCount, setAutoSpinCount] = useState(0)
  const [winModalOpen, setWinModalOpen] = useState(false)
  const [howOpen, setHowOpen] = useState(false)
  const [oddsOpen, setOddsOpen] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [floaters, setFloaters] = useState<Array<{ id: string; text: string; tone: 'gem' | 'free' }>>([])

  const tickIntervalRef = useRef<number | null>(null)
  const revealTimeoutRef = useRef<number | null>(null)
  const stageRef = useRef<SpinStage>('idle')
  stageRef.current = stage

  const tier = TIERS.find((t) => t.id === selectedTier) ?? TIERS[1]

  /* -------------------------- Effects: lifecycle ------------------------- */

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setIntroOpen(true)
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      stopArcadeMusic()
      return
    }

    startPokiesMusic()
    const unlockAndStart = () => {
      const ctx = getPokiesAudioCtx()
      if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined)
      startPokiesMusic()
    }

    window.addEventListener('pointerdown', unlockAndStart, { passive: true })
    window.addEventListener('keydown', unlockAndStart)
    return () => {
      window.removeEventListener('pointerdown', unlockAndStart)
      window.removeEventListener('keydown', unlockAndStart)
      stopArcadeMusic()
    }
  }, [open])

  useEffect(() => {
    savePersisted({ wallet: rewardsWallet, selectedTier, daily })
  }, [rewardsWallet, selectedTier, daily])

  useEffect(() => {
    return () => {
      if (tickIntervalRef.current != null) window.clearInterval(tickIntervalRef.current)
      if (revealTimeoutRef.current != null) window.clearTimeout(revealTimeoutRef.current)
    }
  }, [])

  /* ---------------------------- Spin pipeline --------------------------- */

  const willUseFreeSpin = tier.freeSpinEligible && rewardsWallet.freeSpins > 0
  const canSpin =
    willUseFreeSpin || gemBalance >= tier.cost

  const consumeSpinCost = useCallback((): boolean => {
    if (willUseFreeSpin) {
      setRewardsWallet((w) => ({ ...w, freeSpins: Math.max(0, w.freeSpins - 1) }))
      return true
    }
    if (gemBalance < tier.cost) return false
    const ok = withdrawWallet(tier.cost * 100, `Prize Spin · ${tier.label}`)
    return ok
  }, [willUseFreeSpin, gemBalance, tier.cost, tier.label])

  const applyRewardEffect = useCallback((eff: RewardEffect, valueLabel: string): void => {
    switch (eff.type) {
      case 'gems':
        depositWallet(eff.amount * 100, `Prize Spin · +${eff.amount} gems`)
        pushFloater(valueLabel, 'gem')
        break
      case 'bidBoostsCount':
        setRewardsWallet((w) => ({ ...w, bidBoosts: w.bidBoosts + eff.amount }))
        break
      case 'freeSpins':
        setRewardsWallet((w) => ({ ...w, freeSpins: w.freeSpins + eff.amount }))
        pushFloater(`+${eff.amount} free spin${eff.amount === 1 ? '' : 's'}`, 'free')
        break
      case 'mystery':
        setRewardsWallet((w) => ({ ...w, mysteryPending: w.mysteryPending + 1 }))
        break
      case 'topBidderMinutes':
        setRewardsWallet((w) => ({ ...w, topBidderMinutes: w.topBidderMinutes + eff.durationMinutes }))
        break
      case 'shippingCreditsCount':
        setRewardsWallet((w) => ({ ...w, shippingCredits: w.shippingCredits + eff.amount }))
        break
      case 'sellerBoostMinutes':
        setRewardsWallet((w) => ({ ...w, sellerBoostMinutes: w.sellerBoostMinutes + eff.durationMinutes }))
        break
      case 'vipMinutes':
        setRewardsWallet((w) => ({ ...w, vipMinutes: w.vipMinutes + eff.durationMinutes }))
        break
      case 'jackpot':
        depositWallet(250 * 100, 'Prize Spin · Jackpot gems')
        setRewardsWallet((w) => ({
          ...w,
          freeSpins: w.freeSpins + 5,
          vipMinutes: w.vipMinutes + 60 * 24,
          jackpotsHit: w.jackpotsHit + 1,
        }))
        pushFloater('+250 gems · +5 spins · VIP', 'gem')
        break
    }
  }, [])

  const pushFloater = (text: string, tone: 'gem' | 'free') => {
    const id = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setFloaters((prev) => [...prev, { id, text, tone }])
    window.setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 1_500)
  }

  const startSpin = useCallback(() => {
    if (stageRef.current !== 'idle' && stageRef.current !== 'claimed') return
    setError(null)
    setMissMessage(null)
    setRevealBanner(null)
    if (!canSpin) {
      setError('Not enough gems for this spin.')
      return
    }
    if (!consumeSpinCost()) {
      setError('Could not start spin.')
      return
    }
    // Daily counter — auto-resets at midnight.
    setDaily((d) => {
      const today = todayKey()
      if (d.date !== today) return { date: today, count: 1 }
      return { date: today, count: d.count + 1 }
    })
    const willWin = Math.random() < WIN_CHANCE
    let nextTargets: [RewardId, RewardId, RewardId]
    let baseOutcome: RewardOutcome | null = null
    if (willWin) {
      const reward = pickRewardByTier(tier)
      nextTargets = [reward.id, reward.id, reward.id]
      baseOutcome = rewardOutcome(reward, tier.id)
    } else {
      const pool = [...TILE_ORDER]
      const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
      const b = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
      const c = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
      nextTargets = [a, b, c]
    }
    playTone('lever')
    setStage('charging')
    setOutcome(null)
    setDidWin(false)
    window.setTimeout(() => {
      playTone('charge')
      setSpinSeed((s) => s + 1)
      setTargets(nextTargets)
      setStage('spinning')
      tickIntervalRef.current = window.setInterval(() => {
        playTone('tickSlow')
      }, 220)
      revealTimeoutRef.current = window.setTimeout(() => {
        if (tickIntervalRef.current != null) {
          window.clearInterval(tickIntervalRef.current)
          tickIntervalRef.current = null
        }
        setStage('reveal')
        if (baseOutcome) {
          // Streak bumps then we apply the multiplier so the on-screen reward
          // value reflects the streak bonus immediately.
          const newStreak = streak + 1
          const mult = Math.min(newStreak, 5)
          const finalOutcome = applyMultiplier(baseOutcome, mult)
          setStreak(newStreak)
          setOutcome(finalOutcome)
          setDidWin(true)
          applyRewardEffect(finalOutcome.effect, finalOutcome.valueLabel)
          playWinSoundFor(finalOutcome.reward.id)
          // Cinematic banner + jackpot flash.
          const r = finalOutcome.reward.rarity
          setRevealBanner(r === 'jackpot' ? 'jackpot' : r === 'rare' ? 'mega' : 'big')
          if (r === 'jackpot') {
            setJackpotFlash(true)
            window.setTimeout(() => setJackpotFlash(false), 1_200)
          }
          window.setTimeout(() => setWinModalOpen(true), 580)
        } else {
          playTone('win-miss')
          setStreak(0)
          setRevealBanner('miss')
          setMissMessage('So close! Try again.')
          window.setTimeout(() => {
            setMissMessage(null)
            setRevealBanner(null)
            setStage('idle')
          }, 1_300)
        }
      }, REEL_DURATIONS[REEL_DURATIONS.length - 1] + 120)
    }, 600)
  }, [canSpin, consumeSpinCost, tier, applyRewardEffect, streak])

  const claimAndContinue = useCallback(() => {
    setWinModalOpen(false)
    setStage('claimed')
    window.setTimeout(() => {
      setStage('idle')
      setOutcome(null)
      setDidWin(false)
      setRevealBanner(null)
    }, 220)
  }, [])

  /* ----------------------------- Auto spin ------------------------------ */

  useEffect(() => {
    if (!open) return
    if (!autoSpin) return
    if (stage !== 'idle' && stage !== 'claimed') return
    if (!canSpin) {
      setAutoSpin(false)
      return
    }
    // Stop after a jackpot reveal.
    if (outcome?.reward.id === 'jackpot' && stage === 'claimed') {
      setAutoSpin(false)
      return
    }
    const id = window.setTimeout(() => {
      setAutoSpinCount((c) => c + 1)
      startSpin()
    }, 700)
    return () => window.clearTimeout(id)
  }, [open, autoSpin, stage, canSpin, outcome, startSpin])

  useEffect(() => {
    if (!autoSpin) setAutoSpinCount(0)
  }, [autoSpin])

  /* ------------------------------- Render ------------------------------- */

  if (!open || typeof document === 'undefined') return null

  const spinning = stage === 'charging' || stage === 'spinning'
  const isReveal = stage === 'reveal'
  const isJackpotReveal = isReveal && outcome?.reward.id === 'jackpot'

  return createPortal(
    <div
      className="fetch-pokies-page fixed inset-0 z-[9990] flex flex-col overflow-hidden bg-[#05020b] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Fetchit Prize Spin"
    >
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(124,58,237,0.45),transparent_36%),radial-gradient(circle_at_15%_10%,rgba(168,85,247,0.35),transparent_24%),linear-gradient(180deg,#08020f_0%,#05020b_100%)]" />
      <FloatingParticles />
      {isJackpotReveal ? <JackpotBurst /> : null}

      <header className="relative z-[3] flex shrink-0 items-center justify-between px-2.5 pt-[max(0.45rem,env(safe-area-inset-top,0px))] pb-0.5">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 rounded-full bg-white/8 px-1.5 py-0.5 ring-1 ring-white/12">
            <img src={gemIcon} alt="Gems" className="h-4 w-4 object-contain" draggable={false} />
            <span className="text-[12px] font-black tabular-nums">{gemBalance.toLocaleString('en-AU')}</span>
            <button
              type="button"
              onClick={() => {
                playTone('buy')
                depositWallet(1_000, 'Bought gems')
              }}
              className="grid h-4 w-4 place-items-center rounded-full bg-white/15 text-[12px] font-black leading-none"
              aria-label="Add gems"
            >
              +
            </button>
          </div>
          <div
            className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 ring-1 ring-amber-300/30"
            aria-label={`${rewardsWallet.freeSpins} free spins`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-amber-300">
              <path d="M19 4H5a2 2 0 0 0-2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4V6a2 2 0 0 0-2-2zm-7 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            <span className="text-[12px] font-black tabular-nums text-amber-200">{rewardsWallet.freeSpins}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setHowOpen(true)}
            aria-label="How it works"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/8 ring-1 ring-white/12 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14a4 4 0 0 0-4 4h2a2 2 0 0 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setOddsOpen(true)}
            aria-label="Odds info"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/8 ring-1 ring-white/12 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8 17H6v-7h2v7zm5 0h-2V7h2v10zm5 0h-2v-4h2v4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prize spin"
            className="grid h-7 w-7 place-items-center rounded-full bg-white/8 text-white ring-1 ring-white/12 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <main className="relative z-[2] min-h-0 flex-1 overflow-y-auto px-4 pb-[max(0.8rem,env(safe-area-inset-bottom,0px))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Top space reserved so the perched mascot has room above the cabinet. */}
        <div className="relative mt-[7.5rem]">
          <PrizeMachine
            stage={stage}
            targets={targets}
            spinSeed={spinSeed}
            outcome={outcome}
            didWin={didWin}
          />
          {/* Cinematic banner overlay on win/jackpot/miss reveal */}
          {revealBanner ? <RevealBanner kind={revealBanner} reward={outcome?.reward ?? null} /> : null}
          {/* Floaters above machine: +N gems / +N free spins */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[6] flex flex-col items-center">
            {floaters.map((f) => (
              <span
                key={f.id}
                className={[
                  'fetch-pokies-floater rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ring-1',
                  f.tone === 'gem'
                    ? 'bg-violet-100 text-[#4c1d95] ring-violet-300'
                    : 'bg-amber-100 text-amber-800 ring-amber-300',
                ].join(' ')}
              >
                {f.text}
              </span>
            ))}
          </div>
        </div>

        {missMessage ? (
          <p className="mt-1 text-center text-[12px] font-black uppercase tracking-[0.08em] text-amber-200">
            {missMessage}
          </p>
        ) : null}

        {error ? <p className="mt-1.5 text-center text-[12px] font-bold text-red-300">{error}</p> : null}

        <div className="mx-auto mt-2 flex w-full max-w-[22rem] flex-col gap-2">
          <button
            type="button"
            onClick={startSpin}
            disabled={spinning}
            className={[
              'fetch-pokies-spin-btn flex w-full items-center justify-center rounded-[1.25rem] border border-white/35 bg-gradient-to-b from-[#e879f9] via-[#7c3aed] to-[#4c1d95] py-2.5 text-white shadow-[0_0_34px_rgba(168,85,247,0.75),inset_0_2px_0_rgba(255,255,255,0.28)] active:scale-[0.98] disabled:opacity-70',
              spinning ? 'fetch-pokies-spin-btn--charging' : '',
            ].join(' ')}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <span className="text-[24px] font-black uppercase leading-none tracking-[0.02em]">
                {willUseFreeSpin ? 'Spin' : canSpin ? 'Spin' : 'Get'}
              </span>
              <span className={[
                'flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-black',
                willUseFreeSpin ? 'bg-amber-500/30 text-amber-100 ring-1 ring-amber-300/40'
                  : 'bg-black/22 text-white ring-1 ring-white/15',
              ].join(' ')}>
                {willUseFreeSpin
                  ? '1 Free'
                  : canSpin
                    ? <>{tier.cost}<img src={gemIcon} alt="" className="h-4 w-4 object-contain" /></>
                    : 'Gems'}
              </span>
            </span>
          </button>
          <AutoSpinButton
            active={autoSpin}
            count={autoSpinCount}
            onToggle={() => setAutoSpin((v) => !v)}
          />
        </div>

        <p className="mt-1 text-center text-[10px] font-bold text-white/50">
          Auto uses free spins first
        </p>

        <SpinTierPicker tier={selectedTier} onChange={setSelectedTier} />

        <DailyChallengeRow
          progress={daily.count}
          target={DAILY_TARGET}
          onClaim={() => {
            // Bonus: +3 free spins when daily target is hit. We mark the daily as
            // "over-claimed" by topping the count past target so the button hides.
            setRewardsWallet((w) => ({ ...w, freeSpins: w.freeSpins + 3 }))
            setDaily((d) => ({ ...d, count: d.count + DAILY_TARGET }))
            pushFloater('+3 free spins · daily', 'free')
            playTone('free')
          }}
        />

        <FreeSpinsEarnCard
          freeSpins={rewardsWallet.freeSpins}
          onClaim={(amount, label) => {
            setRewardsWallet((w) => ({ ...w, freeSpins: w.freeSpins + amount }))
            pushFloater(`+${amount} from ${label}`, 'free')
            playTone('free')
          }}
          onEarn={(goal) => {
            onEarnTask?.(goal)
            // If parent doesn't dismiss us, leave the user where they are. We
            // close by default so they can complete the task.
            if (!onEarnTask) onClose()
          }}
        />

        <section className="mt-2">
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-white/10" />
            <p className="text-[10.5px] font-black uppercase tracking-[0.12em] text-white">Buy Gems</p>
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            <GemPack amount={50} price="$0.99" image={gemIcon}
              onBuy={() => { playTone('buy'); depositWallet(50 * 100, 'Bought 50 gems') }} />
            <GemPack amount={300} price="$4.99" image={gemIcon} popular
              onBuy={() => { playTone('buy'); depositWallet(300 * 100, 'Bought 300 gems') }} />
            <GemPack amount={650} price="$9.99" image={treasureChestIcon} bonus
              onBuy={() => { playTone('buy'); depositWallet(650 * 100, 'Bought 650 gems') }} />
            <GemPack amount={1500} price="$19.99" image={treasureChestIcon} best
              onBuy={() => { playTone('buy'); depositWallet(1500 * 100, 'Bought 1,500 gems') }} />
          </div>
        </section>

        <p className="mt-2 px-1 text-[9.5px] font-medium leading-snug text-white/55">
          In-app rewards only. No real-money gambling. No cash value.
        </p>
      </main>

      {winModalOpen && outcome ? (
        <WinModal
          outcome={outcome}
          onClaim={claimAndContinue}
          onSpinAgain={() => {
            claimAndContinue()
            window.setTimeout(() => startSpin(), 250)
          }}
          onViewWallet={() => {
            claimAndContinue()
          }}
        />
      ) : null}

      {howOpen ? <HowItWorksModal onClose={() => setHowOpen(false)} /> : null}
      {oddsOpen ? <OddsModal onClose={() => setOddsOpen(false)} /> : null}
      {introOpen ? <PrizeSpinIntroSheet onClose={() => setIntroOpen(false)} /> : null}

      {jackpotFlash ? <CinematicJackpotFlash /> : null}
    </div>,
    document.body,
  )
}

/* ============================== Sub-components ============================== */

function FloatingParticles() {
  const particles = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const seed = i + 1
    const r = (n: number) => {
      const x = Math.sin(seed * 9301 + n * 49297) * 10000
      return x - Math.floor(x)
    }
    return {
      id: i,
      left: `${(r(1) * 100).toFixed(2)}%`,
      delay: r(2) * 6,
      duration: 8 + r(3) * 6,
      size: 4 + Math.floor(r(4) * 6),
    }
  }), [])
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="fetch-pokies-particle absolute rounded-full bg-[#a78bfa]/55"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `-${p.delay}s`,
          }}
        />
      ))}
    </span>
  )
}

function JackpotBurst() {
  const palette = ['#fbbf24', '#fde047', '#a78bfa', '#7c3aed', '#ffffff']
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(253,224,71,0.3),transparent_55%)] mix-blend-screen" />
      {Array.from({ length: 36 }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin((i + 1) * 9301 + n * 49297) * 10000
          return x - Math.floor(x)
        }
        return (
          <span
            key={i}
            className="fetch-pokies-jackpot-confetti absolute"
            style={{
              left: `${(r(1) * 100).toFixed(2)}%`,
              top: '-10%',
              width: `${5 + Math.floor(r(2) * 8)}px`,
              height: `${10 + Math.floor(r(3) * 6)}px`,
              background: palette[Math.floor(r(4) * palette.length)],
              borderRadius: r(5) > 0.5 ? '999px' : '2px',
              transform: `rotate(${(r(6) * 360).toFixed(0)}deg)`,
              animationDelay: `${(r(7) * 0.5).toFixed(2)}s`,
            }}
          />
        )
      })}
    </span>
  )
}

/* ============================== Reel machine ============================== */

/** Cell height in pixels — used by reels for translateY calculations. */
const REEL_CELL_PX = 72
/** How many cells we append to each tape per spin (drives the visible roll length). */
const REEL_APPEND_LEN = 24
/** Per-column landing duration in ms; later columns stop later. */
const REEL_DURATIONS = [1700, 2150, 2600] as const
/** Trim the tape down to this size when it grows beyond TRIM_THRESHOLD between spins. */
const REEL_TRIM_KEEP = 60
const REEL_TRIM_THRESHOLD = 180

function pseudoRandom(seed: number, columnIndex: number, i: number): number {
  const x = Math.sin((seed + 1) * 9301 + (columnIndex + 1) * 17 + i * 49297) * 10000
  return x - Math.floor(x)
}

function buildReelInitial(columnIndex: number): RewardId[] {
  // Three random cells so the user sees something on first open.
  const out: RewardId[] = []
  for (let i = 0; i < 3; i += 1) {
    const r = pseudoRandom(0, columnIndex, i)
    out.push(TILE_ORDER[Math.floor(r * TILE_ORDER.length)] ?? TILE_ORDER[0])
  }
  return out
}

function PrizeMachine({
  stage,
  targets,
  spinSeed,
  outcome,
  didWin,
}: {
  stage: SpinStage
  targets: [RewardId, RewardId, RewardId] | null
  spinSeed: number
  outcome: RewardOutcome | null
  didWin: boolean
}) {
  const charging = stage === 'charging'
  const spinning = stage === 'spinning' || charging
  const isReveal = stage === 'reveal'
  const isJackpotReveal = isReveal && outcome?.reward.rarity === 'jackpot'
  return (
    <section
      className={[
        'fetch-pokies-machine relative rounded-[1.4rem] border-[3px] border-[#a855f7]/65 bg-[linear-gradient(180deg,#1b0d2e,#06020c)] p-2.5',
        'shadow-[0_0_30px_rgba(168,85,247,0.55),inset_0_0_24px_rgba(168,85,247,0.3)]',
        spinning ? 'fetch-pokies-machine--spin' : '',
        isReveal && didWin ? 'fetch-pokies-machine--win' : '',
        isJackpotReveal ? 'fetch-pokies-machine--jackpot' : '',
      ].join(' ')}
      aria-live="polite"
    >
      {/* Mascot perched on top of the cabinet — head + body sit above the box,
       * hands rest on the top edge. The PNG is 1024×1024 with empty bottom 42%,
       * so a -58% Y translate puts the hand fingers right at the cabinet's top edge. */}
      <img
        src={mascotPeekUrl}
        alt=""
        style={{ transform: 'translate(-50%, -58%)' }}
        className={[
          'pointer-events-none absolute left-1/2 top-0 z-[8] w-[14rem] max-w-[68%] object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.65)]',
          'fetch-pokies-mascot',
          stage === 'spinning' ? 'fetch-pokies-mascot--excited' : '',
          isReveal && didWin && !isJackpotReveal ? 'fetch-pokies-mascot--cheer' : '',
          isJackpotReveal ? 'fetch-pokies-mascot--shock' : '',
        ].join(' ')}
        draggable={false}
      />

      {/* Cabinet bulbs */}
      <span aria-hidden className="fetch-pokies-bulbs pointer-events-none absolute inset-0 rounded-[1.4rem]" />
      <span
        aria-hidden
        className={[
          'fetch-pokies-cabinet-energy pointer-events-none absolute inset-1 rounded-[1.1rem]',
          spinning ? 'fetch-pokies-cabinet-energy--spin' : '',
          isReveal && didWin ? 'fetch-pokies-cabinet-energy--win' : '',
        ].join(' ')}
      />
      <span aria-hidden className="fetch-pokies-cabinet-sparks pointer-events-none absolute inset-0 rounded-[1.4rem]" />

      <span
        aria-hidden
        className={[
          'fetch-pokies-lever pointer-events-none absolute right-[-1.35rem] top-[18%] z-[7]',
          spinning ? 'fetch-pokies-lever--pull' : '',
        ].join(' ')}
      >
        <span className="fetch-pokies-lever__stem" />
        <span className="fetch-pokies-lever__knob" />
      </span>

      <div className="relative overflow-hidden rounded-[1rem] border-2 border-[#a855f7]/55 bg-[linear-gradient(180deg,#0e0817,#05020b)] p-1.5 shadow-[inset_0_0_16px_rgba(168,85,247,0.35)]">
        <span
          aria-hidden
          className={[
            'fetch-pokies-charge-ring pointer-events-none absolute inset-0 rounded-[1rem]',
            charging ? 'fetch-pokies-charge-ring--active' : '',
          ].join(' ')}
        />

        {/* Three rolling reels — persisted, never remounted, so the icons stay consistent. */}
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((col) => (
            <Reel
              key={col}
              columnIndex={col}
              spinSeed={spinSeed}
              targetId={targets ? targets[col] : null}
              spinning={spinning}
              didWin={didWin && stage === 'reveal'}
              isJackpotWin={isJackpotReveal}
            />
          ))}
        </div>

        {/* Payline overlay across the middle row */}
        <span
          aria-hidden
          className={[
            'fetch-pokies-payline pointer-events-none absolute left-1.5 right-1.5 z-[3] rounded-[0.5rem]',
            isReveal && didWin ? 'fetch-pokies-payline--win' : '',
            isJackpotReveal ? 'fetch-pokies-payline--jackpot' : '',
          ].join(' ')}
          style={{
            top: `calc(0.375rem + ${REEL_CELL_PX}px)`,
            height: `${REEL_CELL_PX}px`,
          }}
        />
      </div>

      {/* Side arrow lights pointing at the payline */}
      <span
        aria-hidden
        className={[
          'fetch-pokies-arrow pointer-events-none absolute -left-2 z-[4] grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[#8b5cf6] text-[12px] text-white shadow-[0_0_18px_rgba(168,85,247,0.9)]',
          isReveal && didWin ? 'fetch-pokies-arrow--win' : '',
        ].join(' ')}
        style={{ top: `calc(50% + 0.5rem)` }}
      >
        ▶
      </span>
      <span
        aria-hidden
        className={[
          'fetch-pokies-arrow pointer-events-none absolute -right-2 z-[4] grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[#8b5cf6] text-[12px] text-white shadow-[0_0_18px_rgba(168,85,247,0.9)]',
          isReveal && didWin ? 'fetch-pokies-arrow--win' : '',
        ].join(' ')}
        style={{ top: `calc(50% + 0.5rem)` }}
      >
        ◀
      </span>

    </section>
  )
}

/**
 * A reel that *persists* across spins. The tape is appended-to per spin and
 * the strip is translated upward to land the per-column target on the middle
 * row. After the spin lands the icons remain in place — the next spin extends
 * the tape and continues the scroll, so the user never sees a snap-back.
 */
function Reel({
  columnIndex,
  spinSeed,
  targetId,
  spinning,
  didWin,
  isJackpotWin,
}: {
  columnIndex: number
  spinSeed: number
  targetId: RewardId | null
  spinning: boolean
  didWin: boolean
  isJackpotWin: boolean
}) {
  /** Tape grows over time; we trim it occasionally to keep memory bounded. */
  const [tape, setTape] = useState<RewardId[]>(() => buildReelInitial(columnIndex))
  /** Index in the tape that should sit on the middle row after the next landing. */
  const [winnerIdx, setWinnerIdx] = useState<number>(1)
  /** Current strip translateY in pixels (negative). */
  const [translateY, setTranslateY] = useState<number>(() => (1 - 1) * REEL_CELL_PX)
  /** Whether the strip should animate (true while a spin is being scrolled). */
  const [animating, setAnimating] = useState(false)
  /** Track the seed we already spun for, so we don't double-trigger on re-renders. */
  const lastSpunSeedRef = useRef<number>(0)
  /** Hold the inline transition string so we can clear it after landing. */
  const duration = REEL_DURATIONS[Math.min(columnIndex, REEL_DURATIONS.length - 1)]

  // Each unique spinSeed (when spinning && targetId is known) triggers exactly
  // one extension of the tape and one transition to the new landing offset.
  useEffect(() => {
    if (!spinning) return
    if (targetId == null) return
    if (lastSpunSeedRef.current === spinSeed) return
    lastSpunSeedRef.current = spinSeed

    setTape((prev) => {
      const filler: RewardId[] = []
      // First, optionally trim if tape is huge — we drop from the front and
      // adjust translateY accordingly so the visible content doesn't move.
      let working = prev
      if (working.length > REEL_TRIM_THRESHOLD) {
        const drop = working.length - REEL_TRIM_KEEP
        working = working.slice(drop)
        // The strip top is now `drop` cells higher; counteract translateY.
        setTranslateY((y) => y + drop * REEL_CELL_PX)
        setWinnerIdx((idx) => idx - drop)
      }
      // Generate `REEL_APPEND_LEN - 2` random fillers, then the target, then
      // one trailing random — so the winner lands on the middle row with a real
      // cell beneath it (otherwise the bottom row of the visible window goes blank).
      for (let i = 0; i < REEL_APPEND_LEN - 2; i += 1) {
        const r = pseudoRandom(spinSeed, columnIndex, working.length + i)
        const idx = Math.floor(r * TILE_ORDER.length)
        let id = TILE_ORDER[idx] ?? TILE_ORDER[0]
        // Avoid filler matching the target right next to the landing slot.
        if (id === targetId && i >= REEL_APPEND_LEN - 4) {
          id = TILE_ORDER[(idx + 1) % TILE_ORDER.length] ?? TILE_ORDER[0]
        }
        filler.push(id)
      }
      filler.push(targetId)
      // One trailing filler so the bottom row of the viewport has content.
      {
        const tr = pseudoRandom(spinSeed, columnIndex, working.length + REEL_APPEND_LEN)
        const trIdx = Math.floor(tr * TILE_ORDER.length)
        let trailer = TILE_ORDER[trIdx] ?? TILE_ORDER[0]
        if (trailer === targetId) {
          trailer = TILE_ORDER[(trIdx + 1) % TILE_ORDER.length] ?? TILE_ORDER[0]
        }
        filler.push(trailer)
      }
      const next = [...working, ...filler]
      const newWinnerIdx = next.length - 2
      // Schedule the transition on the next frame so the browser commits the
      // new tape (with translateY unchanged) before transitioning to finalY.
      const finalY = (1 - newWinnerIdx) * REEL_CELL_PX
      setWinnerIdx(newWinnerIdx)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setAnimating(true)
          setTranslateY(finalY)
        })
      })
      return next
    })
  }, [spinning, spinSeed, targetId, columnIndex])

  return (
    <div
      className="fetch-pokies-reel-window relative overflow-hidden rounded-[0.75rem] border border-white/10 bg-[linear-gradient(180deg,#160c22,#05020b)]"
      style={{ height: `${REEL_CELL_PX * 3}px` }}
      aria-label={`Reel ${columnIndex + 1}`}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-6 bg-gradient-to-b from-black/85 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-6 bg-gradient-to-t from-black/85 to-transparent" />

      <div
        className={['fetch-pokies-reel-strip absolute inset-x-0 top-0', animating ? 'fetch-pokies-reel-strip--spin' : ''].join(' ')}
        style={{
          transform: `translateY(${translateY}px)`,
          transition: animating ? `transform ${duration}ms cubic-bezier(0.18, 0.05, 0.05, 1.0)` : 'none',
          willChange: 'transform',
        }}
        onTransitionEnd={() => {
          setAnimating(false)
          playTone('tick')
        }}
      >
        {tape.map((id, i) => (
          <ReelCell
            key={`c${columnIndex}-i${i}-${id}`}
            reward={REWARDS[id]}
            cellHeightPx={REEL_CELL_PX}
            isWinnerSlot={i === winnerIdx}
            highlightWin={i === winnerIdx && didWin}
            isJackpotWin={isJackpotWin && i === winnerIdx}
          />
        ))}
      </div>
    </div>
  )
}

function ReelCell({
  reward,
  cellHeightPx,
  isWinnerSlot,
  highlightWin,
  isJackpotWin,
}: {
  reward: Reward
  cellHeightPx: number
  isWinnerSlot: boolean
  highlightWin: boolean
  isJackpotWin: boolean
}) {
  const isRare = reward.rarity === 'rare' || reward.rarity === 'jackpot'
  return (
    <span
      className={[
        'relative flex w-full flex-col items-center justify-center px-1',
        isWinnerSlot && highlightWin ? 'fetch-pokies-cell--win' : '',
        reward.rarity === 'jackpot' ? 'fetch-pokies-cell--jackpot' : '',
        isRare ? 'fetch-pokies-cell--rare' : '',
        isWinnerSlot && isJackpotWin ? 'fetch-pokies-cell--jackpot-win' : '',
      ].join(' ')}
      style={{ height: `${cellHeightPx}px` }}
    >
      <img
        src={reward.icon}
        alt=""
        className="h-[78%] w-auto object-contain drop-shadow-[0_0_14px_rgba(168,85,247,0.55)]"
        draggable={false}
      />
    </span>
  )
}

/* --------------------- Cinematic banner during reveal --------------------- */

function RevealBanner({ kind, reward }: { kind: 'big' | 'mega' | 'jackpot' | 'miss'; reward: Reward | null }) {
  const text = kind === 'jackpot' ? 'JACKPOT HIT!'
    : kind === 'mega' ? 'MEGA WIN!'
    : kind === 'big' ? 'BIG WIN!'
    : 'TRY AGAIN!'
  const tone = kind === 'jackpot'
    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-zinc-950 ring-amber-200'
    : kind === 'mega'
      ? 'bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-300 text-zinc-950 ring-fuchsia-200'
      : kind === 'big'
        ? 'bg-gradient-to-r from-violet-500 via-violet-400 to-violet-500 text-white ring-violet-200'
        : 'bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 text-zinc-100 ring-zinc-400'
  return (
    <span
      aria-live="polite"
      className={[
        'fetch-pokies-reveal-banner pointer-events-none absolute left-1/2 top-1 z-[7] -translate-x-1/2',
        'rounded-full px-4 py-1.5 text-[14px] font-black uppercase tracking-[0.16em] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)] ring-2',
        tone,
      ].join(' ')}
    >
      {text}
      {reward && kind !== 'miss' ? (
        <span className="ml-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-75">
          · {reward.name}
        </span>
      ) : null}
    </span>
  )
}

/* --------------------- Daily challenge progress row --------------------- */

function DailyChallengeRow({
  progress,
  target,
  onClaim,
}: {
  progress: number
  target: number
  onClaim: () => void
}) {
  const reached = progress >= target
  const overClaimed = progress >= target * 2
  const pct = Math.min(100, (progress / target) * 100)
  return (
    <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
      <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-500/20 text-[14px] ring-1 ring-amber-300/30">
        🗓️
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-black leading-tight text-white">
          Daily challenge: spin {target} times
        </span>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
          <span
            aria-hidden
            className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-violet-400 transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </span>
      {reached && !overClaimed ? (
        <button
          type="button"
          onClick={onClaim}
          className="fetch-pokies-claim-pulse rounded-full bg-emerald-500/35 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-emerald-100 ring-1 ring-emerald-300/40 active:scale-95"
        >
          Claim +3
        </button>
      ) : (
        <span
          className={[
            'rounded-full bg-white/8 px-1.5 py-0.5 text-[9.5px] font-black tabular-nums leading-none ring-1 ring-white/12',
            overClaimed ? 'text-emerald-200' : 'text-white/85',
          ].join(' ')}
        >
          {Math.min(progress, target)}/{target}
        </span>
      )}
    </div>
  )
}

/* --------------------- Full-screen cinematic flash --------------------- */

function CinematicJackpotFlash() {
  return (
    <span aria-hidden className="fetch-pokies-jackpot-flash pointer-events-none absolute inset-0 z-[9999]" />
  )
}

function SpinTierPicker({
  tier,
  onChange,
}: {
  tier: SpinTierId
  onChange: (id: SpinTierId) => void
}) {
  return (
    <div className="mx-auto mt-1.5 w-full max-w-[22rem]">
      <div className="grid grid-cols-4 gap-1.5">
        {TIERS.map((t) => {
          const active = t.id === tier
          const isJackpotTier = t.id === 'jackpot'
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-pressed={active}
              aria-label={`${t.label} spin, ${t.cost} gems`}
              className={[
                'fetch-pokies-tier flex min-w-0 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-center ring-1 transition-transform active:scale-[0.97]',
                active
                  ? isJackpotTier
                    ? 'bg-[#1c1228] text-white ring-[#FFD700]/65 shadow-[0_0_16px_rgba(253,224,71,0.4)]'
                    : 'bg-[#7c3aed] text-white ring-[#a78bfa]/70 shadow-[0_0_16px_rgba(168,85,247,0.45)]'
                  : 'bg-white/8 text-white/75 ring-white/12',
              ].join(' ')}
            >
              <img src={gemIcon} alt="" className="h-4 w-4 object-contain" />
              <span className="text-[12px] font-black tabular-nums">{t.cost}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AutoSpinButton({
  active,
  count,
  onToggle,
}: {
  active: boolean
  count: number
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={[
        'flex w-full flex-row items-center justify-center gap-2 rounded-[1.25rem] px-3 py-2.5 text-[13px] font-black uppercase tracking-[0.08em] ring-1 transition-transform active:scale-[0.98]',
        active
          ? 'bg-gradient-to-b from-red-500 to-red-700 text-white ring-red-300/40 shadow-[0_0_24px_rgba(239,68,68,0.5)]'
          : 'bg-white/10 text-white ring-white/15',
      ].join(' ')}
    >
      {active ? (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-white" aria-hidden />
            Stop
          </span>
          <span className="text-[10px] font-bold text-white/85">Auto spins: {count}</span>
        </>
      ) : (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="fetch-pokies-auto-icon">↻</span>
            Auto
          </span>
          <span className="text-[10px] font-bold text-white/65">tap to start</span>
        </>
      )}
    </button>
  )
}

type EarnTaskStatus = 'locked' | 'earning' | 'claimed'

type EarnTask = {
  id: string
  icon: string
  name: string
  reward: number
  goal: FreeSpinTaskGoal
}

const EARN_TASKS: EarnTask[] = [
  { id: 'watch_live', icon: '📺', name: 'Watch live 5 mins', reward: 1, goal: 'live' },
  { id: 'place_bid', icon: '⚡', name: 'Place a bid today', reward: 1, goal: 'live' },
  { id: 'win_auction', icon: '🏆', name: 'Win an auction', reward: 1, goal: 'live' },
  { id: 'list_item', icon: '🏷️', name: 'List an item', reward: 2, goal: 'list' },
  { id: 'share_live', icon: '↗️', name: 'Share a live', reward: 1, goal: 'live' },
  { id: 'streak', icon: '🔥', name: 'Daily streak', reward: 1, goal: 'streak' },
  { id: 'invite', icon: '🤝', name: 'Invite a friend', reward: 3, goal: 'invite' },
]

const EARN_TASK_STORE_KEY = 'fetchit.pokies.earnTasks.v1'

function loadEarnTaskState(): Record<string, EarnTaskStatus> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(EARN_TASK_STORE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, EarnTaskStatus>
  } catch {
    return {}
  }
}

function saveEarnTaskState(state: Record<string, EarnTaskStatus>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(EARN_TASK_STORE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
}

function FreeSpinsEarnCard({
  freeSpins,
  onClaim,
  onEarn,
}: {
  freeSpins: number
  onClaim: (amount: number, label: string) => void
  onEarn: (goal: FreeSpinTaskGoal) => void
}) {
  const [statuses, setStatuses] = useState<Record<string, EarnTaskStatus>>(() => loadEarnTaskState())
  const [open, setOpen] = useState(false)

  const updateStatus = (id: string, status: EarnTaskStatus) => {
    setStatuses((prev) => {
      const next = { ...prev, [id]: status }
      saveEarnTaskState(next)
      return next
    })
  }

  const counts = useMemo(() => {
    let claimed = 0
    let earning = 0
    for (const t of EARN_TASKS) {
      const s = statuses[t.id]
      if (s === 'claimed') claimed += 1
      else if (s === 'earning') earning += 1
    }
    return { claimed, earning, total: EARN_TASKS.length }
  }, [statuses])

  return (
    <section className="mt-2.5 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-2 py-2 text-left"
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500/20 text-[13px] ring-1 ring-amber-300/30">
            🎟️
          </span>
          <span className="min-w-0">
            <span className="block text-[10.5px] font-black uppercase leading-none tracking-[0.12em] text-white">
              Earn Free Spins
            </span>
            <span className="mt-0.5 block text-[9px] font-bold leading-none text-white/50">
              {counts.earning} ready · {counts.claimed}/{counts.total} done
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-black tabular-nums text-amber-200 ring-1 ring-amber-300/30">
            {freeSpins}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={['text-white/55 transition-transform', open ? 'rotate-180' : ''].join(' ')}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open ? (
        <ul className="grid gap-1 border-t border-white/10 p-1.5">
          {EARN_TASKS.map((t) => {
          const status: EarnTaskStatus = statuses[t.id] ?? 'locked'
          return (
            <li
              key={t.id}
              className="flex items-center gap-1.5 rounded-lg bg-white/4 px-1.5 py-1 ring-1 ring-white/8"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-[12px]">
                {t.icon}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[11px] font-black text-white">{t.name}</span>
                <span className="block text-[8.5px] font-bold uppercase tracking-[0.1em] text-white/55">
                  +{t.reward} free spin{t.reward === 1 ? '' : 's'}
                </span>
              </span>
              {status === 'claimed' ? (
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/30"
                  aria-label="Claimed"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : status === 'earning' ? (
                <button
                  type="button"
                  onClick={() => {
                    updateStatus(t.id, 'claimed')
                    onClaim(t.reward, t.name)
                  }}
                  className="fetch-pokies-claim-pulse rounded-full bg-emerald-500/30 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-emerald-100 ring-1 ring-emerald-300/40"
                >
                  Claim
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    updateStatus(t.id, 'earning')
                    onEarn(t.goal)
                  }}
                  aria-label={`Earn ${t.name}`}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-500/30 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-[0.08em] text-violet-100 ring-1 ring-violet-300/30 active:scale-95"
                >
                  Earn
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M9 5l7 7-7 7-1.4-1.4L13.2 12 7.6 6.4 9 5z" />
                  </svg>
                </button>
              )}
            </li>
          )
          })}
        </ul>
      ) : null}
    </section>
  )
}

function GemPack({
  amount,
  price,
  image,
  popular,
  bonus,
  best,
  onBuy,
}: {
  amount: number
  price: string
  image: string
  popular?: boolean
  bonus?: boolean
  best?: boolean
  onBuy: () => void
}) {
  const tag = popular ? 'Popular' : bonus ? 'Bonus' : best ? 'Best' : null
  const tagColor = popular ? 'bg-[#FFD600] text-zinc-950' : bonus ? 'bg-violet-300 text-violet-950' : best ? 'bg-emerald-400 text-zinc-950' : ''
  return (
    <button
      type="button"
      onClick={onBuy}
      className="fetch-pokies-gem-pack relative flex min-w-0 flex-col items-center overflow-hidden rounded-xl bg-white/6 px-1 pb-1 pt-2 ring-1 ring-white/12 transition-transform active:scale-[0.98]"
    >
      {tag ? (
        <span
          className={[
            'absolute top-0 rounded-b-md px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-[0.06em]',
            tagColor,
            popular ? 'fetch-pokies-tag-pulse' : '',
          ].join(' ')}
        >
          {tag}
        </span>
      ) : null}
      <img src={image} alt="" className="h-8 w-8 object-contain drop-shadow-[0_0_14px_rgba(168,85,247,0.6)]" draggable={false} />
      <span className="mt-0.5 text-[13px] font-black tabular-nums leading-none text-white">{amount.toLocaleString('en-AU')}</span>
      <span className="text-[7.5px] font-bold uppercase tracking-[0.06em] text-white/55">Gems</span>
      <span className="mt-1 rounded-lg bg-gradient-to-b from-[#a855f7] to-[#7c3aed] px-1.5 py-1 text-[9px] font-black text-white shadow-[0_6px_14px_-8px_rgba(168,85,247,0.8)]">
        {price}
      </span>
    </button>
  )
}

function WinModal({
  outcome,
  onClaim,
  onSpinAgain,
  onViewWallet,
}: {
  outcome: RewardOutcome
  onClaim: () => void
  onSpinAgain: () => void
  onViewWallet: () => void
}) {
  const isJackpot = outcome.reward.rarity === 'jackpot'
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#05020b]/80 backdrop-blur-[3px] px-6"
      role="dialog"
      aria-modal="true"
      aria-label={isJackpot ? 'Jackpot won' : `${outcome.reward.name} won`}
    >
      <div className={[
        'relative w-full max-w-[20rem] rounded-3xl border border-white/15 p-5 text-center text-white shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]',
        isJackpot
          ? 'bg-gradient-to-b from-[#3b1d6b] via-[#1c1228] to-[#05020b] fetch-pokies-win-shake'
          : 'bg-[#1c1228]',
      ].join(' ')}>
        {isJackpot ? <JackpotBurst /> : null}
        <p className={[
          'text-[11px] font-black uppercase tracking-[0.22em]',
          isJackpot ? 'text-amber-300' : 'text-violet-300',
        ].join(' ')}>
          {isJackpot ? 'Jackpot Hit!' : 'You Won'}
        </p>
        <div className={[
          'fetch-pokies-win-icon mx-auto my-2 grid h-24 w-24 place-items-center rounded-full ring-2',
          isJackpot ? 'bg-amber-500/20 ring-amber-300/45' : 'bg-violet-500/15 ring-violet-300/35',
        ].join(' ')}>
          <img src={outcome.reward.icon} alt="" className="h-20 w-20 object-contain" draggable={false} />
        </div>
        <p className="text-[20px] font-black tracking-tight">{outcome.reward.name}</p>
        <p className="mt-0.5 text-[14px] font-bold text-white/85">{outcome.valueLabel}</p>
        <p className="mt-1 text-[11.5px] font-medium leading-snug text-white/60">
          {outcome.reward.benefit}
        </p>
        <p className="mt-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200 ring-1 ring-emerald-400/30">
          Added to wallet
        </p>
        <div className="mt-3 grid gap-1.5">
          <button
            type="button"
            onClick={onClaim}
            className="rounded-full bg-gradient-to-b from-[#a855f7] to-[#7c3aed] py-2.5 text-[13px] font-black uppercase tracking-[0.08em] text-white"
          >
            Claim
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onSpinAgain}
              className="rounded-full bg-white/10 py-2 text-[11.5px] font-black uppercase tracking-[0.08em] text-white ring-1 ring-white/15"
            >
              Spin again
            </button>
            <button
              type="button"
              onClick={onViewWallet}
              className="rounded-full bg-white/10 py-2 text-[11.5px] font-black uppercase tracking-[0.08em] text-white ring-1 ring-white/15"
            >
              View wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-[#05020b]/80 backdrop-blur-[3px] px-6"
      role="dialog"
      aria-modal="true"
      aria-label="How Prize Spin works"
    >
      <div className="relative w-full max-w-[20rem] rounded-3xl bg-[#1c1228] p-4 text-white ring-1 ring-white/12">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">How it works</p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full bg-white/8 ring-1 ring-white/12">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <h3 className="mt-1 text-[18px] font-black tracking-tight">Earn rewards every spin</h3>
        <ol className="mt-2 grid gap-1.5 text-[12px] font-medium text-white/85">
          {[
            'Earn or buy gems',
            'Use gems or free spins to play',
            'Match a tile to win an app reward',
            'Rewards go straight to your wallet',
            'No cash value — for in-app perks only',
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-500/30 text-[11px] font-black text-violet-100 ring-1 ring-violet-300/30">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[10.5px] font-medium leading-snug text-white/55">
          Gems and free spins are used for in-app rewards only. No real money gambling. Rewards have no
          cash value.
        </p>
      </div>
    </div>
  )
}

function PrizeSpinIntroSheet({ onClose }: { onClose: () => void }) {
  const gifts = [
    { icon: gemIcon, label: 'Gems' },
    { icon: bidBoostIcon, label: 'Bid boosts' },
    { icon: freeShippingIcon, label: 'Shipping' },
    { icon: vipPassIcon, label: 'VIP' },
    { icon: jackpotIcon, label: 'Jackpot' },
  ]
  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/45 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Prize Spin info"
      onClick={onClose}
    >
      <div
        className="fetch-pokies-intro-sheet relative w-full max-w-[24rem] overflow-hidden rounded-[1.65rem] border border-white/15 bg-[linear-gradient(180deg,#2a1450,#12071f)] p-4 text-white shadow-[0_-22px_54px_-24px_rgba(168,85,247,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-8 -top-14 h-28 rounded-full bg-violet-400/35 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <img src={gemIcon} alt="" className="h-8 w-8 object-contain" draggable={false} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Prize Spin</p>
            <h2 className="mt-0.5 text-[21px] font-black leading-none tracking-tight">Spin for app gifts</h2>
            <p className="mt-1 text-[12px] font-medium leading-snug text-white/65">
              Use gems or free spins. Match 3 icons to send rewards straight to your wallet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close info"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 ring-1 ring-white/12 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-1.5">
          {[
            ['1', 'Pick a gem amount'],
            ['2', 'Spin the reels'],
            ['3', 'Claim app rewards'],
          ].map(([n, label]) => (
            <span key={n} className="rounded-2xl bg-white/7 px-2 py-2 ring-1 ring-white/10">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-500/35 text-[11px] font-black text-violet-50 ring-1 ring-violet-300/25">
                {n}
              </span>
              <span className="mt-1 block text-[10.5px] font-black leading-tight text-white">{label}</span>
            </span>
          ))}
        </div>

        <div className="relative mt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Gifts you can get</p>
          <div className="mt-1.5 grid grid-cols-5 gap-1.5">
            {gifts.map((g) => (
              <span key={g.label} className="flex flex-col items-center justify-center rounded-2xl bg-black/24 p-1.5 ring-1 ring-white/10">
                <img src={g.icon} alt="" className="h-9 w-9 object-contain drop-shadow-[0_0_14px_rgba(168,85,247,0.65)]" draggable={false} />
                <span className="mt-0.5 text-[7.5px] font-black uppercase leading-none tracking-[0.05em] text-white/65">{g.label}</span>
              </span>
            ))}
          </div>
        </div>

        <p className="relative mt-3 rounded-2xl bg-black/20 p-2 text-[10.5px] font-medium leading-snug text-white/55 ring-1 ring-white/8">
          Rewards are in-app perks only. No real-money gambling, no cash value, and some rewards may expire.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="relative mt-3 w-full rounded-2xl bg-gradient-to-b from-[#e879f9] via-[#7c3aed] to-[#4c1d95] py-3 text-[14px] font-black uppercase tracking-[0.1em] text-white shadow-[0_14px_32px_-16px_rgba(168,85,247,0.9),inset_0_2px_0_rgba(255,255,255,0.25)] active:scale-[0.98]"
        >
          Start spinning
        </button>
      </div>
    </div>
  )
}

function OddsModal({ onClose }: { onClose: () => void }) {
  const groups = [
    { rarity: 'common', tone: 'text-violet-200', items: ['Gem', 'Bid Boost', 'Free Spin', 'Free Shipping'] },
    { rarity: 'uncommon', tone: 'text-violet-100', items: ['Mystery Prize', 'Top Bidder', 'Seller Boost'] },
    { rarity: 'rare', tone: 'text-amber-200', items: ['VIP Pass'] },
    { rarity: 'jackpot', tone: 'text-amber-300', items: ['Jackpot bundle'] },
  ] as const
  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-[#05020b]/80 backdrop-blur-[3px] px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Reward info"
    >
      <div className="relative w-full max-w-[20rem] rounded-3xl bg-[#1c1228] p-4 text-white ring-1 ring-white/12">
        <div className="flex items-start justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">Reward info</p>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full bg-white/8 ring-1 ring-white/12">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <h3 className="mt-1 text-[18px] font-black tracking-tight">What you can win</h3>
        <ul className="mt-2 grid gap-1.5 text-[12px] font-medium text-white/85">
          {groups.map((g) => (
            <li key={g.rarity} className="rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
              <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${g.tone}`}>{g.rarity}</p>
              <p className="mt-0.5 text-[12px] text-white/85">{g.items.join(' · ')}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10.5px] font-medium leading-snug text-white/55">
          Better tiers improve odds for higher-rarity rewards. No guaranteed wins. Rewards have no cash value.
        </p>
      </div>
    </div>
  )
}
