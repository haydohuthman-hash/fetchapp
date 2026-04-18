import type { HardwareProduct } from '../lib/hardwareCatalog'

const ICON = 'h-5 w-5 shrink-0 text-zinc-600'
const ROW = 'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-zinc-50 active:bg-zinc-100/80'

function IconBack() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.113V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  )
}

function IconHelp() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

export type FetchHomeSideMenuProps = {
  open: boolean
  onClose: () => void
  /** Header title (default: Menu). */
  menuTitle?: string
  onAccount?: () => void
  /** e.g. Back to home â€” shown before Account when set. */
  primaryNav?: { label: string; onClick: () => void }
  onHelp: () => void
  onAlerts?: () => void
  onLegal?: () => void
  alertsUnreadCount?: number
  /** When false, hides the hardware carousel (driver / minimal menus). */
  showHardwareRail?: boolean
  products: readonly HardwareProduct[]
  onProductView: (product: HardwareProduct) => void
}

function previewGradient(style: HardwareProduct['previewStyle']) {
  switch (style) {
    case 'violet':
      return 'from-violet-600/35 via-fuchsia-500/25 to-transparent'
    case 'blue':
      return 'from-sky-600/35 via-blue-500/25 to-transparent'
    default:
      return 'from-slate-500/40 via-slate-600/20 to-transparent'
  }
}

export function FetchHomeSideMenu({
  open,
  onClose,
  menuTitle = 'Menu',
  onAccount,
  primaryNav,
  onHelp,
  onAlerts,
  onLegal,
  alertsUnreadCount = 0,
  showHardwareRail = true,
  products,
  onProductView,
}: FetchHomeSideMenuProps) {
  if (!open) return null

  return (
    <aside
      id="fetch-home-map-side-menu"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fetch-home-map-side-menu-title"
      className="fetch-home-map-side-menu absolute left-0 top-0 flex h-full w-[85vw] max-w-md flex-col border-r border-zinc-200 bg-white shadow-[22px_0_64px_-10px_rgba(0,0,0,0.42),10px_0_28px_-8px_rgba(0,0,0,0.28)]"
    >
      <div className="fetch-home-map-side-menu-header flex items-center justify-between border-b border-zinc-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h2
          id="fetch-home-map-side-menu-title"
          className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-900"
        >
          {menuTitle}
        </h2>
        <button
          type="button"
          className="fetch-home-map-side-menu-dismiss rounded-full px-3 py-1.5 text-[13px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-3 pb-2">
        {primaryNav ? (
          <button
            type="button"
            className={ROW}
            onClick={() => {
              onClose()
              primaryNav.onClick()
            }}
          >
            <IconBack />
            <span className="text-[14px] font-medium text-zinc-800">{primaryNav.label}</span>
          </button>
        ) : null}
        {onAccount ? (
          <button
            type="button"
            className={ROW}
            onClick={() => {
              onClose()
              onAccount()
            }}
          >
            <IconUser />
            <span className="text-[14px] font-medium text-zinc-800">Profile</span>
          </button>
        ) : null}
        {onAlerts ? (
          <button
            type="button"
            className={`${ROW} relative`}
            onClick={() => {
              onClose()
              onAlerts()
            }}
          >
            <IconBell />
            <span className="text-[14px] font-medium text-zinc-800">Alerts</span>
            {alertsUnreadCount > 0 ? (
              <span className="ml-auto inline-flex min-w-[1.25rem] justify-center rounded-full bg-zinc-700 px-1 text-[10px] font-bold text-white">
                {alertsUnreadCount > 99 ? '99+' : alertsUnreadCount}
              </span>
            ) : null}
          </button>
        ) : null}
        <button
          type="button"
          className={ROW}
          onClick={() => {
            onClose()
            onHelp()
          }}
        >
          <IconHelp />
          <span className="text-[14px] font-medium text-zinc-800">Help</span>
        </button>
        {onLegal ? (
          <button
            type="button"
            className={ROW}
            onClick={() => {
              onClose()
              onLegal()
            }}
          >
            <IconDoc />
            <span className="text-[14px] font-medium text-zinc-800">Legal &amp; privacy</span>
          </button>
        ) : null}
      </nav>

      {showHardwareRail ? (
      <div
        className="shrink-0 border-t border-zinc-200 bg-zinc-50/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
        role="region"
        aria-label="Fetch home hardware"
      >
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          Wall panels
        </p>
        <div
          className={[
            'flex gap-3 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]',
            '[@media(prefers-reduced-motion:no-preference)]:snap-x [@media(prefers-reduced-motion:no-preference)]:snap-mandatory',
          ].join(' ')}
        >
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onClose()
                onProductView(p)
              }}
              className={[
                'w-[min(11.5rem,72vw)] shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition-[transform,box-shadow] hover:border-zinc-300 active:scale-[0.98]',
                '[@media(prefers-reduced-motion:no-preference)]:snap-start',
              ].join(' ')}
            >
              <div
                className={[
                  'relative h-24 w-full bg-gradient-to-br',
                  previewGradient(p.previewStyle),
                ].join(' ')}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    Touch
                  </span>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[13px] font-semibold text-zinc-900">{p.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">
                  {p.subtitle}
                </p>
                <p className="mt-2 text-[12px] font-semibold text-zinc-800">
                  From ${p.priceAud} AUD
                </p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                  View
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
      ) : null}
    </aside>
  )
}

