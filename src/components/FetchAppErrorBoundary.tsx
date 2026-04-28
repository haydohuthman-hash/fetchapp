import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Optional surface label included in the recovery screen + console log. */
  surface?: string
}

type State = {
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Top-level error boundary so a render-time crash in any descendant surfaces a
 * branded recovery screen instead of a blank page. Errors are also logged to
 * the console for debugging.
 *
 * Lazy-loaded chunks already use `Suspense` fallbacks for their loading state
 * — this boundary catches *thrown* errors during render or in lifecycle.
 */
export class FetchAppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[fetch] app crashed', {
      surface: this.props.surface ?? 'root',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
    this.setState({ errorInfo })
  }

  private reload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  private softRecover = () => {
    this.setState({ error: null, errorInfo: null })
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div
        role="alert"
        className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-5 bg-[#1c1528] px-6 text-center text-white"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-violet-200/70">
          fetchit
        </p>
        <h1 className="text-2xl font-black tracking-tight">Something went wrong</h1>
        <p className="max-w-sm text-sm font-medium leading-snug text-white/70">
          Sorry — the app hit a snag. Try recovering, or reload the page if it sticks.
        </p>
        {import.meta.env.DEV && this.state.error ? (
          <pre className="max-h-40 max-w-full overflow-auto rounded-xl bg-black/40 p-3 text-left text-[11px] font-mono leading-snug text-white/80 ring-1 ring-white/10">
            {String(this.state.error.message ?? this.state.error)}
            {this.state.errorInfo?.componentStack
              ? `\n\n${this.state.errorInfo.componentStack}`
              : ''}
          </pre>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={this.softRecover}
            className="rounded-full bg-white/15 px-4 py-2 text-[12px] font-black uppercase tracking-[0.16em] ring-1 ring-white/20 transition-[background-color,transform] hover:bg-white/25 active:scale-95"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.reload}
            className="rounded-full bg-amber-400 px-4 py-2 text-[12px] font-black uppercase tracking-[0.16em] text-amber-950 transition-[background-color,transform] hover:bg-amber-300 active:scale-95"
          >
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
