import { getDefaultPaymentMethod, paymentMethodToConfirmPayload } from './paymentMethods'

export const HUNT_DELIVERY_ADDRESS_STORAGE_KEY = 'fetch.hunt.deliveryAddress.v1'

export type HuntGateFailureKind = 'funds' | 'payment' | 'address'

export function readHuntDeliveryLine(): string {
  try {
    const raw = window.localStorage.getItem(HUNT_DELIVERY_ADDRESS_STORAGE_KEY)
    if (!raw) return ''
    const parsed = JSON.parse(raw) as { line1?: string }
    return typeof parsed.line1 === 'string' ? parsed.line1 : ''
  } catch {
    return ''
  }
}

export function saveHuntDeliveryLine(line1: string): void {
  try {
    window.localStorage.setItem(
      HUNT_DELIVERY_ADDRESS_STORAGE_KEY,
      JSON.stringify({ line1: line1.trim(), updatedAt: Date.now() }),
    )
  } catch {
    /* ignore storage errors */
  }
}

export function hasHuntDeliveryAddressOnFile(): boolean {
  return readHuntDeliveryLine().trim().length >= 10
}

/**
 * When auto-bid or auto-buy is on, require wallet balance, a chargeable card, and a delivery line.
 * Notify-only hunts (both automation toggles off) skip these gates.
 */
export function evaluateHuntAutomationGates(args: {
  autoBid: boolean
  autoBuy: boolean
  walletBalanceCents: number
}): HuntGateFailureKind | null {
  if (!args.autoBid && !args.autoBuy) return null

  if (!Number.isFinite(args.walletBalanceCents) || args.walletBalanceCents <= 0) {
    return 'funds'
  }

  const pm = getDefaultPaymentMethod()
  if (!pm) return 'payment'
  const payload = paymentMethodToConfirmPayload(pm)
  if ('error' in payload) return 'payment'

  if (!hasHuntDeliveryAddressOnFile()) return 'address'

  return null
}
