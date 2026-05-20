/**
 * Locale-aware money input formatter and spell-out helper.
 *
 * Three exports:
 *   - formatAmountInput(raw, locale): canonicalises whatever the user typed
 *     into a thousand-grouped string matching the locale (tr-TR / en-US / ug
 *     style). Used by the controlled <TextInput> in QuickAddSheet so the
 *     value the user sees is always grouped.
 *   - parseAmount(formatted): re-exported from parseLocaleAmount. Returns
 *     the numeric value or null.
 *   - spellAmount(amount, currency, locale): renders a phrase such as
 *     "beş yüz yirmi bin lira" for 520000 in TRY/tr — no npm deps; the
 *     digit/tens/scale tables are inlined per language.
 */

import { parseLocaleAmount } from '@/utils/parseLocaleAmount';

export type SpellLocale = 'tr' | 'en' | 'ug';
export type SpellCurrency = 'TRY' | 'USD' | 'EUR' | 'CNY';

// -----------------------------------------------------------------------------
// formatAmountInput
// -----------------------------------------------------------------------------

interface LocaleSeparators {
  decimal: string;
  group: string;
}

/**
 * Pull the decimal and group separators the platform uses for the given
 * locale via Intl.NumberFormat#formatToParts. Cached because we re-derive
 * them on every keystroke otherwise.
 */
const SEP_CACHE = new Map<string, LocaleSeparators>();

function separatorsFor(locale: string): LocaleSeparators {
  const cached = SEP_CACHE.get(locale);
  if (cached) return cached;
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.89);
    const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
    const group = parts.find((p) => p.type === 'group')?.value ?? ',';
    const seps = { decimal, group };
    SEP_CACHE.set(locale, seps);
    return seps;
  } catch {
    const fallback = { decimal: '.', group: ',' };
    SEP_CACHE.set(locale, fallback);
    return fallback;
  }
}

/**
 * Format raw user input into a locale-appropriate, thousand-grouped
 * representation. Discards anything that isn't a digit or separator,
 * keeps at most one decimal point, caps the fractional part at 2 digits,
 * strips leading zeros (unless the value starts with `0.`), and preserves
 * a trailing decimal separator so the user can type "1." without it
 * vanishing on the next keystroke.
 */
export function formatAmountInput(raw: string, locale: string): string {
  if (raw == null) return '';
  // Strip everything except digits and the two possible decimal characters.
  // We accept both `.` and `,` regardless of locale so a paste from any
  // source still works.
  let cleaned = String(raw).replace(/[^0-9.,]/g, '');
  if (!cleaned) return '';

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  const sepIdx = Math.max(lastDot, lastComma);

  let integerPart: string;
  let fractionalPart: string | null = null;
  let trailingSep = false;

  if (sepIdx === -1) {
    integerPart = cleaned.replace(/\D/g, '');
  } else {
    const before = cleaned.slice(0, sepIdx).replace(/\D/g, '');
    const after = cleaned.slice(sepIdx + 1).replace(/\D/g, '');

    // Treat the last `.` or `,` as the decimal point as long as the user
    // typed at most 2 trailing digits. More than 2 trailing digits → the
    // separator is almost certainly a thousand grouper they typed in
    // mid-paste; flatten the whole thing into an integer.
    if (after.length === 0) {
      integerPart = before;
      fractionalPart = '';
      trailingSep = true;
    } else if (after.length <= 2) {
      integerPart = before;
      fractionalPart = after;
    } else {
      integerPart = before + after;
    }
  }

  // Leading-zero strip unless the value is "0" itself or starts with "0.".
  integerPart = integerPart.replace(/^0+(?=\d)/, '');
  if (integerPart === '') integerPart = '0';

  const { decimal, group } = separatorsFor(locale);

  // Format the integer side with the locale's grouping rules.
  let formattedInteger: string;
  try {
    formattedInteger = new Intl.NumberFormat(locale, {
      useGrouping: true,
      maximumFractionDigits: 0,
    }).format(Number(integerPart));
  } catch {
    formattedInteger = manualGroup(integerPart, group);
  }

  if (fractionalPart === null) return formattedInteger;
  if (fractionalPart === '' && trailingSep) {
    return `${formattedInteger}${decimal}`;
  }
  return `${formattedInteger}${decimal}${fractionalPart}`;
}

function manualGroup(digits: string, sep: string): string {
  if (digits.length <= 3) return digits;
  const out: string[] = [];
  let i = digits.length;
  while (i > 3) {
    out.unshift(digits.slice(i - 3, i));
    i -= 3;
  }
  out.unshift(digits.slice(0, i));
  return out.join(sep);
}

// -----------------------------------------------------------------------------
// parseAmount
// -----------------------------------------------------------------------------

/** Parse a formatted-or-raw money string. Returns null on invalid input. */
export function parseAmount(formatted: string): number | null {
  return parseLocaleAmount(formatted)?.value ?? null;
}

// -----------------------------------------------------------------------------
// spellAmount
// -----------------------------------------------------------------------------

const ZERO_WORD: Record<SpellLocale, string> = {
  tr: 'sıfır',
  en: 'zero',
  ug: 'نۆل',
};

const TR_ONES = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const TR_TENS = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];
const TR_SCALES = ['', 'bin', 'milyon', 'milyar', 'trilyon'];
const TR_HUNDRED = 'yüz';

const UG_ONES = ['', 'بىر', 'ئىككى', 'ئۈچ', 'تۆت', 'بەش', 'ئالتە', 'يەتتە', 'سەككىز', 'توققۇز'];
const UG_TENS = ['', 'ئون', 'يىگىرمە', 'ئوتتۇز', 'قىرىق', 'ئەللىك', 'ئاتمىش', 'يەتمىش', 'سەكسەن', 'توقسان'];
const UG_SCALES = ['', 'مىڭ', 'مىليون', 'مىليارد', 'تىرىليون'];
const UG_HUNDRED = 'يۈز';

const EN_ONES = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const EN_SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

const CURRENCY_WORDS: Record<SpellLocale, Record<SpellCurrency, { major: string; minor: string }>> = {
  tr: {
    TRY: { major: 'lira', minor: 'kuruş' },
    USD: { major: 'dolar', minor: 'sent' },
    EUR: { major: 'euro', minor: 'sent' },
    CNY: { major: 'yuan', minor: 'fen' },
  },
  en: {
    TRY: { major: 'lira', minor: 'kuruş' },
    USD: { major: 'dollar', minor: 'cent' },
    EUR: { major: 'euro', minor: 'cent' },
    CNY: { major: 'yuan', minor: 'fen' },
  },
  ug: {
    TRY: { major: 'لىرا', minor: 'قۇرۇش' },
    USD: { major: 'دوللار', minor: 'سېنت' },
    EUR: { major: 'ياۋرو', minor: 'سېنت' },
    CNY: { major: 'يۈەن', minor: 'فېن' },
  },
};

// Safe indexed lookups for tables we know cover 0..N. tsconfig has
// `noUncheckedIndexedAccess` on, which means every `arr[i]` is typed
// `T | undefined`; fall through to '' so the helpers stay terse.
const at = (arr: readonly string[], i: number): string => arr[i] ?? '';

function trThreeDigit(n: number, scaleIndex: number): string {
  // n: 0..999. scaleIndex 1 = thousands. Used to apply the "drop bir before
  // bin/yüz" rule.
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const parts: string[] = [];
  if (h > 0) {
    if (h === 1) parts.push(TR_HUNDRED);
    else parts.push(at(TR_ONES, h), TR_HUNDRED);
  }
  if (t > 0) parts.push(at(TR_TENS, t));
  if (o > 0) {
    // Drop the leading "bir" before "bin" (scaleIndex 1) when the group is
    // exactly 1. e.g. 1000 → "bin", not "bir bin".
    if (scaleIndex === 1 && n === 1) return '';
    parts.push(at(TR_ONES, o));
  }
  return parts.join(' ');
}

function ugThreeDigit(n: number, scaleIndex: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const parts: string[] = [];
  if (h > 0) {
    if (h === 1) parts.push(UG_HUNDRED);
    else parts.push(at(UG_ONES, h), UG_HUNDRED);
  }
  if (t > 0) parts.push(at(UG_TENS, t));
  if (o > 0) {
    if (scaleIndex === 1 && n === 1) return '';
    parts.push(at(UG_ONES, o));
  }
  return parts.join(' ');
}

function enThreeDigit(n: number): string {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const parts: string[] = [];
  if (h > 0) parts.push(`${at(EN_ONES, h)} hundred`);
  if (rem > 0) {
    if (rem < 20) parts.push(at(EN_ONES, rem));
    else {
      const t = Math.floor(rem / 10);
      const o = rem % 10;
      parts.push(o === 0 ? at(EN_TENS, t) : `${at(EN_TENS, t)}-${at(EN_ONES, o)}`);
    }
  }
  return parts.join(' ');
}

function spellInteger(n: number, locale: SpellLocale): string {
  if (n === 0) return ZERO_WORD[locale];
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const out: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i] ?? 0;
    if (g === 0) continue;
    if (locale === 'en') {
      const phrase = enThreeDigit(g);
      const scale = EN_SCALES[i] ?? '';
      out.push(scale ? `${phrase} ${scale}` : phrase);
    } else if (locale === 'ug') {
      const phrase = ugThreeDigit(g, i);
      const scale = UG_SCALES[i] ?? '';
      if (i === 1 && g === 1) {
        out.push(scale); // "مىڭ" alone
      } else {
        out.push(scale ? (phrase ? `${phrase} ${scale}` : scale) : phrase);
      }
    } else {
      const phrase = trThreeDigit(g, i);
      const scale = TR_SCALES[i] ?? '';
      if (i === 1 && g === 1) {
        out.push(scale); // "bin" alone
      } else {
        out.push(scale ? (phrase ? `${phrase} ${scale}` : scale) : phrase);
      }
    }
  }
  return out.join(' ');
}

/**
 * Render a money amount as words in the given language and currency.
 *
 * Conventions (matching the Round 2 prompt examples):
 *   520000      TRY tr → "beş yüz yirmi bin lira"
 *   12385.65    TRY tr → "on iki bin üç yüz seksen beş lira altmış beş kuruş"
 *   0.5         TRY tr → "elli kuruş"          (no leading "sıfır lira")
 *   1000000     TRY tr → "bir milyon lira"
 *   0           TRY tr → "sıfır lira"
 */
export function spellAmount(
  amount: number,
  currency: SpellCurrency,
  locale: SpellLocale,
): string {
  if (!Number.isFinite(amount) || amount < 0) return '';
  const words = CURRENCY_WORDS[locale][currency];
  // Round to 2 decimals then split into integer + subunit cents.
  const cents = Math.round(amount * 100);
  const major = Math.floor(cents / 100);
  const minor = cents % 100;

  const out: string[] = [];
  if (major > 0) {
    out.push(`${spellInteger(major, locale)} ${words.major}`);
  } else if (minor === 0) {
    // Pure zero: still emit "sıfır lira" so the field never reads blank.
    out.push(`${ZERO_WORD[locale]} ${words.major}`);
  }
  if (minor > 0) {
    out.push(`${spellInteger(minor, locale)} ${words.minor}`);
  }
  return out.join(' ');
}
