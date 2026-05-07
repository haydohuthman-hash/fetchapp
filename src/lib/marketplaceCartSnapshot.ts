import type { NavigateFunction } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FETCH_APP_PATH } from './fetchRoutes'

const CART_QTY_KEY = 'fetch.marketplaceCartQtyById.v1'
const PENDING_OPEN_CART_KEY = 'fetch.pendingOpenMarketplaceCart'

export const MARKETPLACE_CART_UPDATED_EVENT = 'fetch:marketplaceCartUpdated'

export function readMarketplaceCartQty(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(CART_QTY_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as Record<string, number>
    if (!p || typeof p !== 'object') return {}
    const out: Record<string, number> = {}
    for (const [k, v] of Object.entries(p)) {
      if (typeof v === 'number' && v > 0 && k) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

export function writeMarketplaceCartQty(qtyById: Record<string, number>): void {
  try {
    const slim: Record<string, number> = {}
    for (const [k, v] of Object.entries(qtyById)) {
      if (typeof v === 'number' && v > 0) slim[k] = v
    }
    if (Object.keys(slim).length === 0) sessionStorage.removeItem(CART_QTY_KEY)
    else sessionStorage.setItem(CART_QTY_KEY, JSON.stringify(slim))
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(MARKETPLACE_CART_UPDATED_EVENT))
  } catch {
    /* ignore */
  }
}

export function cartLineItemCount(qtyById: Record<string, number>): number {
  let n = 0
  for (const q of Object.values(qtyById)) {
    if (typeof q === 'number' && q > 0) n += q
  }
  return n
}

/** Deep-link into home shell → marketplace tab; optionally open cart sub-view. */
export function navigateToHomeMarketplace(navigate: NavigateFunction, opts?: { openCart?: boolean }): void {
  try {
    sessionStorage.setItem('fetch.pendingHomeShellTab', 'marketplace')
    if (opts?.openCart) sessionStorage.setItem(PENDING_OPEN_CART_KEY, '1')
    else sessionStorage.removeItem(PENDING_OPEN_CART_KEY)
  } catch {
    /* ignore */
  }
  navigate(FETCH_APP_PATH)
}

export function consumePendingOpenMarketplaceCart(): boolean {
  try {
    if (sessionStorage.getItem(PENDING_OPEN_CART_KEY) === '1') {
      sessionStorage.removeItem(PENDING_OPEN_CART_KEY)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function useMarketplaceCartQtyLive(): Record<string, number> {
  const [state, setState] = useState(() => readMarketplaceCartQty())
  const sync = useCallback(() => setState(readMarketplaceCartQty()), [])

  useEffect(() => {
    window.addEventListener(MARKETPLACE_CART_UPDATED_EVENT, sync)
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_QTY_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(MARKETPLACE_CART_UPDATED_EVENT, sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [sync])

  return state
}

export function useMarketplaceCartItemCount(): number {
  const q = useMarketplaceCartQtyLive()
  return useMemo(() => cartLineItemCount(q), [q])
}
