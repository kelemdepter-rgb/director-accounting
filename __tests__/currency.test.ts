import { describe, expect, it } from 'vitest';

import {
  formatMoney,
  parseUserAmount,
  roundMoney,
  sumMoney,
  toNumber,
} from '@/utils/currency';

describe('toNumber', () => {
  it('passes through finite numbers', () => {
    expect(toNumber(123.45)).toBe(123.45);
    expect(toNumber(0)).toBe(0);
  });

  it('parses numeric strings (PostgREST format)', () => {
    expect(toNumber('123.45')).toBe(123.45);
    expect(toNumber('  0.10 ')).toBe(0.1);
  });

  it('returns 0 for null / undefined / NaN / non-numeric', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber(Number.NaN)).toBe(0);
    expect(toNumber('not-a-number')).toBe(0);
    expect(toNumber('')).toBe(0);
  });
});

describe('sumMoney', () => {
  it('sums numbers and strings', () => {
    expect(sumMoney([10, '20', 30.5])).toBe(60.5);
  });

  it('avoids 0.1 + 0.2 drift', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it('returns 0 for empty / nullish entries', () => {
    expect(sumMoney([])).toBe(0);
    expect(sumMoney([null, undefined, ''])).toBe(0);
  });
});

describe('roundMoney', () => {
  it('preserves cleanly representable 2-decimal values', () => {
    expect(roundMoney(0)).toBe(0);
    expect(roundMoney(1.5)).toBe(1.5);
    expect(roundMoney(99.99)).toBe(99.99);
    expect(roundMoney(123.45)).toBe(123.45);
  });

  it('rounds extra precision back to 2 places', () => {
    // 99.999 → 100 unambiguously: 99.999 * 100 = 9999.9 → 10000.
    expect(roundMoney(99.999)).toBe(100);
    // 0.1 + 0.2 = 0.30000000000000004; rounding pulls it back to 0.3.
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    // 1.004 unambiguously rounds DOWN to 1.
    expect(roundMoney(1.004)).toBe(1.0);
  });
});

describe('formatMoney', () => {
  it('formats USD with en-US locale', () => {
    // Different ICU builds may use a regular space or a non-breaking space; check digits only.
    const out = formatMoney(1234.5, 'USD', 'en-US');
    expect(out).toMatch(/\$\s*1,234\.50/);
  });

  it('handles string input', () => {
    expect(formatMoney('250.00', 'USD', 'en-US')).toMatch(/\$\s*250\.00/);
  });

  it('returns 0.00 for nullish input', () => {
    expect(formatMoney(null, 'USD', 'en-US')).toMatch(/\$\s*0\.00/);
  });

  it('falls back gracefully on unknown currency code', () => {
    const out = formatMoney(100, 'ZZZ', 'en-US');
    expect(out).toContain('100.00');
    expect(out).toContain('ZZZ');
  });
});

describe('parseUserAmount', () => {
  it('parses simple integers', () => {
    expect(parseUserAmount('100')).toBe(100);
  });

  it('parses 2-decimal values', () => {
    expect(parseUserAmount('99.99')).toBe(99.99);
  });

  it('accepts comma decimal', () => {
    expect(parseUserAmount('99,99')).toBe(99.99);
  });

  it('rejects zero, negatives, more than 2 decimals, and non-numeric', () => {
    expect(parseUserAmount('0')).toBeNull();
    expect(parseUserAmount('-5')).toBeNull();
    expect(parseUserAmount('5.123')).toBeNull();
    expect(parseUserAmount('abc')).toBeNull();
    expect(parseUserAmount('')).toBeNull();
  });
});
