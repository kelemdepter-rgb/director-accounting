/**
 * Locale-tolerant money parser.
 *
 * Accepts every common European/US/Turkish/Russian/Swiss notation and
 * normalises it to a JS number. Mirrors the constraints the rest of the
 * app already places on money input: must be strictly positive and have
 * at most two fractional digits, since `numeric(18, 2)` columns can't
 * store more.
 *
 * Examples
 *   "1234.56"       → 1234.56  (plain)
 *   "1,234.56"      → 1234.56  (US format — comma thousand, dot decimal)
 *   "1.234,56"      → 1234.56  (DE/TR format — dot thousand, comma decimal)
 *   "1'234.56"      → 1234.56  (Swiss apostrophe thousand)
 *   "1 234,56"      → 1234.56  (RU / FR space thousand; non-breaking space too)
 *   "99,99"         → 99.99    (single decimal sep)
 *   "1.23.45"       → null     (malformed — thousand groups must be 3 digits)
 *   "1,234"         → null     (single sep + 3 trailing digits = 3 decimals → reject)
 *   "5.123"         → null     (more than 2 decimal digits)
 *   "0", "-5"       → null     (non-positive)
 */

export interface LocaleAmount {
  /** The parsed positive number, rounded to 2 decimals. */
  value: number;
  /** Short tag describing which format the parser detected. Debug-only. */
  detected: string;
}

type DecimalSep = '.' | ',';

function countOccurrences(s: string, ch: string): number {
  let n = 0;
  for (const c of s) if (c === ch) n++;
  return n;
}

export function parseLocaleAmount(input: unknown): LocaleAmount | null {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (!s) return null;
  if (s.startsWith('-') || s.startsWith('(')) return null;

  // Swiss apostrophe and any whitespace (incl. non-breaking, narrow no-break)
  // are thousand separators only — strip them.
  const hadApostrophe = s.includes("'");
  const hadSpace = /[\s  ]/.test(s);
  s = s.replace(/['\s  ]/g, '');
  if (!s) return null;

  if (!/^[\d.,]+$/.test(s)) return null;

  const dotIdx = s.lastIndexOf('.');
  const commaIdx = s.lastIndexOf(',');
  const hasDot = dotIdx !== -1;
  const hasComma = commaIdx !== -1;
  const dotCount = countOccurrences(s, '.');
  const commaCount = countOccurrences(s, ',');

  let decimalSep: DecimalSep | null = null;
  let thousandSep: DecimalSep | null = null;
  let detected: string;

  if (hasDot && hasComma) {
    // The right-most separator is the decimal point; the other is thousands.
    if (dotIdx > commaIdx) {
      decimalSep = '.';
      thousandSep = ',';
      detected = 'us-mixed';
    } else {
      decimalSep = ',';
      thousandSep = '.';
      detected = 'eu-mixed';
    }
    // Whichever is thousands must appear only on the integer side.
    if (thousandSep === ',' && countOccurrences(s.slice(dotIdx + 1), ',') > 0) return null;
    if (thousandSep === '.' && countOccurrences(s.slice(commaIdx + 1), '.') > 0) return null;
  } else if (hasDot) {
    if (dotCount > 1) {
      thousandSep = '.';
      detected = 'thousand-dot';
    } else {
      decimalSep = '.';
      detected = 'us-decimal';
    }
  } else if (hasComma) {
    if (commaCount > 1) {
      thousandSep = ',';
      detected = 'thousand-comma';
    } else {
      decimalSep = ',';
      detected = 'eu-decimal';
    }
  } else {
    detected = 'plain';
  }

  let integerPart: string;
  let fractionalPart = '';
  if (decimalSep) {
    const splitIdx = decimalSep === '.' ? dotIdx : commaIdx;
    integerPart = s.slice(0, splitIdx);
    fractionalPart = s.slice(splitIdx + 1);
    if (!integerPart || !fractionalPart) return null;
    if (!/^\d+$/.test(fractionalPart)) return null;
    if (fractionalPart.length > 2) return null;
  } else {
    integerPart = s;
  }

  // Validate thousand grouping: every group after the first must be exactly
  // 3 digits, and the first group must be 1–3 digits.
  if (thousandSep) {
    const groups = integerPart.split(thousandSep);
    if (groups.length < 2) return null;
    const first = groups[0];
    if (!first || first.length < 1 || first.length > 3 || !/^\d+$/.test(first)) {
      return null;
    }
    for (let i = 1; i < groups.length; i++) {
      const g = groups[i];
      if (!g || g.length !== 3 || !/^\d+$/.test(g)) return null;
    }
    integerPart = groups.join('');
  } else if (!/^\d+$/.test(integerPart)) {
    return null;
  }

  const normalised = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart;
  const n = Number(normalised);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (hadApostrophe) detected += '+apostrophe';
  if (hadSpace) detected += '+space';

  return { value: Math.round(n * 100) / 100, detected };
}
