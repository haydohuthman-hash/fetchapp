import { ChevronDown, User } from 'lucide-react'

/** Account primary actions — neutral grey pills (matches Sign out). */
const GREY_PILL =
  'inline-flex items-center justify-center rounded-full border border-[#E8E8E8] bg-[#F4F4F4] text-[13px] font-bold text-[#111111] transition-opacity active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/40 focus-visible:ring-offset-2'
const GREY_PILL_OUTLINE =
  'inline-flex items-center justify-center rounded-full border border-[#E8E8E8] bg-white text-[13px] font-bold text-[#111111] transition-opacity active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300/40 focus-visible:ring-offset-2'

export type ProfileHeaderProps =
  | {
      variant: 'signedIn'
      initial: string
      username: string
      onViewProfile: () => void
    }
  | {
      variant: 'guest'
      onSignIn: () => void
      onProfileSetup: () => void
    }

/**
 * Whatnot-style account header: avatar, username + chevron, View Profile pill (signed in),
 * or sign-in / profile setup CTAs (guest).
 */
export function ProfileHeader(props: ProfileHeaderProps) {
  if (props.variant === 'guest') {
    return (
      <header className="flex items-start gap-4 px-6 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-6">
        <div
          className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#F2F2F2] text-zinc-700"
          aria-hidden
        >
          <User className="h-9 w-9" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[1.35rem] font-black leading-tight tracking-tight text-[#111111]">Welcome</p>
          <p className="mt-1 max-w-[240px] text-[13px] font-medium leading-snug text-[#777777]">
            Sign in to manage orders, wallet, and profile.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={props.onSignIn}
              className={`${GREY_PILL} min-h-[40px] w-full max-w-[280px] px-5`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={props.onProfileSetup}
              className={`${GREY_PILL_OUTLINE} min-h-[40px] w-full max-w-[280px] px-5`}
            >
              Complete profile setup
            </button>
          </div>
        </div>
      </header>
    )
  }

  const letter = props.initial.trim().slice(0, 1).toLowerCase() || 'u'

  return (
    <header className="flex items-start gap-4 px-6 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-6">
      <div
        className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[1.75rem] font-semibold lowercase text-white"
        aria-hidden
      >
        {letter}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <button
          type="button"
          className="flex max-w-full items-center gap-1 text-left"
          aria-expanded={false}
          aria-label="Account menu"
        >
          <span className="truncate text-[1.35rem] font-black tracking-tight text-[#111111]">{props.username}</span>
          <ChevronDown className="h-5 w-5 shrink-0 text-[#111111]" strokeWidth={2.5} aria-hidden />
        </button>
        <button
          type="button"
          onClick={props.onViewProfile}
          className={`${GREY_PILL} mt-3 min-h-[36px] px-5`}
        >
          View Profile
        </button>
      </div>
    </header>
  )
}
