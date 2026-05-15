import { parseLocaleAmount } from '@/utils/parseLocaleAmount';

export { parseLocaleAmount };

/**
 * A small fixed catalogue of currencies the UI offers as picker options.
 * Anything outside this list is still valid — it just won't appear in the
 * dropdown — because the database accepts any ISO-4217-style 3-letter code.
 */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CNY',
  'TRY',
  'RUB',
  'KZT',
  'UZS',
  'JPY',
  'KRW',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Parse a `numeric` column value to a JS number.
 * PostgREST returns numeric columns as strings (to avoid IEEE-754 loss).
 */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Sum a list of numeric-or-string values with two-decimal money rounding
 * to avoid `0.1 + 0.2 = 0.30000000000000004` style drift.
 */
export function sumMoney(values: readonly (number | string | null | undefined)[]): number {
  const cents = values.reduce<number>((acc, v) => acc + Math.round(toNumber(v) * 100), 0);
  return cents / 100;
}

/**
 * Round to 2 decimal places using banker-safe math.
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a money value with the requested currency and locale.
 * Falls back to a plain `1,234.56 XYZ` representation if the runtime
 * does not recognise the currency code.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string,
  locale: string = 'en-US',
): string {
  const n = toNumber(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(n);
    return `${formatted} ${currency}`;
  }
}

/**
 * @deprecated Use `parseLocaleAmount` directly. This thin wrapper only
 * exists so any caller we forgot to migrate still resolves to a number.
 * It silently throws away the `detected` tag.
 */
export function parseUserAmount(input: string): number | null {
  return parseLocaleAmount(input)?.value ?? null;
}
