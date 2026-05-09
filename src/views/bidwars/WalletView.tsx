/**
 * Wallet — balance, winning balance, instant cash, add money, withdraw,
 * transactions, and gift cards. Backed by the unified store so optimistic
 * actions reflect immediately in the UI.
 */

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useState } from 'react'
import walletCashStack from '../../assets/wallet-cash-stack.png'
import { AppHeader, EmptyState } from '../../components/bidwars'
import { WalletStripeCheckoutPanel } from '../../components/WalletStripeCheckoutPanel'
import { PokiesRewardsWalletMini } from '../../components/bidwars/PokiesRewardsWalletMini'
import { WalletEarningsChart } from '../../components/bidwars/WalletEarningsChart'
import {
  depositWallet,
  formatAud,
  instantCash,
  useNowEverySecond,
  useUserPerks,
  useWalletBalanceCents,
  useWalletTxns,
  useWinningBalanceCents,
  withdrawWallet,
} from '../../lib/data'
import type { UserPerks, WalletTxnKind } from '../../lib/data'
import { isStripePublishableConfigured } from '../../lib/paymentCheckout'
import type { AddFundsMethod } from '../../lib/walletFunding'
import {
  ADD_FUNDS_METHOD_OPTIONS,
  formatBsbInput,
  txnLabelForAddedFunds,
  validateBankPayout,
} from '../../lib/walletFunding'
import { createWalletTopUpPaymentIntent } from '../../lib/walletStripeTopUp'

type Props = {
  onBack: () => void
}

const TXN_TONE: Record<WalletTxnKind, string> = {
  deposit: 'text-emerald-700',
  reward: 'text-emerald-700',
  'win-refund': 'text-emerald-700',
  withdraw: 'text-zinc-700',
  'peer-send': 'text-zinc-700',
  'instant-cash': 'text-zinc-700',
  'win-charge': 'text-zinc-900',
  'gift-card': 'text-amber-700',
}

const TXN_LABEL: Record<WalletTxnKind, string> = {
  deposit: 'Add money',
  reward: 'Reward',
  'win-refund': 'Refund',
  withdraw: 'Withdraw',
  'peer-send': 'Send',
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

function parseMoneyInputToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.]/g, '')
  if (!cleaned) return null
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n) || n <= 0) return null
  const cents = Math.round(n * 100)
  return cents > 0 ? cents : null
}

function BidwarsWalletFundingModal({
  kind,
  balanceCents,
  initialAmountAud,
  onDismiss,
  onSuccess,
}: {
  kind: 'add' | 'withdraw'
  balanceCents: number
  initialAmountAud?: string
  onDismiss: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount] = useState(initialAmountAud ?? '')
  const [paymentMethod, setPaymentMethod] = useState<AddFundsMethod>('card')
  const [accountName, setAccountName] = useState('')
  const [bsb, setBsb] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [stripeCheckout, setStripeCheckout] = useState<{
    clientSecret: string
    paymentIntentId: string
    amountCents: number
  } | null>(null)

  const stripePublishableKey = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '').trim()
  const stripeClientReady = isStripePublishableConfigured()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  const prepareStripeAdd = useCallback(async () => {
    const cents = parseMoneyInputToCents(amount)
    if (!cents) {
      setError('Enter a valid amount')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const pi = await createWalletTopUpPaymentIntent(cents / 100)
      if (pi.provider !== 'stripe' || !pi.clientSecret?.trim()) {
        setError('Stripe needs STRIPE_SECRET_KEY on the API to open checkout.')
        return
      }
      setStripeCheckout({
        clientSecret: pi.clientSecret.trim(),
        paymentIntentId: pi.id,
        amountCents: cents,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Stripe')
    } finally {
      setBusy(false)
    }
  }, [amount])

  const submit = useCallback(() => {
    const cents = parseMoneyInputToCents(amount)
    if (!cents) {
      setError('Enter a valid amount')
      return
    }
    if (kind === 'withdraw') {
      if (cents > balanceCents) {
        setError('Amount exceeds available balance')
        return
      }
      const payout = validateBankPayout({ accountName, bsb, accountNumber })
      if (!payout.ok) {
        setError(payout.error)
        return
      }
      const ok = withdrawWallet(cents, payout.label)
      setError(ok ? null : 'Insufficient balance')
      if (ok) onSuccess()
      return
    }

    if (stripeClientReady) {
      void prepareStripeAdd()
      return
    }

    depositWallet(cents, txnLabelForAddedFunds(paymentMethod))
    onSuccess()
  }, [
    accountName,
    amount,
    balanceCents,
    bsb,
    accountNumber,
    kind,
    onSuccess,
    paymentMethod,
    prepareStripeAdd,
    stripeClientReady,
  ])

  const title = kind === 'add' ? 'Add funds' : 'Withdraw'
  const body =
    kind === 'add'
      ? stripeClientReady
        ? 'Stripe shows real payment options (cards, wallets, …). Tap Open Stripe checkout after entering an amount.'
        : 'Offline demo payment labels.'
      : 'Australian bank details (AUD).'

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[2px]"
        onClick={onDismiss}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[1] max-h-[min(92dvh,720px)] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl ring-1 ring-zinc-200 sm:rounded-2xl"
      >
        <div className="mb-4">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-violet-600">{title}</p>
          <p className="mt-1 text-[13px] text-zinc-600">{body}</p>
        </div>

        <label className="mb-4 block">
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-500">Amount AUD</span>
          <div className="mt-1 flex rounded-xl border border-zinc-200 focus-within:ring-2 focus-within:ring-violet-500/25">
            <span className="flex items-center border-r border-zinc-200 bg-zinc-50 px-3 font-bold text-zinc-600">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setError(null)
                setStripeCheckout(null)
              }}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[16px] font-black tabular-nums outline-none"
            />
          </div>
          {kind === 'withdraw' ? (
            <p className="mt-1 text-[11px] font-semibold text-zinc-500">Available {formatAud(balanceCents)}</p>
          ) : null}
        </label>

        {kind === 'withdraw' ? (
          <div className="mb-4 space-y-2">
            <input
              type="text"
              placeholder="Account name"
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value)
                setError(null)
              }}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] font-semibold outline-none focus:ring-2 focus:ring-violet-500/25"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="BSB (e.g. 062-002)"
              value={bsb}
              onChange={(e) => {
                setBsb(formatBsbInput(e.target.value))
                setError(null)
              }}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 font-mono text-[14px] outline-none focus:ring-2 focus:ring-violet-500/25"
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Account number"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 12))
                setError(null)
              }}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 font-mono text-[14px] outline-none focus:ring-2 focus:ring-violet-500/25"
            />
          </div>
        ) : null}

        {kind === 'add' && stripeCheckout && stripePublishableKey ? (
          <div className="mb-4">
            <WalletStripeCheckoutPanel
              publishableKey={stripePublishableKey}
              clientSecret={stripeCheckout.clientSecret}
              paymentIntentId={stripeCheckout.paymentIntentId}
              submitAmountLabel={formatAud(stripeCheckout.amountCents)}
              appearance="checkout"
              onBack={() => setStripeCheckout(null)}
              onComplete={() => {
                depositWallet(stripeCheckout.amountCents, 'Added funds · Stripe')
                setStripeCheckout(null)
                onSuccess()
              }}
            />
          </div>
        ) : null}

        {kind === 'add' && stripeClientReady && !stripeCheckout ? (
          <p className="mb-3 text-[11px] font-semibold leading-snug text-zinc-600">
            Open Stripe checkout, then choose <span className="text-zinc-900">Card</span> — that expands Stripe’s hosted
            card fields. Apple Pay / Google Pay show when Stripe enables them on this browser.
          </p>
        ) : null}

        {kind === 'add' && !stripeClientReady ? (
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ADD_FUNDS_METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPaymentMethod(opt.id)
                  setError(null)
                }}
                className={[
                  'rounded-xl border px-3 py-2 text-left text-[12px] font-black transition-colors',
                  paymentMethod === opt.id
                    ? 'border-violet-600 bg-violet-50 ring-2 ring-violet-500/20'
                    : 'border-zinc-200 bg-zinc-50',
                ].join(' ')}
              >
                {opt.title}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-[12px] font-bold text-red-800">{error}</p> : null}

        {kind === 'add' && stripeCheckout ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="w-full rounded-xl border border-zinc-200 py-3 text-[13px] font-black text-zinc-800"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 rounded-xl border border-zinc-200 py-3 text-[13px] font-black text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="flex-[1.25] rounded-xl bg-violet-700 py-3 text-[13px] font-black text-white shadow-md active:bg-violet-800 disabled:opacity-50"
            >
              {busy
                ? '…'
                : kind === 'add'
                  ? stripeClientReady
                    ? 'Open Stripe checkout'
                    : 'Add funds'
                  : 'Withdraw'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default function WalletView({ onBack }: Props) {
  const balance = useWalletBalanceCents()
  const winning = useWinningBalanceCents()
  const txns = useWalletTxns()
  const [busy, setBusy] = useState<'instant' | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [fundModal, setFundModal] = useState<null | { kind: 'add' | 'withdraw'; suggestAmount?: string }>(null)

  const openAddFunds = (suggestAmount?: string) => {
    setFundModal({ kind: 'add', suggestAmount })
  }

  const openWithdraw = () => {
    setFundModal({ kind: 'withdraw' })
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
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#7c3aed] via-[#5b21b6] to-[#291050] p-5 text-white shadow-[0_24px_48px_-22px_rgba(41,16,80,0.7)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/75">Balance</p>
              <p className="mt-1 text-[34px] font-black leading-none tabular-nums">
                {formatAud(balance)}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 text-[12px] font-bold text-white/85">
                <span>
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/60">
                    Winning balance
                  </span>
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
            </div>
            <div className="shrink-0 pt-0.5" aria-hidden>
              <img
                src={walletCashStack}
                alt=""
                width={120}
                height={120}
                draggable={false}
                className="h-[4.25rem] w-[4.25rem] object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAddFunds('100')}
            className="mt-4 w-full rounded-2xl bg-white py-3 text-[12px] font-black uppercase tracking-[0.1em] text-[#291050] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.35)] transition-colors active:bg-violet-50"
          >
            Add funds
          </button>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <ActionTile icon="＋" label="Top up again" onPress={() => openAddFunds()} />
          <ActionTile icon="↑" label="Withdraw" onPress={openWithdraw} />
          <ActionTile icon="🎁" label="Gift cards" onPress={() => undefined} />
          <ActionTile icon="📄" label="Statements" onPress={() => undefined} />
        </section>

        {flash ? (
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-center text-[12px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            {flash}
          </p>
        ) : null}

        <ActivePerksSection />

        <PokiesRewardsWalletMini />

        <WalletEarningsChart txns={txns} />

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

      {fundModal ? (
        <BidwarsWalletFundingModal
          key={`${fundModal.kind}-${fundModal.suggestAmount ?? ''}`}
          kind={fundModal.kind}
          balanceCents={balance}
          initialAmountAud={fundModal.suggestAmount}
          onDismiss={() => setFundModal(null)}
          onSuccess={() => {
            setFundModal(null)
            setFlash('Wallet updated')
            window.setTimeout(() => setFlash(null), 1600)
          }}
        />
      ) : null}
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
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-[18px] font-black text-[#291050]">
        {icon}
      </span>
      <span className="text-[12.5px] font-black tracking-tight text-zinc-950">{label}</span>
    </button>
  )
}

/**
 * Active perks earned from Prize Spin. Time-based perks tick down once per
 * second; counters apply at the surface they affect (BidSlipDrawer for bid
 * boosts, OrderConfirmedView for shipping credits).
 */
function ActivePerksSection() {
  const perks = useUserPerks()
  const now = useNowEverySecond()
  const rows: Array<{
    key: string
    icon: string
    title: string
    body: string
    tone: 'live' | 'static'
    badge?: string
  }> = collectActivePerks(perks, now)

  if (rows.length === 0) return null

  return (
    <section className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="text-[12px] font-black uppercase tracking-[0.12em] text-zinc-500">
          Active perks
        </p>
        <p className="text-[10px] font-bold text-zinc-400">{rows.length} active</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li
            key={r.key}
            className={[
              'flex items-center gap-3 rounded-2xl px-3 py-2 ring-1',
              r.tone === 'live'
                ? 'bg-amber-50 ring-amber-200'
                : 'bg-violet-50 ring-violet-200',
            ].join(' ')}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[18px] ring-1 ring-zinc-200">
              {r.icon}
            </span>
            <span className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[13px] font-black tracking-tight text-zinc-950">
                {r.title}
              </p>
              <p className="line-clamp-1 text-[11px] font-semibold text-zinc-500">{r.body}</p>
            </span>
            {r.badge ? (
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ring-1',
                  r.tone === 'live'
                    ? 'bg-amber-100 text-amber-700 ring-amber-300'
                    : 'bg-violet-100 text-[#291050] ring-violet-200',
                ].join(' ')}
              >
                {r.badge}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function formatRemainingShort(expiresAt: number, now: number): string {
  const ms = expiresAt - now
  if (ms <= 0) return 'expired'
  const sec = Math.floor(ms / 1000)
  const hr = Math.floor(sec / 3600)
  const min = Math.floor((sec % 3600) / 60)
  if (hr >= 1) return `${hr}h ${min.toString().padStart(2, '0')}m left`
  if (min >= 1) return `${min}m ${(sec % 60).toString().padStart(2, '0')}s left`
  return `${sec}s left`
}

function collectActivePerks(perks: UserPerks, now: number) {
  const rows: Array<{
    key: string
    icon: string
    title: string
    body: string
    tone: 'live' | 'static'
    badge?: string
  }> = []
  if (perks.bidBoosts > 0) {
    rows.push({
      key: 'bidBoosts',
      icon: '⚡',
      title: 'Bid Boosts',
      body: 'Adds +$1 to your next eligible bid. Toggle in the Bid Slip.',
      tone: 'static',
      badge: `${perks.bidBoosts}x`,
    })
  }
  if (perks.shippingCredits > 0) {
    rows.push({
      key: 'shipping',
      icon: '🚚',
      title: 'Free Shipping',
      body: 'Auto-applies to your next won auction.',
      tone: 'static',
      badge: `${perks.shippingCredits}x`,
    })
  }
  if (perks.freeSpins > 0) {
    rows.push({
      key: 'freeSpins',
      icon: '🎟️',
      title: 'Free Spins',
      body: 'Use them in Prize Spin (Basic tier).',
      tone: 'static',
      badge: `${perks.freeSpins}x`,
    })
  }
  if (perks.vipExpiresAt && perks.vipExpiresAt > now) {
    rows.push({
      key: 'vip',
      icon: '👑',
      title: 'VIP Pass',
      body: 'Better Prize Spin odds while active.',
      tone: 'live',
      badge: formatRemainingShort(perks.vipExpiresAt, now),
    })
  }
  if (perks.topBidderExpiresAt && perks.topBidderExpiresAt > now) {
    rows.push({
      key: 'topBidder',
      icon: '🏆',
      title: 'Top Bidder',
      body: 'Crown badge shown next to your name in auctions.',
      tone: 'live',
      badge: formatRemainingShort(perks.topBidderExpiresAt, now),
    })
  }
  if (perks.sellerBoostExpiresAt && perks.sellerBoostExpiresAt > now) {
    rows.push({
      key: 'sellerBoost',
      icon: '📈',
      title: 'Seller Boost',
      body: 'New listings publish with the boosted badge.',
      tone: 'live',
      badge: formatRemainingShort(perks.sellerBoostExpiresAt, now),
    })
  }
  return rows
}
