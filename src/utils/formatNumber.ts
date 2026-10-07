/**
 * Number helpers — ported from `pt-player/src/utils/formatNumber.tsx`.
 * Only the pieces the widgets use are carried over.
 */

/** `1234.567` -> `"1.234"` (dot as thousands separator). */
export function formatWithDot(num: number): string {
  if (!num) return '0'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatPrice(value: number, type: 'dot' | 'comma'): string {
  // `de-DE` groups with dots, `en-US` with commas. `toLocaleString` is ES5-era
  // DOM API and is available on both TV engines.
  const locale = type === 'dot' ? 'de-DE' : 'en-US'

  return Number(value).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * Price values arrive already formatted (`"Rp 12.000"`, `"$0"`, `"0"`, `""`),
 * so the check compares on the digits only.
 */
export function isZeroPrice(value?: string | number | null): boolean {
  if (value === null || value === undefined) return true
  const digits = String(value).replace(/\D/g, '')
  return digits === '' || Number(digits) === 0
}
