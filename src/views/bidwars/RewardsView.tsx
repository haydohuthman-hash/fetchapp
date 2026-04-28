/**
 * Rewards — level + XP bar, streak counter, perks, and badge wall. All driven
 * by the unified store.
 */

import { AppHeader, RewardBadge } from '../../components/bidwars'
import { useBidwarsUser, useRewards } from '../../lib/data'

type Props = {
  onBack: () => void
  onInvite?: () => void
}

export default function RewardsView({ onBack, onInvite }: Props) {
  const user = useBidwarsUser()
  const rewards = useRewards()
  const perks = rewards.filter((r) => r.kind === 'perk')
  const badges = rewards.filter((r) => r.kind === 'badge')
  const xpFraction = Math.min(1, user.xp / Math.max(1, user.xpToNext))
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd]">
      <AppHeader title="Rewards" subtitle="Level up, win more" showBack onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#7c3aed] via-[#5b21b6] to-[#3b0764] p-5 text-white shadow-[0_24px_48px_-22px_rgba(76,29,149,0.7)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Level</p>
              <p className="mt-1 text-[36px] font-black leading-none tabular-nums">{user.level}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 ring-1 ring-white/25">
              <span aria-hidden>🔥</span>
              <span className="text-[12px] font-black uppercase tracking-[0.1em]">{user.streakDays}-day streak</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[11px] font-bold text-white/85">
              {user.xp.toLocaleString('en-AU')} / {user.xpToNext.toLocaleString('en-AU')} XP to level {user.level + 1}
            </p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <span
                className="block h-full rounded-full bg-white transition-[width] duration-500"
                style={{ width: `${xpFraction * 100}%` }}
                aria-hidden
              />
            </div>
          </div>
        </section>

        <section>
          <p className="px-1 pb-1 text-[12px] font-black uppercase tracking-[0.14em] text-zinc-500">
            Perks
          </p>
          <div className="grid grid-cols-2 gap-2">
            {perks.map((r) => (
              <RewardBadge key={r.id} reward={r} layout="tile" />
            ))}
          </div>
        </section>

        <section>
          <p className="px-1 pb-1 text-[12px] font-black uppercase tracking-[0.14em] text-zinc-500">
            Badges
          </p>
          <div className="flex flex-col gap-2">
            {badges.map((r) => (
              <RewardBadge key={r.id} reward={r} layout="row" />
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-4 ring-1 ring-zinc-200 shadow-sm">
          <p className="text-[12px] font-black uppercase tracking-[0.14em] text-zinc-400">Earn faster</p>
          <p className="mt-1 text-[14px] font-bold text-zinc-900">
            Invite friends — both of you get a $15 bidding bonus.
          </p>
          <button
            type="button"
            onClick={onInvite}
            className="mt-3 w-full rounded-full bg-gradient-to-b from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] py-3 text-[13px] font-black uppercase tracking-[0.06em] text-white shadow-[0_18px_38px_-14px_rgba(76,29,149,0.55)] ring-1 ring-white/10 active:scale-[0.985]"
          >
            Invite friends
          </button>
        </section>
      </main>
    </div>
  )
}
