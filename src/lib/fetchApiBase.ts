/**
 * Base URL for the Fetch API (chat, TTS, scan, marketplace, SSE).
 *
 * - **Explicit** `VITE_FETCH_API_BASE_URL` — API on another origin (empty = same-origin `/api/*`).
 * - **Dev** (no override) — Vite proxies `/api` to Express (see `vite.config.ts`); EventSource uses relative URLs.
 *
 * **SSE / cookies:** EventSource cannot attach custom headers. If the API is cross-origin, rely on
 * `withCredentials` on `EventSource` (see `subscribeMarketplaceStream` in `booking/api.ts`) and CORS with
 * credentials; long-lived streams need a long-running Node host (not typical serverless timeouts).
 *
 * **Shared marketplace state:** Set `FETCH_MARKETPLACE_STORE=postgres` and `DATABASE_URL` on the API
 * for durable bookings; SSE fan-out stays per-process unless you add Redis/NOTIFY fanout.
 */
export function getFetchApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_FETCH_API_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  return ''
}

export function fetchApiAbsoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${getFetchApiBaseUrl()}${p}`
}

