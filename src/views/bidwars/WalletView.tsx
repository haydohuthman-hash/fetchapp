/**
 * Wallet — balance, winning balance, instant cash, add money, withdraw,
 * transactions, and gift cards. Backed by the unified store so optimistic
 * actions reflect immediately in the UI.
 */

import { useState } from 'react'
import { AppHeader, EmptyState } from '../../components/bidwars'
import {
  depositWallet,
  formatAud,
  instantCash,
  useWalletBalanceCents,
  useWalletTxns,
  useWinningBalanceCents,
  withdrawWallet,
} from '../../lib/data'
import type { WalletTxnKind } from '../../lib/data'

type Props = {
  onBack: () => void
}

const TXN_TONE: Record<WalletTxnKind, string> = {
  deposit: 'text-emerald-700',
  reward: 'text-emerald-700',
  'win-refund': 'text-emerald-700',
  withdraw: 'text-zinc-700',
  'instant-cash': 'text-zinc-700',
  'win-charge': 'text-zinc-900',
  'gift-card': 'text-amber-700',
}

const TXN_LABEL: Record<WalletTxnKind, string> = {
  deposit: 'Add money',
  reward: 'Reward',
  'win-refund': 'Refund',
  withdraw: 'Withdraw',
  'instant-cash': 'Instant cash',
  'win-charge': 'Win',
  'gift-card': 'Gift card',
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function WalletView({ onBack }: Props) {
  const balance = useWalletBalanceCents()
  const winning = useWinningBalanceCents()
  const txns = useWalletTxns()
  const [busy, setBusy] = useState<'deposit' | 'withdraw' | 'instant' | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const runDeposit = (amountCents: number) => {
    setBusy('deposit')
    depositWallet(amountCents, `Added funds · Visa ··4242`)
    setFlash(`Added ${formatAud(amountCents)}`)
    window.setTimeout(() => setBusy(null), 200)
    window.setTimeout(() => setFlash(null), 1600)
  }

  const runWithdraw = (amountCents: number) => {
    setBusy('withdraw')
    const ok = withdrawWallet(amountCents, 'Withdraw to bank · ANZ ··3320')
    setFlash(ok ? `Withdrew ${formatAud(amountCents)}` : 'Insufficient balance')
    window.setTimeout(() => setBusy(null), 200)
    window.setTimeout(() => setFlash(null), 1600)
  }

  const runInstantCash = () => {
    setBusy('instant')
    const ok = instantCash(Math.min(2_000, balance))
    setFlash(ok ? 'Sent to your bank' : 'Insufficient balance')
    window.setTimeout(() => setBusy(null), 200)
    window.setTimeout(() => setFlash(null), 1600)
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col bg-[#f8f6fd]">
      <AppHeader title="Wallet" subtitle="Funds, winnings, and gift cards" showBack onBack={onBack} />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-3">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#7c3aed] via-[#5b21b6] to-[#4c1d95] p-5 text-white shadow-[0_24px_48px_-22px_rgba(76,29,149,0.7)]">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/75">Balance</p>
          <p className="mt-1 text-[34px] font-black leading-none tabular-nums">
            {formatAud(balance)}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3 text-[12px] font-bold text-white/85">
            <span>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/60">Winning balance</span>
              <span className="block tabular-nums text-white">{formatAud(winning)}</span>
            </span>
            <button
              type="button"
              disabled={busy === 'instant'}
              onClick={runInstantCash}
              className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] ring-1 ring-white/25 transition-colors active:bg-white/25 disabled:opacity-60"
            >
              Instant cash
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <ActionTile
            icon="＋"
            label="Add money"
            onPress={() => runDeposit(10_000)}
            busy={busy === 'deposit'}
          />
          <ActionTile
            icon="↑"
            label="Withdraw"
            onPress={() => runWithdraw(5_000)}
            busy={busy === 'withdraw'}
          />
          <ActionTile icon="🎁" label="Gift cards" onPress={() => undefined} />
          <ActionTile icon="📄" label="Statements" onPress={() => undefined} />
        </section>

        {flash ? (
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-center text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            {flash}
          </p>
        ) : null}

        <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-[12px] font-black uppercase tracking-[0.12em] text-zinc-500">
              Transactions
            </p>
            <p className="text-[10px] font-bold text-zinc-400">{txns.length} total</p>
          </div>
          {txns.length === 0 ? (
            <EmptyState icon="💳" title="No transactions yet" body="Add money or win a battle to get rolling." />
          ) : (
            <div className="flex flex-col gap-1.5">
              {txns.map((t) => {
                const isCredit = t.amountCents >= 0
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[12px] font-black uppercase tracking-[0.08em] ring-1 ring-zinc-200">
                      {TXN_LABEL[t.kind].slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[12.5px] font-black text-zinc-900">{t.label}</p>
                      <p className="text-[10.5px] font-semibold text-zinc-500">
                        {TXN_LABEL[t.kind]} · {formatDate(t.createdAt)}
                      </p>
                    </span>
                    <span className={['text-right text-[13px] font-black tabular-nums', TXN_TONE[t.kind]].join(' ')}>
                      {isCredit ? '+' : ''}
                      {formatAud(t.amountCents)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function ActionTile({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: string
  label: string
  onPress: () => void
  busy?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={busy}
      className="flex flex-col items-start gap-1 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-zinc-200 transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-[18px] font-black text-[#4c1d95]">
        {icon}
      </span>
      <span className="text-[12.5px] font-black tracking-tight text-zinc-950">{label}</span>
    </button>
  )
}
