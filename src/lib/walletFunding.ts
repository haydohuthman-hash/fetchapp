/** Shared copy + validation for in-app wallet top-up / payout (demo local store). */

export type AddFundsMethod = 'card' | 'apple_pay' | 'google_pay'

const ADD_FUNDS_LABEL: Record<AddFundsMethod, string> = {
  card: 'Added funds · Visa ··4242',
  apple_pay: 'Added funds · Apple Pay',
  google_pay: 'Added funds · Google Pay',
}

export function txnLabelForAddedFunds(method: AddFundsMethod): string {
  return ADD_FUNDS_LABEL[method]
}

export const ADD_FUNDS_METHOD_OPTIONS: { id: AddFundsMethod; title: string; subtitle: string }[] = [
  { id: 'card', title: 'Card', subtitle: 'Credit or debit' },
  { id: 'apple_pay', title: 'Apple Pay', subtitle: 'Wallet' },
  { id: 'google_pay', title: 'Google Pay', subtitle: 'Wallet' },
]

/** Display BSB as xxx-xxx while typing (AU). */
export function formatBsbInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 6)
  if (d.length <= 3) return d
  return `${d.slice(0, 3)}-${d.slice(3)}`
}

export type BankPayoutFields = {
  accountName: string
  bsb: string
  accountNumber: string
}

export type BankPayoutValidation = { ok: true; label: string } | { ok: false; error: string }

export function validateBankPayout(fields: BankPayoutFields): BankPayoutValidation {
  const name = fields.accountName.trim()
  if (name.length < 2) return { ok: false, error: 'Enter the account holder name' }
  const bsb = fields.bsb.replace(/\D/g, '')
  if (bsb.length !== 6) return { ok: false, error: 'BSB must be 6 digits (e.g. 062-002)' }
  const acc = fields.accountNumber.replace(/\D/g, '')
  if (acc.length < 5 || acc.length > 12) {
    return { ok: false, error: 'Account number must be 5–12 digits' }
  }
  const last4 = acc.slice(-4)
  const bsbDisp = formatBsbInput(bsb)
  return {
    ok: true,
    label: `Withdraw · ${name} · BSB ${bsbDisp} · Acc ··${last4}`,
  }
}
