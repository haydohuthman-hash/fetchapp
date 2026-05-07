import { Crown, Lock, Users } from 'lucide-react'

export type AccountQuickCardsProps = {
  balanceLabel: string
  /** When true, cards are gated (tap opens sign-in). */
  locked?: boolean
  onReferralsClick?: () => void
  onRewardsClick?: () => void
}

/**
 * Two-column quick cards: Referrals & Credits / My Rewards.
 */
export function AccountQuickCards({
  balanceLabel,
  locked = false,
  onReferralsClick,
  onRewardsClick,
}: AccountQuickCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onReferralsClick}
        className="relative flex min-h-[105px] flex-col items-start rounded-[20px] bg-[#F4F4F4] p-4 text-left transition-opacity active:opacity-90"
        aria-label={locked ? 'Referrals and credits, sign in required' : 'Referrals and credits'}
      >
        {locked ? (
          <Lock className="absolute right-3 top-3 h-4 w-4 text-zinc-400" strokeWidth={2.5} aria-hidden />
        ) : null}
        <Users className="h-5 w-5 text-[#111111]" strokeWidth={2} aria-hidden />
        <span className="mt-3 text-[14px] font-black leading-tight text-[#111111]">Referrals &amp; Credits</span>
        <span className="mt-1 text-[12px] font-semibold text-[#777777]">
          Balance: <span style={{ color: '#25B46B' }}>{balanceLabel}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRewardsClick}
        className="relative flex min-h-[105px] flex-col items-start rounded-[20px] bg-[#F4F4F4] p-4 text-left transition-opacity active:opacity-90"
        aria-label={locked ? 'My rewards, sign in required' : 'My rewards'}
      >
        {locked ? (
          <Lock className="absolute right-3 top-3 h-4 w-4 text-zinc-400" strokeWidth={2.5} aria-hidden />
        ) : null}
        <Crown className="h-5 w-5 text-[#111111]" strokeWidth={2} aria-hidden />
        <span className="mt-3 text-[14px] font-black leading-tight text-[#111111]">My Rewards</span>
        <span className="mt-1 text-[12px] font-medium text-[#777777]">View Coupons</span>
      </button>
    </div>
  )
}
