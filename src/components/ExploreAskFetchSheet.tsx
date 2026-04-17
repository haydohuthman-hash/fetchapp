import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type { MarketplacePeerBrowseFilter } from './ExploreBrowseBanner'
import { resolveExploreAskAdvancedFlow, type ResolvedAdvancedFlow } from '../lib/exploreAskFetchAdvancedFlow'
import { FetchSplashBrandMark } from './FetchSplashBrandMark'
import { ShellMenuCloseIcon } from './icons/HomeShellNavIcons'
import { useFetchVoice } from '../voice/FetchVoiceContext'
import { primeVoicePlaybackFromUserGesture } from '../voice/fetchVoice'
import { voiceFlowSttError } from '../voice/voiceFlowDebug'
import { isCoarsePointerDevice } from '../voice/voiceMobilePolicy'

type Phase = 'compose' | 'clarify'

type Props = {
  open: boolean
  onClose: () => void
  /** Opens full assistant; message may be empty. */
  onSubmit: (trimmedMessage: string) => void
  /** When set, matching shopping intents run clarification then marketplace. */
  onOpenMarketplaceBrowse?: (filter: MarketplacePeerBrowseFilter) => void
}

/** Outline mic + stand — reads clearly at small sizes on light/dark and on Fetch red. */
function MicGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6.5 11.5a5.5 5.5 0 0011 0" />
      <path d="M12 15v3" />
      <path d="M9.5 18h5" />
    </svg>
  )
}

export function ExploreAskFetchSheet({
  open,
  onClose,
  onSubmit,
  onOpenMarketplaceBrowse,
}: Props) {
  const { speakLine, playUiEvent } = useFetchVoice()
  const [phase, setPhase] = useState<Phase>('compose')
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const [flow, setFlow] = useState<ResolvedAdvancedFlow | null>(null)
  const [originalQuery, setOriginalQuery] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const recognitionRef = useRef<{ abort: () => void } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resetClarify = useCallback(() => {
    setPhase('compose')
    setFlow(null)
    setOriginalQuery('')
    setStepIndex(0)
    setAnswers({})
  }, [])

  useEffect(() => {
    if (!open) return
    resetClarify()
    setDraft('')
    setListening(false)
    const id = requestAnimationFrame(() => textareaRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open, resetClarify])

  useEffect(() => {
    if (open) return
    try {
      recognitionRef.current?.abort()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setListening(false)
  }, [open])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.abort()
    } catch {
      /* ignore */
    }
    recognitionRef.current = null
    setListening(false)
  }, [])

  const toggleVoiceToText = useCallback(() => {
    primeVoicePlaybackFromUserGesture()
    if (listening) {
      stopListening()
      return
    }

    const w = window as unknown as Record<string, unknown>
    const SpeechRec = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | (new () => {
          lang: string
          interimResults: boolean
          maxAlternatives: number
          continuous: boolean
          onstart: (() => void) | null
          onresult: ((e: {
            resultIndex: number
            results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
          }) => void) | null
          onerror: (() => void) | null
          onend: (() => void) | null
          start: () => void
          abort: () => void
        })
      | undefined

    if (!SpeechRec) {
      voiceFlowSttError('SpeechRecognition API missing (explore ask sheet)')
      void speakLine("Voice typing isn't available in this browser.", {
        debounceKey: 'explore_ask_no_stt',
        debounceMs: 3200,
      })
      return
    }

    try {
      recognitionRef.current?.abort()
    } catch {
      /* ignore */
    }

    const coarse = isCoarsePointerDevice()
    const rec = new SpeechRec()
    rec.lang = 'en-AU'
    rec.interimResults = coarse
    rec.maxAlternatives = 1
    rec.continuous = false
    recognitionRef.current = rec

    rec.onstart = () => {
      setListening(true)
      playUiEvent('listening_start')
    }

    rec.onresult = (event) => {
      let finalText = ''
      let latestInterim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const row = event.results[i]
        const chunk = row?.[0]?.transcript ?? ''
        if (row?.isFinal) finalText += chunk
        else if (coarse) latestInterim = chunk
      }
      const piece = finalText.trim() || latestInterim.trim()
      if (piece) {
        setDraft((prev) => {
          const base = prev.trim()
          return base ? `${base} ${piece}` : piece
        })
      }
    }

    rec.onerror = () => {
      setListening(false)
      playUiEvent('error')
    }

    rec.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    try {
      rec.start()
    } catch {
      setListening(false)
      voiceFlowSttError('SpeechRecognition start failed (explore ask sheet)')
    }
  }, [listening, playUiEvent, speakLine, stopListening])

  const finishAdvancedToMarketplace = useCallback(
    (nextAnswers: Record<string, string>, f: ResolvedAdvancedFlow, query: string) => {
      stopListening()
      const filter = f.buildBrowseFilter(nextAnswers, query)
      onClose()
      onOpenMarketplaceBrowse?.(filter)
    },
    [onClose, onOpenMarketplaceBrowse, stopListening],
  )

  const pickClarifyOption = useCallback(
    (optionId: string) => {
      if (!flow) return
      const step = flow.steps[stepIndex]
      if (!step) return
      const nextAnswers = { ...answers, [step.id]: optionId }
      setAnswers(nextAnswers)
      if (stepIndex + 1 < flow.steps.length) {
        setStepIndex((i) => i + 1)
      } else {
        finishAdvancedToMarketplace(nextAnswers, flow, originalQuery)
      }
    },
    [answers, finishAdvancedToMarketplace, flow, originalQuery, stepIndex],
  )

  const continueFromCompose = useCallback(() => {
    stopListening()
    const trimmed = draft.trim()
    const resolved =
      trimmed && onOpenMarketplaceBrowse ? resolveExploreAskAdvancedFlow(trimmed) : null
    if (resolved) {
      setFlow(resolved)
      setOriginalQuery(trimmed)
      setStepIndex(0)
      setAnswers({})
      setPhase('clarify')
      return
    }
    onSubmit(trimmed)
  }, [draft, onOpenMarketplaceBrowse, onSubmit, stopListening])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (e.repeat) return
        if (e.nativeEvent.isComposing) return
        e.preventDefault()
        continueFromCompose()
      }
    },
    [continueFromCompose],
  )

  const handleClose = useCallback(() => {
    stopListening()
    onClose()
  }, [onClose, stopListening])

  if (!open) return null

  const clarifyStep = phase === 'clarify' && flow ? flow.steps[stepIndex] : null
  const titleId = 'fetch-explore-ask-fetch-title'

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[62] flex flex-col justify-end bg-black/50 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="min-h-0 flex-1 w-full cursor-default border-0 bg-transparent p-0"
        aria-label="Close"
        onClick={handleClose}
      />
      <div
        className="relative mx-auto w-full max-w-[min(100%,430px)] rounded-t-[1.35rem] border border-b-0 border-zinc-200/90 bg-gradient-to-b from-zinc-50 to-white shadow-[0_-12px_48px_-16px_rgba(15,23,42,0.28)] dark:border-zinc-700/90 dark:from-zinc-900 dark:to-zinc-950"
        style={{ paddingBottom: 'max(1.1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-center pt-2.5" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-zinc-300/90 dark:bg-zinc-600" />
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-2 top-2 z-[1] flex h-14 w-14 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-200/80 active:scale-[0.97] dark:text-zinc-200 dark:hover:bg-zinc-800"
          aria-label="Close"
        >
          <ShellMenuCloseIcon className="h-8 w-8" />
        </button>

        <div className="px-5 pb-5 pt-2">
          {/* Animated brand eyes + bolt (vector matches splash mark; transparent bg) */}
          <div
            className="fetch-explore-ask-fetch-brand flex justify-center py-1"
            aria-hidden
          >
            <FetchSplashBrandMark className="h-[4.25rem] w-auto max-w-[min(240px,78vw)] sm:h-[4.85rem]" />
          </div>

          {phase === 'compose' ? (
            <>
              <p
                className="mt-2 text-center text-[14px] font-medium leading-snug text-zinc-600 dark:text-zinc-400 sm:text-[15px]"
              >
                <span id={titleId} className="font-extrabold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
                  Ask Fetch
                </span>
                <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
                  {' '}
                  ·{' '}
                </span>
                <span>
                  For shopping we&apos;ll ask a quick follow-up then open listings; anything else opens the
                  full assistant.
                </span>
              </p>

              <div className="relative mt-4">
                <label className="sr-only" htmlFor="fetch-explore-ask-fetch-input">
                  Message
                </label>
                <textarea
                  ref={textareaRef}
                  id="fetch-explore-ask-fetch-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="e.g. Queen bed frame near me"
                  rows={2}
                  className="min-h-[3rem] w-full resize-none rounded-xl border border-zinc-200/90 bg-white py-2 pl-3 pr-11 text-[15px] font-normal leading-[1.35] text-zinc-900 shadow-none outline-none ring-0 placeholder:text-zinc-400 focus:border-[#00ff6a]/50 focus:ring-1 focus:ring-[#00ff6a]/18 dark:border-zinc-600 dark:bg-zinc-900/85 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-[#00ff6a]/45 dark:focus:ring-[#00ff6a]/12"
                />
                <button
                  type="button"
                  onClick={toggleVoiceToText}
                  className={[
                    'absolute bottom-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-lg border transition-transform active:scale-[0.96]',
                    listening
                      ? 'border-[#00ff6a] bg-[#00ff6a] text-black shadow-[0_2px_10px_-3px_rgba(225,25,45,0.5)]'
                      : 'border-zinc-200/90 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-300 dark:hover:bg-zinc-700',
                  ].join(' ')}
                  aria-label={listening ? 'Stop voice typing' : 'Voice to text'}
                  aria-pressed={listening}
                >
                  <MicGlyph className="h-[1.15rem] w-[1.15rem]" />
                </button>
              </div>

              <button
                type="button"
                onClick={continueFromCompose}
                className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#00ff6a] px-4 py-3.5 text-[1.05rem] font-extrabold leading-none text-black shadow-[0_4px_18px_-6px_rgba(225,25,45,0.6)] transition-transform active:scale-[0.99] dark:bg-[#00ff6a]"
              >
                Continue
              </button>
            </>
          ) : (
            clarifyStep && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPhase('compose')
                    setFlow(null)
                    setStepIndex(0)
                    setAnswers({})
                  }}
                  className="mb-1 mt-1 text-left text-[12px] font-bold text-[#00ff6a] underline decoration-[#00ff6a]/35 underline-offset-2 dark:text-[#00ff6a]"
                >
                  ← Edit your request
                </button>
                <p
                  id={titleId}
                  className="mt-2 text-center text-[14px] font-medium leading-snug text-zinc-700 dark:text-zinc-300 sm:text-[15px]"
                >
                  <span className="font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
                    Smart match
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                    {' '}
                    ·{' '}
                  </span>
                  <span className="font-medium text-zinc-500 dark:text-zinc-400">&ldquo;{originalQuery}&rdquo;</span>
                  <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                    {' '}
                    —{' '}
                  </span>
                  <span className="font-extrabold tracking-[-0.02em] text-zinc-900 dark:text-zinc-50">
                    {clarifyStep.question}
                  </span>
                </p>

                <div className="mt-5 flex flex-col gap-2.5">
                  {clarifyStep.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => pickClarifyOption(opt.id)}
                      className="flex w-full items-center justify-center rounded-2xl border border-zinc-200/95 bg-white px-4 py-3.5 text-left text-[15px] font-bold leading-snug text-zinc-900 shadow-sm transition-transform active:scale-[0.99] dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-50 dark:shadow-none"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    stopListening()
                    onSubmit(originalQuery)
                  }}
                  className="mt-4 w-full text-center text-[12px] font-bold text-zinc-500 underline decoration-zinc-300/80 underline-offset-2 dark:text-zinc-400 dark:decoration-zinc-600"
                >
                  Open full assistant instead
                </button>
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}
