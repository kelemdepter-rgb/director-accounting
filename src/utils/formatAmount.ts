/**
 * Locale-aware money input formatter and spell-out helper.
 *
 * Why this file was rewritten in Round 3:
 *
 *   Round 2's `parseAmount` round-tripped via `parseLocaleAmount` — an
 *   ambiguity-tolerant parser that tries to guess which character is the
 *   decimal vs. the thousand separator from the input alone. That meant
 *   `parseAmount("28.000")` returned `null` (single dot + three trailing
 *   digits = "more than 2 fractional digits" → reject) even though
 *   `formatAmountInput("28000", "tr-TR")` produced exactly that string.
 *   On the live site the user typed `28000`, the input displayed
 *   `28.000`, and Kaydet fired "Tutar 0'dan büyük olmalı" because the
 *   parser refused its own formatter's output.
 *
 *   The fix is to make BOTH functions take an explicit `AppLocale` and
 *   decide which character is the decimal / thousand separator from the
 *   locale, not from the input. This is the V3 §2 plan.
 *
 * Exports:
 *   - formatAmountInput(raw, locale): canonicalises raw input into the
 *     locale's grouped representation.
 *   - parseAmount(input, locale): inverse of formatAmountInput. Returns
 *     null on empty / invalid input.
 *   - spellAmount(amount, currency, locale): unchanged — phrase
 *     generation in tr/en/ug × TRY/USD/EUR/CNY.
 */

export type SpellLocale = 'tr' | 'en' | 'ug';
export type SpellCurrency = 'TRY' | 'USD' | 'EUR' | 'CNY';

/** Short locale used for amount parsing/formatting. */
export type AppLocale = 'tr' | 'en' | 'ug';

interface LocaleSeparators {
  thousand: string;
  decimal: string;
}

/**
 * The user-visible convention in this app. Uyghur input shares Turkish
 * grouping (dot thousand, comma decimal) per the user's confirmation in
 * Round 3 — switch to `, .` here if that proves wrong.
 */
const SEPARATORS: Record<AppLocale, LocaleSeparators> = {
  tr: { thousand: '.', decimal: ',' },
  en: { thousand: ',', decimal: '.' },
  ug: { thousand: '.', decimal: ',' },
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// -----------------------------------------------------------------------------
// parseAmount
// -----------------------------------------------------------------------------

/**
 * Parse a locale-formatted amount string into a number.
 *
 * Examples (tr):
 *   parseAmount("28.000",   'tr') === 28000
 *   parseAmount("28.000,5", 'tr') === 28000.5
 *   parseAmount("0,5",      'tr') === 0.5
 *   parseAmount("0.5",      'tr') === null    // decimal sep is ','
 *   parseAmount("",         'tr') === null
 *   parseAmount("abc",      'tr') === null
 *   parseAmount("28,000.5", 'tr') === null    // wrong separators
 *
 * en uses the inverse — dot is decimal, comma is thousand.
 */
export function parseAmount(input: string | null | undefined, locale: AppLocale): number | null {
  if (input == null) return null;
  const trimmed = String(input).trim();
  if (trimmed === '') return null;

  const { thousand, decimal } = SEPARATORS[locale];
  // Only digits and the two locale separators are allowed. A leading minus
  // would be rejected — amounts in this app are always positive.
  const allowed = new RegExp(`^[0-9${escapeRegex(thousand)}${escapeRegex(decimal)}]+$`);
  if (!allowed.test(trimmed)) return null;

  // Split on the decimal separator first; at most one occurrence allowed.
  const decimalIdx = trimmed.indexOf(decimal);
  const lastDecimalIdx = trimmed.lastIndexOf(decimal);
  if (decimalIdx !== lastDecimalIdx) return null;

  const intPart = decimalIdx === -1 ? trimmed : trimmed.slice(0, decimalIdx);
  const fracPart = decimalIdx === -1 ? '' : trimmed.slice(decimalIdx + 1);

  // The fractional part is digits only — no thousand separators inside.
  if (fracPart && !/^\d+$/.test(fracPart)) return null;

  // Validate thousand grouping in the integer side. Groups after the first
  // must be exactly 3 digits; the first group is 1-3. "0.5" in tr fails
  // here because the second group is one digit.
  if (intPart.includes(thousand)) {
    const groups = intPart.split(thousand);
    if (groups.length < 2) return null;
    const [first, ...rest] = groups;
    if (!first || !/^\d{1,3}$/.test(first)) return null;
    for (const g of rest) {
      if (!g || !/^\d{3}$/.test(g)) return null;
    }
  } else if (!/^\d+$/.test(intPart)) {
    return null;
  }

  const normalized = `${intPart.split(thousand).join('')}${fracPart ? '.' + fracPart : ''}`;
  if (normalized === '' || normalized === '.') return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  // Drop float noise so 28000.50 doesn't round-trip to 28000.4999999…
  return Math.round(value * 100) / 100;
}

// -----------------------------------------------------------------------------
// formatAmountInput
// -----------------------------------------------------------------------------

/**
 * Reformat raw user input into the locale's canonical thousand-grouped
 * representation. Applied on every keystroke from the controlled
 * <TextInput> in QuickAddSheet.
 *
 *   1. Strip every character that isn't a digit or the locale decimal sep
 *      (existing thousand separators in the input are no-ops; we re-insert
 *      them at the end).
 *   2. Keep only the first decimal separator; everything after the second
 *      one is dropped so the user can't paste "1,2,3".
 *   3. Cap the fractional part at 2 digits.
 *   4. Strip leading zeros except when the integer is exactly "0" (so the
 *      user can still type a "0,xx" sub-unit value).
 *   5. Insert the locale's thousand separator every 3 digits from the
 *      right of the integer part.
 *   6. Preserve a trailing decimal separator so "1," doesn't immediately
 *      reflow to "1".
 */
export function formatAmountInput(raw: string | null | undefined, locale: AppLocale): string {
  if (raw == null) return '';
  const { thousand, decimal } = SEPARATORS[locale];

  // Drop the existing thousand separator first — it will be reinserted.
  // Anything that isn't a digit or the decimal separator is rejected.
  const cleaned = String(raw)
    .split('')
    .filter((c) => /[0-9]/.test(c) || c === decimal)
    .join('');
  if (cleaned === '') return '';

  // Keep only the first decimal separator.
  const firstDecimal = cleaned.indexOf(decimal);
  let canonical: string;
  if (firstDecimal === -1) {
    canonical = cleaned;
  } else {
    canonical =
      cleaned.slice(0, firstDecimal + 1) +
      cleaned.slice(firstDecimal + 1).split(decimal).join('');
  }

  const hasDecimal = canonical.includes(decimal);
  const [intPartRaw, fracPartRaw = ''] = canonical.split(decimal);
  const intPart = (intPartRaw ?? '').replace(/^0+(?=\d)/, '') || '0';
  const fracPart = fracPartRaw.slice(0, 2);

  const intWithGroups = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousand);

  if (hasDecimal) return `${intWithGroups}${decimal}${fracPart}`;
  return intWithGroups;
}

/**
 * Format + return a new caret position so a controlled input can preserve
 * the user's place after reformatting. The strategy is digit-count: count
 * how many digits were left of the caret in the raw input, then put the
 * caret after the same number of digits in the formatted output. This is
 * the standard recipe for thousand-grouped number inputs; ported from the
 * widely-cited example at
 * https://github.com/s-yadav/react-number-format/blob/master/src/utils.ts.
 */
export function formatAmountInputWithCursor(
  raw: string,
  caret: number,
  locale: AppLocale,
): { value: string; caret: number } {
  const value = formatAmountInput(raw, locale);
  const { thousand } = SEPARATORS[locale];

  // Count digits in raw up to caret.
  let digitsLeft = 0;
  for (let i = 0; i < Math.min(caret, raw.length); i++) {
    const ch = raw.charAt(i);
    if (ch >= '0' && ch <= '9') digitsLeft += 1;
  }

  // Walk the formatted output, advancing caret past digits + thousand-sep
  // until we've matched `digitsLeft` digits. (Decimal separator counts as
  // its own non-digit character, advanced through transparently.)
  let newCaret = 0;
  let seenDigits = 0;
  while (newCaret < value.length && seenDigits < digitsLeft) {
    const ch = value.charAt(newCaret);
    if (ch >= '0' && ch <= '9') seenDigits += 1;
    if (ch === thousand) {
      // Skip past the grouping char silently.
    }
    newCaret += 1;
  }
  return { value, caret: newCaret };
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
