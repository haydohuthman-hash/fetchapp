/**
 * Mock data + helpers for the Bid Wars "Starting soon" tab and the live battle overlay.
 *
 * Keep this purely client-side for now — swap the accessors for server fetches later.
 */

const ATTENDEE_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&q=80',
]

const BIDDER_AVATARS = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286ad2?w=96&q=80',
]

export type StartingSoonBattle = {
  id: string
  battleNumber: string
  startsInSec: number
  title: string
  subtitle?: string
  estValueCents: number
  imageUrl: string
  attendees: number
  attendeeAvatars: string[]
}

export const STARTING_SOON_BATTLES: StartingSoonBattle[] = [
  {
    id: 'battle_24285',
    battleNumber: '#24285',
    startsInSec: 8,
    title: 'Air Jordan 1',
    subtitle: 'Retro High OG',
    estValueCents: 18000,
    imageUrl:
      'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=720&q=82',
    attendees: 342,
    attendeeAvatars: ATTENDEE_AVATARS,
  },
  {
    id: 'battle_24286',
    battleNumber: '#24286',
    startsInSec: 35,
    title: 'Gucci Marmont Bag',
    estValueCents: 95000,
    imageUrl:
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=480&q=82',
    attendees: 872,
    attendeeAvatars: [],
  },
  {
    id: 'battle_24287',
    battleNumber: '#24287',
    startsInSec: 65,
    title: 'PSA 10 Charizard',
    subtitle: '1st Edition',
    estValueCents: 125000,
    imageUrl:
      'https://images.unsplash.com/photo-1606503153255-59d8b2e4a68b?w=480&q=82',
    attendees: 623,
    attendeeAvatars: [],
  },
  {
    id: 'battle_24288',
    battleNumber: '#24288',
    startsInSec: 95,
    title: 'Rolex Submariner',
    subtitle: 'Date',
    estValueCents: 950000,
    imageUrl:
      'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=480&q=82',
    attendees: 432,
    attendeeAvatars: [],
  },
  {
    id: 'battle_24289',
    battleNumber: '#24289',
    startsInSec: 125,
    title: 'Canon EOS R5',
    subtitle: 'Camera',
    estValueCents: 320000,
    imageUrl:
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=480&q=82',
    attendees: 321,
    attendeeAvatars: [],
  },
]

export type LiveBidder = {
  id: string
  name: string
  handle: string
  avatar: string
  bidCents: number
}

export type LiveBidState = {
  battleNumber: string
  productTitle: string
  productImageUrl: string
  itemEndsInSec: number
  totalWatching: number
  currentBidCents: number
  topBidderId: string
  bidders: LiveBidder[]
  bidIncrementCents: number
}

export function buildInitialLiveBidState(battle: StartingSoonBattle): LiveBidState {
  const bidders: LiveBidder[] = [
    {
      id: 'u_mike',
      name: 'Mike B.',
      handle: '@mike.b',
      avatar: BIDDER_AVATARS[0],
      bidCents: 7200,
    },
    {
      id: 'u_sarah',
      name: 'Sarah M.',
      handle: '@sarah.m',
      avatar: BIDDER_AVATARS[1],
      bidCents: 7500,
    },
    {
      id: 'u_alex',
      name: 'Alex T.',
      handle: '@alex.t',
      avatar: BIDDER_AVATARS[2],
      bidCents: 8000,
    },
    {
      id: 'u_jordan',
      name: 'Jordan K.',
      handle: '@jordan.k',
      avatar: BIDDER_AVATARS[3],
      bidCents: 8500,
    },
  ]
  return {
    battleNumber: battle.battleNumber,
    productTitle: battle.subtitle ? `${battle.title} ${battle.subtitle}` : battle.title,
    productImageUrl: battle.imageUrl,
    itemEndsInSec: 18,
    totalWatching: 1234,
    currentBidCents: 8500,
    topBidderId: 'u_jordan',
    bidders,
    bidIncrementCents: 500,
  }
}

export function formatAudCents(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function formatMmSs(totalSec: number): string {
  const t = Math.max(0, Math.floor(totalSec))
  const mm = Math.floor(t / 60)
  const ss = t % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export function formatCountLabel(n: number): string {
  if (n >= 1000) {
    const k = Math.round((n / 1000) * 10) / 10
    return `${k}K`
  }
  return String(n)
}

/* ─── Pre-battle lobby: chat + user join pool ──────────────────────────── */

export type LobbyChatAuthor = {
  id: string
  name: string
  handle: string
  avatar: string
  /** Purple "PRO" or orange "VIP" badge etc. */
  tagLabel?: string
  tagTone?: 'violet' | 'amber' | 'emerald' | 'rose'
}

export type LobbyChatMessage = {
  id: string
  author: LobbyChatAuthor
  text: string
  at: number
  /** If set, render as a system join notice instead of a normal message. */
  system?: 'join' | 'reminder'
}

const LOBBY_AUTHOR_POOL: LobbyChatAuthor[] = [
  {
    id: 'u_mike',
    name: 'Mike B.',
    handle: '@mike.b',
    avatar: BIDDER_AVATARS[0],
    tagLabel: 'PRO',
    tagTone: 'violet',
  },
  {
    id: 'u_sarah',
    name: 'Sarah M.',
    handle: '@sarah.m',
    avatar: BIDDER_AVATARS[1],
    tagLabel: 'VIP',
    tagTone: 'amber',
  },
  {
    id: 'u_alex',
    name: 'Alex T.',
    handle: '@alex.t',
    avatar: BIDDER_AVATARS[2],
  },
  {
    id: 'u_jordan',
    name: 'Jordan K.',
    handle: '@jordan.k',
    avatar: BIDDER_AVATARS[3],
    tagLabel: 'TOP 10',
    tagTone: 'emerald',
  },
  {
    id: 'u_zara',
    name: 'Zara P.',
    handle: '@zara.p',
    avatar: ATTENDEE_AVATARS[0],
  },
  {
    id: 'u_liam',
    name: 'Liam W.',
    handle: '@liam.w',
    avatar: ATTENDEE_AVATARS[1],
  },
  {
    id: 'u_nova',
    name: 'Nova R.',
    handle: '@nova.r',
    avatar: ATTENDEE_AVATARS[2],
    tagLabel: 'PRO',
    tagTone: 'violet',
  },
  {
    id: 'u_reece',
    name: 'Reece L.',
    handle: '@reece.l',
    avatar: BIDDER_AVATARS[0],
  },
  {
    id: 'u_kai',
    name: 'Kai O.',
    handle: '@kai.o',
    avatar: BIDDER_AVATARS[2],
    tagLabel: 'HYPE',
    tagTone: 'rose',
  },
]

const LOBBY_HYPE_LINES = [
  "LET'S GOOO 🔥🔥🔥",
  'been waiting all week for this one 😤',
  'my wallet is SHAKING',
  "who's ready to throw down 💪",
  'I NEED these so bad 🙏',
  'gonna snipe it at the last sec 👀',
  "don't even think about outbidding me 😂",
  'this one is MINE tonight',
  'fire listing tbh 🔥',
  'someone gas me up rq',
  "i'm here to win fr",
  'GLHF everyone 🫡',
  'showing love from Melbourne 🇦🇺',
  "tell ur friends this is gonna be wild",
  "paypal ready 💸",
  "let's see who blinks first 👁",
  'bid increments going brrrr',
  '5s from go 🚨',
  "let's get itttt",
  "this is the one i've been saving for",
  'I smell a bidding war 😎',
  "the chat's already lit 🔥",
  'fetch battles never miss',
  "good luck to everyone except me 😤",
  'MY PRECIOUSSS',
  'tap in before it starts 🏁',
  "no hesitation, straight to the moon 🚀",
  'if i lose im rage quitting lol',
  "who's got the top bid ego tonight",
  "gonna be tasting victory",
]

const LOBBY_JOIN_LINES = [
  'joined the battle',
  'slid into the lobby',
  'tapped in',
  'showed up',
  'entered the chat',
]

function pickFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Build a small set of "already present" chat messages to seed the lobby. */
export function buildSeedLobbyChat(now = Date.now()): LobbyChatMessage[] {
  const seed: LobbyChatMessage[] = []
  for (let i = 0; i < 6; i++) {
    const author = pickFromArray(LOBBY_AUTHOR_POOL)
    const offsetSec = 50 - i * 7 // newest at end, older above
    const isJoin = i < 2
    seed.push({
      id: `seed_${i}`,
      author,
      text: isJoin ? pickFromArray(LOBBY_JOIN_LINES) : pickFromArray(LOBBY_HYPE_LINES),
      at: now - offsetSec * 1000,
      system: isJoin ? 'join' : undefined,
    })
  }
  return seed
}

/** Generate the next live chat message. Mix of joins and hype lines. */
export function makeLobbyChatMessage(seq: number, now = Date.now()): LobbyChatMessage {
  const author = pickFromArray(LOBBY_AUTHOR_POOL)
  const isJoin = Math.random() < 0.2
  return {
    id: `msg_${seq}_${Math.random().toString(36).slice(2, 7)}`,
    author,
    text: isJoin ? pickFromArray(LOBBY_JOIN_LINES) : pickFromArray(LOBBY_HYPE_LINES),
    at: now,
    system: isJoin ? 'join' : undefined,
  }
}
