import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronRight,
  Gavel,
  ImageIcon,
  Plus,
  Radio,
  UserRound,
  Video,
  X,
} from 'lucide-react'

export type AddStoryCircleProps = {
  /** Signed-in avatar when available — otherwise placeholder icon is shown. */
  avatarUrl?: string | null
  avatarAlt?: string
  className?: string
  /** Fired after sheet closes; still logs mock action in dev. */
  onRecordVideo?: () => void
  onUploadGallery?: () => void
  onAuctionTeaser?: () => void
  onPromoteLive?: () => void
}

const SHEET_MS = 280

export default function AddStoryCircle({
  avatarUrl,
  avatarAlt = 'Your profile photo',
  className,
  onRecordVideo,
  onUploadGallery,
  onAuctionTeaser,
  onPromoteLive,
}: AddStoryCircleProps) {
  const titleId = useId()
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)
  const openBtnRef = useRef<HTMLButtonElement | null>(null)

  /** Sheet mounted vs visual “entered” (for coordinated enter / exit animations). */
  const [sheetMounted, setSheetMounted] = useState(false)
  const [sheetEntered, setSheetEntered] = useState(false)

  const [pressingStory, setPressingStory] = useState(false)
  const closingTimerRef = useRef<number | undefined>(undefined)

  const modalOpenLifecycle = sheetMounted

  const dismissSheet = useCallback(() => {
    setSheetEntered(false)
    window.clearTimeout(closingTimerRef.current)
    closingTimerRef.current = window.setTimeout(() => {
      setSheetMounted(false)
      closingTimerRef.current = undefined
    }, SHEET_MS)
  }, [])

  const openSheet = useCallback(() => {
    window.clearTimeout(closingTimerRef.current)
    closingTimerRef.current = undefined
    setSheetMounted(true)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setSheetEntered(true))
    })
  }, [])

  useEffect(
    () => () => window.clearTimeout(closingTimerRef.current),
    [],
  )

  /** Body scroll lock whenever sheet is mounted (open or animating shut). */
  useEffect(() => {
    if (!modalOpenLifecycle) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [modalOpenLifecycle])

  useEffect(() => {
    if (!sheetMounted || !sheetEntered) return undefined

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissSheet()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetMounted, sheetEntered, dismissSheet])

  useEffect(() => {
    if (sheetEntered) window.setTimeout(() => closeBtnRef.current?.focus(), 0)
  }, [sheetEntered])

  /** After the sheet fully unmounts, return focus if the sheet had reached the open state once. */
  const sheetReachedOpenRef = useRef(false)
  useEffect(() => {
    if (sheetEntered) sheetReachedOpenRef.current = true
  }, [sheetEntered])

  useEffect(() => {
    if (!sheetMounted && sheetReachedOpenRef.current) {
      sheetReachedOpenRef.current = false
      openBtnRef.current?.focus({ preventScroll: true })
    }
  }, [sheetMounted])

  function backdropClose() {
    dismissSheet()
  }

  const runSheetOption = useCallback(
    (logKey: string, parentAction?: () => void) => {
      console.log(logKey)
      parentAction?.()
      dismissSheet()
    },
    [dismissSheet],
  )

  type OptionProps = {
    icon: LucideIcon
    title: string
    subtitle: string
    onPick: () => void
  }

  function CreateStoryOption({ icon: Icon, title, subtitle, onPick }: OptionProps) {
    const [pressed, setPressed] = useState(false)

    return (
      <button
        type="button"
        onClick={onPick}
        aria-label={`${title}. ${subtitle}`}
        className={[
          'flex w-full min-w-0 items-center gap-3 rounded-[18px] bg-zinc-100 px-4 py-3 text-left outline-none [-webkit-tap-highlight-color:transparent]',
          'transition-[transform,background-color,filter] duration-150 ease-out',
          'focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2',
          pressed ? 'scale-[0.98] bg-zinc-200/95' : 'active:scale-[0.983] active:bg-zinc-200/82',
          'shadow-[0_1px_3px_rgba(0,0,0,0.035)]',
        ].join(' ')}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700" aria-hidden>
          <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold leading-tight tracking-tight text-zinc-900">{title}</span>
          <span className="mt-1 block text-[12.5px] font-medium leading-snug text-zinc-500">{subtitle}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
      </button>
    )
  }

  const sheetNode =
    typeof document !== 'undefined' && sheetMounted
      ? createPortal(
          <div className="fixed inset-0 z-[200]" role="presentation">
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close create story sheet"
              className={[
                'fixed inset-0 cursor-default bg-zinc-900/44 transition-opacity duration-[280ms] ease-out',
                sheetEntered ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
              onClick={backdropClose}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={[
                'fixed bottom-0 left-1/2 z-[201] mx-auto w-full max-w-[min(100%,430px)] -translate-x-1/2 overflow-hidden rounded-t-[1.65rem]',
                'bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.12)]',
                'transition-transform duration-[280ms] cubic-bezier(0.32,0.72,0,1)',
                'max-h-[min(55dvh,560px)] min-h-[min(50dvh,440px)]',
                sheetEntered ? 'translate-y-0' : 'translate-y-full',
              ].join(' ')}
            >
              <div className="bg-white pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <div className="mx-auto mb-5 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300" aria-hidden />

                <div className="relative flex items-start justify-between gap-3 px-5 pb-1">
                  <h2 id={titleId} className="pt-1 text-[1.2rem] font-black tracking-tight text-zinc-900">
                    Create Story
                  </h2>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    onClick={dismissSheet}
                    className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-600 outline-none [-webkit-tap-highlight-color:transparent] transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-400 active:bg-zinc-200"
                    aria-label="Close"
                  >
                    <X className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden />
                  </button>
                </div>

                <div className="mt-2 flex max-h-[calc(55dvh-6rem)] flex-col gap-2.5 overflow-y-auto overscroll-contain px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                  <CreateStoryOption
                    icon={Video}
                    title="Record Video"
                    subtitle="Film a quick story for your followers"
                    onPick={() => runSheetOption('record-video', onRecordVideo)}
                  />
                  <CreateStoryOption
                    icon={ImageIcon}
                    title="Upload from Gallery"
                    subtitle="Choose a photo or video from your phone"
                    onPick={() => runSheetOption('upload-gallery', onUploadGallery)}
                  />
                  <CreateStoryOption
                    icon={Gavel}
                    title="Create Auction Teaser"
                    subtitle="Promote an item before it goes live"
                    onPick={() => runSheetOption('auction-teaser', onAuctionTeaser)}
                  />
                  <CreateStoryOption
                    icon={Radio}
                    title="Promote Live"
                    subtitle="Tell followers your live stream is starting"
                    onPick={() => runSheetOption('promote-live', onPromoteLive)}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className={['relative inline-flex shrink-0 flex-col items-center', className ?? ''].join(' ')}>
      <button
        ref={openBtnRef}
        type="button"
        aria-label="Add story"
        aria-expanded={sheetEntered}
        aria-haspopup="dialog"
        onClick={() => openSheet()}
        data-state={
          sheetEntered ? 'modal-open' : sheetMounted ? 'modal-closing' : pressingStory ? 'pressed' : 'default'
        }
        onPointerDown={() => setPressingStory(true)}
        onPointerUp={() => setPressingStory(false)}
        onPointerLeave={() => setPressingStory(false)}
        onPointerCancel={() => setPressingStory(false)}
        className={[
          'group relative flex shrink-0 flex-col items-center gap-2 outline-none [-webkit-tap-highlight-color:transparent]',
          'transition-[transform,opacity] duration-150 ease-out',
          pressingStory ? 'scale-[0.97] opacity-[0.93]' : 'hover:opacity-98 active:scale-[0.972]',
          'focus-visible:rounded-[999px] focus-visible:ring-2 focus-visible:ring-[#8565c9] focus-visible:ring-offset-4 focus-visible:ring-offset-transparent',
        ].join(' ')}
      >
        <span className="relative">
          <span className="block rounded-[999px] bg-gradient-to-tr from-[#e4dcff]/95 via-[#c9b8ff] to-[#8347d6] p-[3px] shadow-[0_4px_14px_rgba(109,51,199,0.16)]">
            <span className="flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full bg-[#f4f4f5] ring-[2.75px] ring-white">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={avatarAlt}
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-[30px] w-[30px] text-zinc-400" strokeWidth={1.6} aria-hidden />
              )}
            </span>
          </span>

          <span
            className="pointer-events-none absolute -bottom-[2px] -right-[2px] flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#5830a9] shadow-md ring-[2px] ring-white"
            aria-hidden
          >
            <Plus className="h-4 w-4 text-white" strokeWidth={2.85} aria-hidden />
          </span>
        </span>

        <span className="max-w-[4.95rem] truncate text-[11px] font-semibold leading-tight tracking-tight text-zinc-600">
          Your Story
        </span>
      </button>

      {sheetNode}
    </div>
  )
}
