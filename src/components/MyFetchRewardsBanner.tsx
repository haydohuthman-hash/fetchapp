import walletCashStack from '../assets/wallet-cash-stack.png'

export type MyFetchRewardsBannerLayout = 'standalone' | 'stackTop' | 'stackBottom'

type Props = {
  className?: string
  /** `stack*` = inside a shared card with wallet; omit border/radius/shadow. */
  layout?: MyFetchRewardsBannerLayout
  /** Wallet balance in cents. */
  walletBalanceCents?: number
  /** Optional pending amount in cents. */
  pendingCents?: number
  onOpen?: () => void
}

const titleClass =
  'block px-0.5 text-left text-[0.95rem] font-extrabold leading-tight tracking-[-0.02em] text-[#2c2820]'

const titleClassStack =
  'block px-0.5 text-left text-[0.92rem] font-extrabold leading-tight tracking-[-0.02em] text-[#2c2820]'

export function MyFetchRewardsBanner({
  className = '',
  layout = 'standalone',
  walletBalanceCents = 0,
  pendingCents = 0,
  onOpen,
}: Props) {
  const stack = layout !== 'standalone'
  const balance = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(walletBalanceCents / 100)
  const pending = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(pendingCents / 100)

  const title = onOpen ? (
    <span className={stack ? titleClassStack : titleClass}>My Fetch wallet</span>
  ) : (
    <h3 id="fetch-my-wallet-heading" className={stack ? titleClassStack : titleClass}>
      My Fetch wallet
    </h3>
  )

  const body = (
    <>
      {title}
      <div className={stack ? 'mt-1.5 flex items-center gap-2' : 'mt-1.5 flex items-center gap-2.5'}>
        <div
          className={
            stack
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-transparent'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-transparent'
          }
          aria-hidden
        >
          <img
            src={walletCashStack}
            alt=""
            className={stack ? 'h-8 w-8 object-cover' : 'h-9 w-9 object-cover'}
            loading="lazy"
            draggable={false}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={stack ? 'text-[14px] font-extrabold text-[#2c2820]' : 'text-[17px] font-extrabold text-[#2c2820]'}>
            {balance}
          </p>
          <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[10px] font-semibold leading-tight text-[#6b6256]">
            <span>Available balance</span>
            <span className="shrink-0">
              {pendingCents > 0 ? `${pending} pending` : 'No pending'}
            </span>
          </div>
        </div>
        {onOpen ? (
          <span
            className={
              stack
                ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8dfd2] text-[#6b6256] ring-1 ring-[#d9cbb5]/90'
                  : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8dfd2] text-[#5c5348] ring-1 ring-[#d9cbb5]/95'
            }
            aria-hidden
          >
            <svg
              className={stack ? 'h-3.5 w-3.5' : 'h-4 w-4'}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        ) : null}
      </div>
      {/* Standalone wallet card intentionally shows summary only (no CTA buttons). */}
    </>
  )

  const shellStandalone =
    'relative overflow-hidden rounded-2xl border border-zinc-700 bg-white px-2.5 py-2.5 text-left shadow-none ring-0'

  const shellStack =
    'rounded-none border-0 bg-transparent px-2.5 py-2 text-left shadow-none dark:border-0'

  const shell = layout === 'standalone' ? shellStandalone : shellStack

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={['min-w-0 w-full', shell, 'transition-transform active:scale-[0.99]', className]
          .filter(Boolean)
          .join(' ')}
        aria-label="Open My Fetch wallet"
      >
        {body}
      </button>
    )
  }

  return (
    <section
      className={['min-w-0', shell, className].filter(Boolean).join(' ')}
      aria-labelledby="fetch-my-wallet-heading"
    >
      {body}
    </section>
  )
}

