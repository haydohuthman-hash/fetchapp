/**
 * Shared visual shell for Fetch rank / streak / weekly reward cards.
 * Glass rim: outer light edge + inset highlights + depth (matches app “premium glass” language).
 */
export const FETCH_REWARD_CARD_SHELL = [
  'relative isolate overflow-hidden rounded-[1.35rem]',
  'bg-[linear-gradient(155deg,#16181d_0%,#0b0c0f_48%,#12141a_100%)]',
  // Glassy edge + glossy top / depth bottom + ambient gold/violet (no flat hairline border)
  'shadow-[0_0_0_1px_rgba(255,255,255,0.16),inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-1px_0_rgba(0,0,0,0.38),0_22px_52px_-26px_rgba(0,0,0,0.92),0_0_48px_-14px_rgba(168,85,247,0.26),0_0_36px_-10px_rgba(251,191,36,0.18)]',
].join(' ')

export const FETCH_REWARD_CARD_GLOSS =
  'pointer-events-none absolute inset-0 rounded-[1.35rem] bg-[radial-gradient(120%_85%_at_15%_-8%,rgba(251,191,36,0.16)_0%,transparent_54%),radial-gradient(95%_72%_at_100%_0%,rgba(168,85,247,0.14)_0%,transparent_50%),linear-gradient(to_bottom,rgba(255,255,255,0.08)_0%,transparent_42%)]'

export const FETCH_REWARD_CARD_VIGNETTE =
  'pointer-events-none absolute inset-x-0 bottom-0 h-[55%] rounded-b-[1.35rem] bg-gradient-to-t from-black/38 to-transparent'
