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
import { PokiesSplash } from './PokiesSplash'
import {
  consumeFreeSpin as consumeFreeSpinAction,
  expirePerksIfDue,
  extendSellerBoost,
  extendTopBidder,
  extendVip,
  grantBidBoosts,
  grantFreeSpins,
  grantGems,
  grantShippingCredits,
  purchaseGemPack,
  recordJackpotHit,
  spendGems,
  useFreeSpins,
  useGemBalance,
  useIsVipActive,
} from '../../lib/data'
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

const ONE_HOUR_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * ONE_HOUR_MS

/* -------------------------- Reward definitions -------------------------- */

const REWARDS: Record<RewardId, Reward> = {
  gem: {
    id: 'gem',
    name: 'Gem',
    icon: gemIcon,
    rarity: 'common',
    description: 'Adds gems to your spin balance.',
    benefit: 'Spend on more spins to chase bigger rewards.',
  },
  bidBoost: {
    id: 'bidBoost',
    name: 'Bid Boost',
    icon: bidBoostIcon,
    rarity: 'common',
    description: 'Adds +$1 to your next eligible bid.',
    benefit: 'Toggle in the Bid Slip to outbid rivals by a dollar.',
  },
  freeSpin: {
    id: 'freeSpin',
    name: 'Free Spin',
    icon: fastBidIcon,
    rarity: 'common',
    description: 'A free Prize Spin on the Basic tier.',
    benefit: 'Used automatically before gems on your next basic spin.',
  },
  mysteryPrize: {
    id: 'mysteryPrize',
    name: 'Mystery Prize',
    icon: mysteryPrizeIcon,
    rarity: 'uncommon',
    description: 'Open the box to roll a random reward.',
    benefit: 'Skips the mystery counter — you get the real reward right away.',
  },
  topBidder: {
    id: 'topBidder',
    name: 'Top Bidder',
    icon: topBidderIcon,
    rarity: 'uncommon',
    description: 'Wear the Top Bidder crown for 24h.',
    benefit: 'Crown chip shown next to your name in live auctions.',
  },
  freeShipping: {
    id: 'freeShipping',
    name: 'Free Shipping',
    icon: freeShippingIcon,
    rarity: 'common',
    description: 'Adds 1 free-shipping credit to your wallet.',
    benefit: 'Auto-applies to your next won auction.',
  },
  sellerBoost: {
    id: 'sellerBoost',
    name: 'Seller Boost',
    icon: sellerBoostIcon,
    rarity: 'uncommon',
    description: '30-minute window where new listings publish boosted.',
    benefit: 'Boosted listings show a flame badge in feeds.',
  },
  vipPass: {
    id: 'vipPass',
    name: 'VIP Pass',
    icon: vipPassIcon,
    rarity: 'rare',
    description: 'VIP status for 24h.',
    benefit: 'Better Prize Spin odds while active. VIP pill in the header.',
  },
  jackpot: {
    id: 'jackpot',
    name: 'Jackpot',
    icon: jackpotIcon,
    rarity: 'jackpot',
    description: 'Mega bundle: +250 gems, +5 free spins, 24h VIP.',
    benefit: 'Stacks every effect at once — huge boost to your account.',
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

/* -------------------------- Persistence helper -------------------------- */

const SELECTED_TIER_KEY = 'fetchit.pokies.selectedTier.v1'

function loadSelectedTier(): SpinTierId {
  if (typeof window === 'undefined') return 'basic'
  try {
    const raw = localStorage.getItem(SELECTED_TIER_KEY)
    if (raw === 'mini' || raw === 'basic' || raw === 'boost' || raw === 'jackpot') return raw
    return 'basic'
  } catch {
    return 'basic'
  }
}

function saveSelectedTier(id: SpinTierId): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SELECTED_TIER_KEY, id)
  } catch {
    /* ignore */
  }
}

/* -------------------------- Reward picking ------------------------------ */

/**
 * VIP buff: bumps weights on premium rewards (vipPass, jackpot, sellerBoost)
 * by 1.4 and trims gem by 0.6 to make Prize Spin more rewarding while VIP
 * is active. Applied multiplicatively to the tier's base weights.
 */
function tierWeightsForUser(tier: SpinTier, vipActive: boolean): Record<RewardId, number> {
  if (!vipActive) return tier.weights
  const out: Record<RewardId, number> = { ...tier.weights }
  out.vipPass = Math.round((out.vipPass ?? 0) * 1.4)
  out.jackpot = Math.round((out.jackpot ?? 0) * 1.4)
  out.sellerBoost = Math.round((out.sellerBoost ?? 0) * 1.4)
  out.gem = Math.max(1, Math.round((out.gem ?? 0) * 0.6))
  return out
}

function pickRewardByTier(tier: SpinTier, vipActive: boolean = false): Reward {
  const weights = tierWeightsForUser(tier, vipActive)
  const total = TILE_ORDER.reduce((sum, id) => sum + (weights[id] ?? 0), 0)
  let r = Math.random() * total
  for (const id of TILE_ORDER) {
    const w = weights[id] ?? 0
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

function playLightningStrike(): void {
  const ctx = getPokiesAudioCtx()
  if (!ctx) return
  try {
    const master = ctx.createGain()
    master.gain.value = 0.32
    master.connect(ctx.destination)
    const now = ctx.currentTime

    // Crack — short noise burst.
    const noiseLen = Math.max(1, Math.floor(0.12 * ctx.sampleRate))
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate)
    const noiseData = noiseBuf.getChannelData(0)
    for (let i = 0; i < noiseLen; i += 1) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 1.6)
    }
    const noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = noiseBuf
    const noiseGain = ctx.createGain()
    noiseGain.gain.value = 0.6
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.value = 1800
    noiseSrc.connect(noiseFilter).connect(noiseGain).connect(master)
    noiseSrc.start(now)
    noiseSrc.stop(now + 0.18)

    const tone = (freq: number, start: number, dur: number, peak: number, type: OscillatorType) => {
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

    // Sub-bass thunder rumble.
    tone(54, 0.05, 0.95, 0.55, 'sine')
    tone(38, 0.1, 1.1, 0.35, 'sine')
    // Electric zap — descending square arpeggio.
    ;[2400, 1800, 1300, 940, 620].forEach((freq, i) => tone(freq, i * 0.02, 0.16, 0.32, 'square'))
    // Bright triangle tail.
    ;[1568, 1976, 2349].forEach((freq, i) => tone(freq, 0.18 + i * 0.04, 0.18, 0.18, 'triangle'))

    window.setTimeout(() => {
      try { master.disconnect() } catch { /* ignore */ }
    }, 1_400)
  } catch {
    /* best effort */
  }
}

function playWinRing(isJackpot = false): void {
  const ctx = getPokiesAudioCtx()
  if (!ctx) return
  try {
    const master = ctx.createGain()
    master.gain.value = isJackpot ? 0.34 : 0.26
    master.connect(ctx.destination)
    const now = ctx.currentTime
    const hit = (freq: number, start: number, dur: number, peak: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      osc.frequency.exponentialRampToValueAtTime(freq * 1.012, now + start + dur)
      gain.gain.setValueAtTime(0.0001, now + start)
      gain.gain.exponentialRampToValueAtTime(peak, now + start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
      osc.connect(gain).connect(master)
      osc.start(now + start)
      osc.stop(now + start + dur + 0.04)
    }
    const bell = isJackpot
      ? [1175, 1568, 2093, 2637, 3136]
      : [988, 1318, 1760, 2349]
    bell.forEach((freq, i) => {
      hit(freq, i * 0.055, 0.42, 0.42 - i * 0.045)
      hit(freq * 2, i * 0.055 + 0.018, 0.18, 0.11)
    })
    // A short tremolo tail makes the win feel like a prize bell is ringing.
    for (let i = 0; i < (isJackpot ? 10 : 7); i += 1) {
      hit(isJackpot ? 2349 : 1760, 0.34 + i * 0.075, 0.08, isJackpot ? 0.13 : 0.09)
    }
    window.setTimeout(() => {
      try { master.disconnect() } catch { /* ignore */ }
    }, isJackpot ? 1_500 : 1_100)
  } catch {
    /* best effort */
  }
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
  // Gem balance and all reward perks now live in the unified store
  // ([src/lib/data/store.ts](src/lib/data/store.ts)) so bidding, checkout,
  // listing, and pokies surfaces all share one source of truth.
  const gemBalance = useGemBalance()
  const freeSpinCount = useFreeSpins()
  const vipActive = useIsVipActive()

  const [selectedTier, setSelectedTier] = useState<SpinTierId>(() => loadSelectedTier())
  const [outOfGemsOpen, setOutOfGemsOpen] = useState(false)
  /** Pending mystery reveal — when set, the win modal is held back until the user opens the box. */
  const [mysteryPending, setMysteryPending] = useState<{ tier: SpinTierId; baseLabel: string } | null>(null)
  const [stage, setStage] = useState<SpinStage>('idle')
  /** Per-column target icons for the next/current reel landing. */
  const [targets, setTargets] = useState<[RewardId, RewardId, RewardId] | null>(null)
  const [spinSeed, setSpinSeed] = useState(0)
  const [outcome, setOutcome] = useState<RewardOutcome | null>(null)
  /** True when the most recent reveal was a 3-of-a-kind win. */
  const [didWin, setDidWin] = useState(false)
  const [missMessage, setMissMessage] = useState<string | null>(null)
  /** Cinematic banner shown over the machine on win/jackpot/miss. */
  const [revealBanner, setRevealBanner] = useState<RevealBannerKind | null>(null)
  /** Streak of consecutive 3-of-a-kind wins; resets on miss. */
  const [streak, setStreak] = useState(0)
  /** Full-screen flash overlay when the jackpot lands. */
  const [jackpotFlash, setJackpotFlash] = useState(false)
  /** True when the reels are landing the lightning trigger (6+ bolts visible). */
  const [lightningTrigger, setLightningTrigger] = useState(false)
  /** 0 normally; 10 when the lightning bonus round is active. Counts down per spin. */
  const [bonusSpinsRemaining, setBonusSpinsRemaining] = useState(0)
  /** Prizes accumulated during the current lightning bonus round. */
  const [bonusHaul, setBonusHaul] = useState<RewardOutcome[]>([])
  /** Summary modal at the end of the bonus round. */
  const [bonusSummaryOpen, setBonusSummaryOpen] = useState(false)
  /** Total bonus spins granted; used for the X/Y indicator. */
  const [bonusSpinsTotal, setBonusSpinsTotal] = useState(0)
  const [autoSpin, setAutoSpin] = useState(false)
  const [autoSpinCount, setAutoSpinCount] = useState(0)
  const [winModalOpen, setWinModalOpen] = useState(false)
  const [oddsOpen, setOddsOpen] = useState(false)
  const [introOpen, setIntroOpen] = useState(false)
  /** True after the entry video has played (or been dismissed). Reset on close. */
  const [splashDone, setSplashDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [floaters, setFloaters] = useState<Array<{ id: string; text: string; tone: 'gem' | 'free' }>>([])

  const tickIntervalRef = useRef<number | null>(null)
  const revealTimeoutRef = useRef<number | null>(null)
  const stageRef = useRef<SpinStage>('idle')
  stageRef.current = stage

  const tier = TIERS.find((t) => t.id === selectedTier) ?? TIERS[1]

  /* -------------------------- Effects: lifecycle ------------------------- */

  useEffect(() => {
    if (!open) {
      // Reset splash so the next open replays the splash from the start.
      setSplashDone(false)
      return
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open || !splashDone) {
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
  }, [open, splashDone])

  useEffect(() => {
    saveSelectedTier(selectedTier)
  }, [selectedTier])

  // Per-minute sweep so VIP / Top Bidder / Seller Boost expiries are cleared
  // while the user sits on the page.
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => expirePerksIfDue(), 60_000)
    expirePerksIfDue()
    return () => window.clearInterval(id)
  }, [open])

  useEffect(() => {
    return () => {
      if (tickIntervalRef.current != null) window.clearInterval(tickIntervalRef.current)
      if (revealTimeoutRef.current != null) window.clearTimeout(revealTimeoutRef.current)
    }
  }, [])

  /* ---------------------------- Spin pipeline --------------------------- */

  const willUseFreeSpin = tier.freeSpinEligible && freeSpinCount > 0
  const canSpin = willUseFreeSpin || gemBalance >= tier.cost

  const consumeSpinCost = useCallback((): boolean => {
    if (willUseFreeSpin) {
      return consumeFreeSpinAction()
    }
    if (gemBalance < tier.cost) return false
    return spendGems(tier.cost, `Prize Spin · ${tier.label}`)
  }, [willUseFreeSpin, gemBalance, tier.cost, tier.label])

  const applyRewardEffect = useCallback((eff: RewardEffect, valueLabel: string): void => {
    switch (eff.type) {
      case 'gems':
        grantGems(eff.amount, `Prize Spin · +${eff.amount} gems`)
        pushFloater(valueLabel, 'gem')
        break
      case 'bidBoostsCount':
        grantBidBoosts(eff.amount)
        break
      case 'freeSpins':
        grantFreeSpins(eff.amount)
        pushFloater(`+${eff.amount} free spin${eff.amount === 1 ? '' : 's'}`, 'free')
        break
      case 'mystery':
        // Mystery is resolved via the OpenMysteryBox sheet — startSpin sets
        // mysteryPending so the user gets a real prize on tap, instead of an
        // unread counter.
        break
      case 'topBidderMinutes':
        extendTopBidder(eff.durationMinutes * 60_000)
        break
      case 'shippingCreditsCount':
        grantShippingCredits(eff.amount)
        break
      case 'sellerBoostMinutes':
        extendSellerBoost(eff.durationMinutes * 60_000)
        break
      case 'vipMinutes':
        extendVip(eff.durationMinutes * 60_000)
        break
      case 'jackpot':
        grantGems(250, 'Prize Spin · Jackpot gems')
        grantFreeSpins(5)
        extendVip(ONE_DAY_MS)
        recordJackpotHit()
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
    const isBonusSpin = bonusSpinsRemaining > 0
    if (!isBonusSpin) {
      if (!canSpin) {
        // Out of gems and free spins → raise the paywall sheet instead of
        // showing a dead-end error.
        setOutOfGemsOpen(true)
        return
      }
      if (!consumeSpinCost()) {
        setOutOfGemsOpen(true)
        return
      }
    }

    // 1 in 10 chance per regular spin to fire the lightning trigger.
    const isTrigger = !isBonusSpin && Math.random() < 0.1
    // Bonus spins: 60% win chance with jackpot-tier weights so prizes feel premium.
    const bonusTier = TIERS.find((t) => t.id === 'jackpot') ?? TIERS[3]
    const willWin = isTrigger ? false : Math.random() < (isBonusSpin ? 0.6 : WIN_CHANCE)
    let nextTargets: [RewardId, RewardId, RewardId]
    let baseOutcome: RewardOutcome | null = null
    if (isTrigger) {
      // Force all three columns to land on the lightning bolt; the reel
      // surrounds the winner with bidBoost cells so 6+ bolts are visible.
      nextTargets = ['bidBoost', 'bidBoost', 'bidBoost']
    } else if (willWin) {
      const activeTier = isBonusSpin ? bonusTier : tier
      const reward = pickRewardByTier(activeTier, vipActive)
      nextTargets = [reward.id, reward.id, reward.id]
      baseOutcome = rewardOutcome(reward, activeTier.id)
    } else {
      const pool = [...TILE_ORDER]
      // During bonus rounds, exclude lightning from miss patterns so users see
      // varied near-misses and never confuse a miss with another trigger.
      const usable = isBonusSpin ? pool.filter((p) => p !== 'bidBoost') : pool
      const a = usable.splice(Math.floor(Math.random() * usable.length), 1)[0]
      const b = usable.splice(Math.floor(Math.random() * usable.length), 1)[0]
      const c = usable.splice(Math.floor(Math.random() * usable.length), 1)[0]
      nextTargets = [a, b, c]
    }
    playTone('lever')
    setStage('charging')
    setOutcome(null)
    setDidWin(false)
    setLightningTrigger(isTrigger)
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
        if (isTrigger) {
          // Activate the 10-spin lightning bonus round.
          playLightningStrike()
          playTone('win-jackpot')
          playWinRing(true)
          setRevealBanner('lightningTrigger')
          setBonusSpinsRemaining(10)
          setBonusSpinsTotal(10)
          setBonusHaul([])
          setStreak(0)
          window.setTimeout(() => {
            setRevealBanner(null)
            setStage('idle')
            setLightningTrigger(false)
          }, 2_400)
        } else if (baseOutcome) {
          // Streak only counts for regular spins so multipliers don't snowball
          // unrealistically inside the bonus round.
          const newStreak = isBonusSpin ? 0 : streak + 1
          const mult = isBonusSpin ? 1 : Math.min(newStreak, 5)
          const finalOutcome = applyMultiplier(baseOutcome, mult)
          if (!isBonusSpin) setStreak(newStreak)
          setOutcome(finalOutcome)
          setDidWin(true)
          applyRewardEffect(finalOutcome.effect, finalOutcome.valueLabel)
          playWinSoundFor(finalOutcome.reward.id)
          playWinRing(finalOutcome.reward.rarity === 'jackpot')
          const r = finalOutcome.reward.rarity
          setRevealBanner(r === 'jackpot' ? 'jackpot' : r === 'rare' ? 'mega' : 'big')
          if (r === 'jackpot' && !isBonusSpin) {
            setJackpotFlash(true)
            window.setTimeout(() => setJackpotFlash(false), 1_200)
          }
          if (isBonusSpin) {
            // Stash the prize for the summary; auto-advance to the next bonus spin.
            setBonusHaul((h) => [...h, finalOutcome])
            window.setTimeout(() => {
              setBonusSpinsRemaining((n) => {
                const next = Math.max(0, n - 1)
                if (next === 0) setBonusSummaryOpen(true)
                return next
              })
              setRevealBanner(null)
              setStage('idle')
              setOutcome(null)
              setDidWin(false)
            }, 1_400)
          } else if (finalOutcome.reward.id === 'mysteryPrize') {
            // Hold the modal back until the user opens the box.
            setMysteryPending({ tier: tier.id, baseLabel: finalOutcome.valueLabel })
          } else {
            window.setTimeout(() => setWinModalOpen(true), 580)
          }
        } else {
          playTone('win-miss')
          if (!isBonusSpin) setStreak(0)
          setRevealBanner('miss')
          setMissMessage(isBonusSpin ? 'No match — keep going!' : 'So close! Try again.')
          window.setTimeout(() => {
            setMissMessage(null)
            setRevealBanner(null)
            setStage('idle')
            if (isBonusSpin) {
              setBonusSpinsRemaining((n) => {
                const next = Math.max(0, n - 1)
                if (next === 0) setBonusSummaryOpen(true)
                return next
              })
            }
          }, 1_300)
        }
      }, REEL_DURATIONS[REEL_DURATIONS.length - 1] + 120)
    }, 600)
  }, [canSpin, consumeSpinCost, tier, applyRewardEffect, streak, bonusSpinsRemaining, vipActive])

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

  const closeBonusSummary = useCallback(() => {
    setBonusSummaryOpen(false)
    setBonusHaul([])
    setBonusSpinsTotal(0)
  }, [])

  const openMystery = useCallback(() => {
    if (!mysteryPending) return
    const tierForReveal = TIERS.find((t) => t.id === mysteryPending.tier) ?? tier
    // Re-roll, excluding mystery itself so we never recurse.
    let nested = pickRewardByTier(tierForReveal, vipActive)
    if (nested.id === 'mysteryPrize') nested = REWARDS.gem
    const nestedOutcome = rewardOutcome(nested, tierForReveal.id)
    applyRewardEffect(nestedOutcome.effect, nestedOutcome.valueLabel)
    playWinSoundFor(nested.id)
    setOutcome(nestedOutcome)
    setMysteryPending(null)
    setWinModalOpen(true)
  }, [mysteryPending, tier, vipActive, applyRewardEffect])

  /** Handler used by the mock-IAP gem packs in the OutOfGemsSheet and gem-shop CTA. */
  const buyGemPack = useCallback((amount: number, priceLabel: string) => {
    playTone('buy')
    purchaseGemPack({
      amount,
      priceLabel,
      description: `Bought ${amount.toLocaleString('en-AU')} gems · ${priceLabel}`,
    })
    setOutOfGemsOpen(false)
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
  const bonusActive = bonusSpinsRemaining > 0
  const lightningMode = lightningTrigger || bonusActive
  const bonusSpinIndex = bonusActive ? bonusSpinsTotal - bonusSpinsRemaining + 1 : 0

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
      {lightningMode ? <LightningStormBackdrop intensity={lightningTrigger ? 'trigger' : 'bonus'} /> : null}

      <header className="relative z-[3] flex shrink-0 items-center justify-between px-2.5 pt-[max(0.45rem,env(safe-area-inset-top,0px))] pb-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOutOfGemsOpen(true)}
            className="fetch-pokies-header-glass flex items-center gap-1 rounded-full px-1.5 py-0.5 active:scale-95"
            aria-label={`${gemBalance} gems · tap to buy more`}
          >
            <img src={gemIcon} alt="" className="h-4 w-4 object-contain" draggable={false} />
            <span className="text-[12px] font-black tabular-nums">{gemBalance.toLocaleString('en-AU')}</span>
            <span className="fetch-pokies-header-glass-inner grid h-4 w-4 place-items-center rounded-full text-[12px] font-black leading-none">
              +
            </span>
          </button>
          <div
            className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 ring-1 ring-amber-300/30"
            aria-label={`${freeSpinCount} free spins`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-amber-300">
              <path d="M19 4H5a2 2 0 0 0-2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4V6a2 2 0 0 0-2-2zm-7 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm0-4a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            <span className="text-[12px] font-black tabular-nums text-amber-200">{freeSpinCount}</span>
          </div>
          {vipActive ? (
            <span
              aria-label="VIP active"
              className="flex items-center gap-1 rounded-full bg-amber-300/20 px-1.5 py-0.5 ring-1 ring-amber-300/45 text-amber-100"
            >
              <span aria-hidden className="text-[11px] leading-none">👑</span>
              <span className="text-[10px] font-black uppercase tracking-[0.12em]">VIP</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIntroOpen(true)}
            aria-label="How it works"
            className="fetch-pokies-header-glass grid h-7 w-7 place-items-center rounded-full active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14a4 4 0 0 0-4 4h2a2 2 0 0 1 4 0c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setOddsOpen(true)}
            aria-label="Odds info"
            className="fetch-pokies-header-glass grid h-7 w-7 place-items-center rounded-full active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8 17H6v-7h2v7zm5 0h-2V7h2v10zm5 0h-2v-4h2v4z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prize spin"
            className="fetch-pokies-header-glass grid h-7 w-7 place-items-center rounded-full text-white active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <main className="relative z-[2] min-h-0 flex-1 overflow-hidden px-4 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))]">
        {/* Top space reserved so the perched mascot has room above the cabinet. */}
        <div className="relative mt-[7.25rem]">
          <PrizeMachine
            stage={stage}
            targets={targets}
            spinSeed={spinSeed}
            outcome={outcome}
            didWin={didWin}
            lightningMode={lightningMode}
            lightningTrigger={lightningTrigger}
            bonusActive={bonusActive}
            bonusSpinIndex={bonusSpinIndex}
            bonusSpinsTotal={bonusSpinsTotal}
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

        <div className="mx-auto mt-1.5 flex w-full max-w-[22rem] flex-col gap-1.5">
          <button
            type="button"
            onClick={startSpin}
            disabled={spinning}
            className={[
              'fetch-pokies-spin-btn flex w-full items-center justify-center rounded-[1.25rem] border py-2.5 text-white shadow-[0_0_34px_rgba(168,85,247,0.75),inset_0_2px_0_rgba(255,255,255,0.28)] active:scale-[0.98] disabled:opacity-70',
              bonusActive
                ? 'border-amber-200/65 bg-gradient-to-b from-yellow-300 via-amber-400 to-violet-600 text-zinc-950'
                : 'border-white/35 bg-gradient-to-b from-[#e879f9] via-[#7c3aed] to-[#4c1d95]',
              spinning ? 'fetch-pokies-spin-btn--charging' : '',
            ].join(' ')}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <span className="text-[24px] font-black uppercase leading-none tracking-[0.02em]">
                {bonusActive ? '⚡ Spin' : willUseFreeSpin ? 'Spin' : canSpin ? 'Spin' : 'Get'}
              </span>
              <span className={[
                'flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-black',
                bonusActive
                  ? 'bg-black/30 text-amber-100 ring-1 ring-amber-200/40'
                  : willUseFreeSpin ? 'bg-amber-500/30 text-amber-100 ring-1 ring-amber-300/40'
                    : 'bg-black/22 text-white ring-1 ring-white/15',
              ].join(' ')}>
                {bonusActive
                  ? `${bonusSpinIndex}/${bonusSpinsTotal}`
                  : willUseFreeSpin
                    ? '1 Free'
                    : canSpin
                      ? <>{tier.cost}<img src={gemIcon} alt="" className="h-4 w-4 object-contain" /></>
                      : 'Gems'}
              </span>
            </span>
          </button>
          {bonusActive ? (
            <p className="text-center text-[10px] font-black uppercase tracking-[0.12em] text-amber-200">
              Free bonus spins · prizes stack
            </p>
          ) : (
            <AutoSpinButton
              active={autoSpin}
              count={autoSpinCount}
              onToggle={() => setAutoSpin((v) => !v)}
            />
          )}
        </div>

        {bonusActive ? null : (
          <p className="mt-0.5 text-center text-[10px] font-bold text-white/50">
            Auto uses free spins first
          </p>
        )}

        <div className={bonusActive ? 'pointer-events-none opacity-50' : ''}>
          <SpinTierPicker tier={selectedTier} onChange={setSelectedTier} />
        </div>

        <FreeSpinsEarnCard
          freeSpins={freeSpinCount}
          onClaim={(amount, label) => {
            grantFreeSpins(amount)
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

        <button
          type="button"
          onClick={() => setOutOfGemsOpen(true)}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#a855f7] via-[#7c3aed] to-[#4c1d95] px-4 py-2 text-[12px] font-black uppercase tracking-[0.1em] text-white shadow-[0_12px_28px_-12px_rgba(168,85,247,0.85)] active:scale-[0.98]"
        >
          <img src={gemIcon} alt="" className="h-4 w-4 object-contain" />
          Get more gems
        </button>

        <p className="mt-1.5 px-1 text-[9.5px] font-medium leading-snug text-white/55">
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

      {oddsOpen ? <OddsModal onClose={() => setOddsOpen(false)} /> : null}
      {introOpen ? <PrizeSpinIntroSheet onClose={() => setIntroOpen(false)} /> : null}
      {bonusSummaryOpen ? (
        <BonusSummaryModal haul={bonusHaul} totalSpins={bonusSpinsTotal} onClose={closeBonusSummary} />
      ) : null}
      {outOfGemsOpen ? (
        <OutOfGemsSheet
          gemBalance={gemBalance}
          freeSpins={freeSpinCount}
          onBuy={buyGemPack}
          onClose={() => setOutOfGemsOpen(false)}
        />
      ) : null}
      {mysteryPending ? (
        <OpenMysteryBoxSheet onOpen={openMystery} />
      ) : null}

      {jackpotFlash ? <CinematicJackpotFlash /> : null}

      {!splashDone ? <PokiesSplash onDone={() => setSplashDone(true)} /> : null}
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

function LightningStormBackdrop({ intensity }: { intensity: 'trigger' | 'bonus' }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      <span
        className={[
          'fetch-pokies-storm-sky absolute inset-0',
          intensity === 'trigger' ? 'fetch-pokies-storm-sky--trigger' : 'fetch-pokies-storm-sky--bonus',
        ].join(' ')}
      />
      <span className="fetch-pokies-storm-flash absolute inset-0" />
    </span>
  )
}

function CabinetLightningStrikes({ intense }: { intense: boolean }) {
  // Two zig-zag bolts striking down across the cabinet face.
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-[6] overflow-hidden rounded-[1.4rem]">
      <svg
        className={['fetch-pokies-bolt fetch-pokies-bolt--a', intense ? 'fetch-pokies-bolt--intense' : ''].join(' ')}
        viewBox="0 0 100 220"
        preserveAspectRatio="none"
        style={{ left: '18%', width: '14%' }}
      >
        <path
          d="M58 0 L36 84 L60 88 L30 220 L78 96 L52 92 L82 0 Z"
          fill="url(#fetchBoltA)"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="fetchBoltA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="55%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <svg
        className={['fetch-pokies-bolt fetch-pokies-bolt--b', intense ? 'fetch-pokies-bolt--intense' : ''].join(' ')}
        viewBox="0 0 100 220"
        preserveAspectRatio="none"
        style={{ right: '18%', width: '14%' }}
      >
        <path
          d="M48 0 L70 80 L42 86 L74 220 L24 100 L52 96 L18 0 Z"
          fill="url(#fetchBoltB)"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="fetchBoltB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
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
const LIGHTNING_REEL_CELL_PX = 46
const BASE_VISIBLE_ROWS = 3
const LIGHTNING_VISIBLE_ROWS = 5
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

function buildReelInitial(columnIndex: number, visibleRows = BASE_VISIBLE_ROWS): RewardId[] {
  // Random cells so the user sees something on first open.
  const out: RewardId[] = []
  for (let i = 0; i < visibleRows; i += 1) {
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
  lightningMode,
  lightningTrigger,
  bonusActive,
  bonusSpinIndex,
  bonusSpinsTotal,
}: {
  stage: SpinStage
  targets: [RewardId, RewardId, RewardId] | null
  spinSeed: number
  outcome: RewardOutcome | null
  didWin: boolean
  lightningMode: boolean
  lightningTrigger: boolean
  bonusActive: boolean
  bonusSpinIndex: number
  bonusSpinsTotal: number
}) {
  const charging = stage === 'charging'
  const spinning = stage === 'spinning' || charging
  const isReveal = stage === 'reveal'
  const isJackpotReveal = isReveal && outcome?.reward.rarity === 'jackpot'
  const visibleRows = lightningMode ? LIGHTNING_VISIBLE_ROWS : BASE_VISIBLE_ROWS
  const reelCellPx = lightningMode ? LIGHTNING_REEL_CELL_PX : REEL_CELL_PX
  const middleRow = Math.floor(visibleRows / 2)
  return (
    <section
      className={[
        'fetch-pokies-machine relative rounded-[1.4rem] border-[3px] border-[#a855f7]/65 bg-[linear-gradient(180deg,#1b0d2e,#06020c)] p-2.5',
        'shadow-[0_0_30px_rgba(168,85,247,0.55),inset_0_0_24px_rgba(168,85,247,0.3)]',
        spinning ? 'fetch-pokies-machine--spin' : '',
        lightningMode ? 'fetch-pokies-machine--lightning' : '',
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
      {lightningMode ? (
        <>
          <CabinetLightningStrikes intense={lightningTrigger} />
          <span
            aria-hidden
            className="fetch-pokies-lightning-label pointer-events-none absolute left-1/2 top-2 z-[8] -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-950"
          >
            {bonusActive
              ? `⚡ Lightning Bonus · ${bonusSpinIndex}/${bonusSpinsTotal}`
              : '⚡ Lightning Mode'}
          </span>
        </>
      ) : null}

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
              visibleRows={visibleRows}
              cellHeightPx={reelCellPx}
              surroundWithLightning={lightningTrigger}
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
            lightningMode ? 'fetch-pokies-payline--lightning' : '',
          ].join(' ')}
          style={{
            top: `calc(0.375rem + ${middleRow * reelCellPx}px)`,
            height: `${reelCellPx}px`,
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
  visibleRows,
  cellHeightPx,
  surroundWithLightning,
}: {
  columnIndex: number
  spinSeed: number
  targetId: RewardId | null
  spinning: boolean
  didWin: boolean
  isJackpotWin: boolean
  visibleRows: number
  cellHeightPx: number
  surroundWithLightning: boolean
}) {
  /** Tape grows over time; we trim it occasionally to keep memory bounded. */
  const [tape, setTape] = useState<RewardId[]>(() => buildReelInitial(columnIndex, visibleRows))
  /** Index in the tape that should sit on the middle row after the next landing. */
  const [winnerIdx, setWinnerIdx] = useState<number>(1)
  /** Current strip translateY in pixels (negative). */
  const [translateY, setTranslateY] = useState<number>(() => 0)
  /** Whether the strip should animate (true while a spin is being scrolled). */
  const [animating, setAnimating] = useState(false)
  /** Track the seed we already spun for, so we don't double-trigger on re-renders. */
  const lastSpunSeedRef = useRef<number>(0)
  /** Hold the inline transition string so we can clear it after landing. */
  const duration = REEL_DURATIONS[Math.min(columnIndex, REEL_DURATIONS.length - 1)]
  const middleRow = Math.floor(visibleRows / 2)
  const trailingRows = Math.max(1, visibleRows - middleRow - 1)

  useEffect(() => {
    setTape((prev) => {
      if (prev.length >= visibleRows) return prev
      const extra: RewardId[] = []
      for (let i = prev.length; i < visibleRows; i += 1) {
        const r = pseudoRandom(0, columnIndex, i)
        extra.push(TILE_ORDER[Math.floor(r * TILE_ORDER.length)] ?? TILE_ORDER[0])
      }
      return [...prev, ...extra]
    })
  }, [columnIndex, visibleRows])

  useEffect(() => {
    if (animating) return
    setTranslateY((middleRow - winnerIdx) * cellHeightPx)
  }, [animating, middleRow, winnerIdx, cellHeightPx])

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
        setTranslateY((y) => y + drop * cellHeightPx)
        setWinnerIdx((idx) => idx - drop)
      }
      // Generate fillers, then the target, then enough trailing randoms so every
      // unlocked row beneath the payline has a real icon.
      const fillerCount = Math.max(6, REEL_APPEND_LEN - 1 - trailingRows)
      // When surroundWithLightning is true, the cells around the winner inside
      // the visible window should also be bidBoost so the user sees lots of
      // lightning bolts at once.
      const surroundCount = surroundWithLightning ? Math.floor((visibleRows - 1) / 2) : 0
      for (let i = 0; i < fillerCount; i += 1) {
        const distanceFromTarget = fillerCount - i
        if (surroundWithLightning && distanceFromTarget <= surroundCount) {
          filler.push('bidBoost')
          continue
        }
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
      for (let t = 0; t < trailingRows; t += 1) {
        if (surroundWithLightning) {
          filler.push('bidBoost')
          continue
        }
        const tr = pseudoRandom(spinSeed, columnIndex, working.length + fillerCount + t + 1)
        const trIdx = Math.floor(tr * TILE_ORDER.length)
        let trailer = TILE_ORDER[trIdx] ?? TILE_ORDER[0]
        if (trailer === targetId) {
          trailer = TILE_ORDER[(trIdx + 1) % TILE_ORDER.length] ?? TILE_ORDER[0]
        }
        filler.push(trailer)
      }
      const next = [...working, ...filler]
      const newWinnerIdx = next.length - trailingRows - 1
      // Schedule the transition on the next frame so the browser commits the
      // new tape (with translateY unchanged) before transitioning to finalY.
      const finalY = (middleRow - newWinnerIdx) * cellHeightPx
      setWinnerIdx(newWinnerIdx)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setAnimating(true)
          setTranslateY(finalY)
        })
      })
      return next
    })
  }, [spinning, spinSeed, targetId, columnIndex, cellHeightPx, middleRow, trailingRows, surroundWithLightning, visibleRows])

  return (
    <div
      className="fetch-pokies-reel-window relative overflow-hidden rounded-[0.75rem] border border-white/10 bg-[linear-gradient(180deg,#160c22,#05020b)]"
      style={{ height: `${cellHeightPx * visibleRows}px` }}
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
            cellHeightPx={cellHeightPx}
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

type RevealBannerKind = 'big' | 'mega' | 'jackpot' | 'miss' | 'lightningTrigger'

function RevealBanner({ kind, reward }: { kind: RevealBannerKind; reward: Reward | null }) {
  const text = kind === 'jackpot' ? 'JACKPOT HIT!'
    : kind === 'mega' ? 'MEGA WIN!'
    : kind === 'big' ? 'BIG WIN!'
    : kind === 'lightningTrigger' ? '⚡ LIGHTNING ROUND!'
    : 'TRY AGAIN!'
  const tone = kind === 'jackpot'
    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-zinc-950 ring-amber-200'
    : kind === 'lightningTrigger'
      ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-violet-500 text-zinc-950 ring-amber-200'
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
      {kind === 'lightningTrigger' ? (
        <span className="ml-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-85">
          · 10 free spins
        </span>
      ) : reward && kind !== 'miss' ? (
        <span className="ml-1 text-[10px] font-black uppercase tracking-[0.12em] opacity-75">
          · {reward.name}
        </span>
      ) : null}
    </span>
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
    <div className="mx-auto mt-1 w-full max-w-[22rem]">
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

function BonusSummaryModal({
  haul,
  totalSpins,
  onClose,
}: {
  haul: RewardOutcome[]
  totalSpins: number
  onClose: () => void
}) {
  const wins = haul.length
  const totalGems = haul.reduce((sum, o) => sum + (o.effect.type === 'gems' ? o.effect.amount : 0), 0)
  const totalFreeSpins = haul.reduce(
    (sum, o) => sum + (o.effect.type === 'freeSpins' ? o.effect.amount : 0),
    0,
  )
  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/65 backdrop-blur-[3px] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Lightning bonus summary"
    >
      <div className="relative w-full max-w-[22rem] overflow-hidden rounded-3xl border border-amber-200/40 bg-gradient-to-b from-[#3b1d6b] via-[#1c1228] to-[#05020b] p-4 text-white shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
        <span aria-hidden className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-amber-300/20 blur-3xl" />
        <p className="relative text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
          ⚡ Lightning Bonus
        </p>
        <h3 className="relative mt-1 text-[20px] font-black tracking-tight">
          {wins > 0 ? `You won ${wins} prize${wins === 1 ? '' : 's'}` : 'Bonus complete'}
        </h3>
        <p className="relative mt-0.5 text-[12px] font-medium text-white/65">
          {totalSpins} spins · {Math.max(0, totalSpins - wins)} miss{wins === totalSpins - 1 || totalSpins - wins === 1 ? '' : 'es'}
        </p>

        <div className="relative mt-3 flex gap-2">
          <span className="flex flex-1 flex-col items-center rounded-2xl bg-white/8 px-2 py-2 ring-1 ring-white/12">
            <img src={gemIcon} alt="" className="h-7 w-7 object-contain" draggable={false} />
            <span className="mt-0.5 text-[14px] font-black tabular-nums">{totalGems.toLocaleString('en-AU')}</span>
            <span className="text-[8.5px] font-black uppercase tracking-[0.1em] text-white/55">Gems</span>
          </span>
          <span className="flex flex-1 flex-col items-center rounded-2xl bg-amber-500/20 px-2 py-2 ring-1 ring-amber-200/40">
            <span aria-hidden className="text-[20px] leading-none">🎟️</span>
            <span className="mt-0.5 text-[14px] font-black tabular-nums text-amber-100">{totalFreeSpins}</span>
            <span className="text-[8.5px] font-black uppercase tracking-[0.1em] text-amber-100/70">Free spins</span>
          </span>
        </div>

        {haul.length > 0 ? (
          <ul className="relative mt-3 max-h-[14rem] grid gap-1 overflow-y-auto pr-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {haul.map((o, i) => (
              <li
                key={`${o.reward.id}-${i}`}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-2 py-1.5 ring-1 ring-white/8"
              >
                <img src={o.reward.icon} alt="" className="h-7 w-7 shrink-0 object-contain" draggable={false} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-black text-white">{o.reward.name}</span>
                  <span className="block text-[10px] font-bold text-white/55">{o.valueLabel}</span>
                </span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-[0.08em] text-emerald-200 ring-1 ring-emerald-300/30">
                  Won
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="relative mt-3 rounded-xl bg-white/5 p-3 text-center text-[12px] font-medium text-white/65 ring-1 ring-white/10">
            No matches this round — try again soon!
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="relative mt-3 w-full rounded-2xl bg-gradient-to-b from-[#fde047] via-[#fbbf24] to-[#a855f7] py-3 text-[14px] font-black uppercase tracking-[0.1em] text-zinc-950 shadow-[0_14px_32px_-16px_rgba(255,214,0,0.85),inset_0_2px_0_rgba(255,255,255,0.45)] active:scale-[0.98]"
        >
          Awesome
        </button>
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

/**
 * Out-of-gems paywall sheet. Raised when the user tries to spin without enough
 * gems and no free spins remaining. Also re-used as the only "Buy gems" surface.
 *
 * Today the gem packs route through a mock IAP via [purchaseGemPack](src/lib/data/store.ts).
 * Swap that for a Stripe / Apple / Google IAP call in a future PR — the call
 * site is structured so the rest of the UI doesn't change.
 */
function OutOfGemsSheet({
  gemBalance,
  freeSpins,
  onBuy,
  onClose,
}: {
  gemBalance: number
  freeSpins: number
  onBuy: (amount: number, priceLabel: string) => void
  onClose: () => void
}) {
  const packs: Array<{
    amount: number
    price: string
    image: string
    tag?: 'Popular' | 'Bonus' | 'Best'
  }> = [
    { amount: 50, price: '$0.99', image: gemIcon },
    { amount: 300, price: '$4.99', image: gemIcon, tag: 'Popular' },
    { amount: 650, price: '$9.99', image: treasureChestIcon, tag: 'Bonus' },
    { amount: 1500, price: '$19.99', image: treasureChestIcon, tag: 'Best' },
  ]
  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/55 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-label="Get more gems"
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
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
              {gemBalance <= 0 && freeSpins <= 0 ? 'Out of gems' : 'Get more gems'}
            </p>
            <h2 className="mt-0.5 text-[20px] font-black leading-none tracking-tight">
              Top up to keep spinning
            </h2>
            <p className="mt-1 text-[12px] font-medium leading-snug text-white/65">
              Real-money packs. Gems unlock spins and rewards. No cash value, no withdrawals.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 ring-1 ring-white/12 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative mt-3 grid grid-cols-2 gap-2">
          {packs.map((p) => {
            const tagColor = p.tag === 'Popular'
              ? 'bg-[#FFD600] text-zinc-950'
              : p.tag === 'Bonus'
                ? 'bg-violet-300 text-violet-950'
                : p.tag === 'Best'
                  ? 'bg-emerald-400 text-zinc-950'
                  : ''
            return (
              <button
                key={p.amount}
                type="button"
                onClick={() => onBuy(p.amount, p.price)}
                className="fetch-pokies-gem-pack relative flex min-w-0 flex-col items-center overflow-hidden rounded-2xl bg-white/8 px-2 pb-2 pt-3 ring-1 ring-white/15 transition-transform active:scale-[0.98]"
              >
                {p.tag ? (
                  <span
                    className={[
                      'absolute top-0 rounded-b-md px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.06em]',
                      tagColor,
                      p.tag === 'Popular' ? 'fetch-pokies-tag-pulse' : '',
                    ].join(' ')}
                  >
                    {p.tag}
                  </span>
                ) : null}
                <img src={p.image} alt="" className="h-10 w-10 object-contain drop-shadow-[0_0_14px_rgba(168,85,247,0.6)]" draggable={false} />
                <span className="mt-1 text-[16px] font-black tabular-nums leading-none text-white">
                  {p.amount.toLocaleString('en-AU')}
                </span>
                <span className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-white/55">Gems</span>
                <span className="mt-1.5 rounded-xl bg-gradient-to-b from-[#a855f7] to-[#7c3aed] px-3 py-1 text-[11px] font-black text-white shadow-[0_8px_18px_-12px_rgba(168,85,247,0.85)]">
                  {p.price}
                </span>
              </button>
            )
          })}
        </div>

        <p className="relative mt-3 rounded-2xl bg-black/25 p-2 text-[10px] font-medium leading-snug text-white/55 ring-1 ring-white/10">
          Real-money purchase. Mock IAP for now — production will route through your platform's in-app billing.
          Rewards from spinning have no cash value and cannot be withdrawn.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="relative mt-2 w-full rounded-full bg-white/8 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white/85 ring-1 ring-white/12 active:scale-[0.98]"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}

/**
 * Mystery box reveal sheet. Shown after a Mystery Prize lands so the user can
 * tap to roll a real reward instead of just bumping a hidden counter.
 */
function OpenMysteryBoxSheet({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/65 backdrop-blur-[3px] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mystery prize"
    >
      <div className="relative w-full max-w-[20rem] overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#2a1450] via-[#1c1228] to-[#05020b] p-5 text-center text-white shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">Mystery prize</p>
        <h3 className="mt-1 text-[22px] font-black tracking-tight">Tap to open</h3>
        <button
          type="button"
          onClick={onOpen}
          className="fetch-pokies-win-icon mx-auto mt-3 grid h-28 w-28 place-items-center rounded-full bg-violet-500/15 ring-2 ring-violet-300/35 transition-transform active:scale-95"
          aria-label="Open mystery prize"
        >
          <img src={mysteryPrizeIcon} alt="" className="h-24 w-24 object-contain" draggable={false} />
        </button>
        <p className="mt-3 text-[12px] font-medium leading-snug text-white/65">
          Could be gems, boosts, free spins, or shipping credit.
        </p>
        <button
          type="button"
          onClick={onOpen}
          className="mt-4 w-full rounded-2xl bg-gradient-to-b from-[#a855f7] to-[#7c3aed] py-3 text-[13px] font-black uppercase tracking-[0.08em] text-white"
        >
          Open mystery box
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
