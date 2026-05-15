import { describe, expect, it } from 'vitest';

import { parseLocaleAmount } from '@/utils/parseLocaleAmount';

describe('parseLocaleAmount — plain inputs', () => {
  it('parses an integer', () => {
    expect(parseLocaleAmount('100')?.value).toBe(100);
  });

  it('parses a US-style decimal', () => {
    expect(parseLocaleAmount('1234.56')?.value).toBe(1234.56);
  });

  it('parses an EU-style decimal (single comma)', () => {
    expect(parseLocaleAmount('1234,56')?.value).toBe(1234.56);
  });

  it('parses a one-digit fractional', () => {
    expect(parseLocaleAmount('99,5')?.value).toBe(99.5);
  });

  it('parses small values below one', () => {
    expect(parseLocaleAmount('0,99')?.value).toBe(0.99);
    expect(parseLocaleAmount('0.99')?.value).toBe(0.99);
  });
});

describe('parseLocaleAmount — US format (comma thousand, dot decimal)', () => {
  it('parses 1,234.56', () => {
    expect(parseLocaleAmount('1,234.56')?.value).toBe(1234.56);
  });

  it('parses multi-group 1,234,567.89', () => {
    expect(parseLocaleAmount('1,234,567.89')?.value).toBe(1234567.89);
  });

  it('tags detection as us-mixed', () => {
    expect(parseLocaleAmount('1,234.56')?.detected).toBe('us-mixed');
  });
});

describe('parseLocaleAmount — DE/TR format (dot thousand, comma decimal)', () => {
  it('parses 1.234,56', () => {
    expect(parseLocaleAmount('1.234,56')?.value).toBe(1234.56);
  });

  it('parses the spec example 1.000,50', () => {
    expect(parseLocaleAmount('1.000,50')?.value).toBe(1000.5);
  });

  it('parses multi-group 1.234.567,89', () => {
    expect(parseLocaleAmount('1.234.567,89')?.value).toBe(1234567.89);
  });

  it('tags detection as eu-mixed', () => {
    expect(parseLocaleAmount('1.234,56')?.detected).toBe('eu-mixed');
  });
});

describe('parseLocaleAmount — Swiss apostrophe thousand', () => {
  it("parses 1'234.56", () => {
    expect(parseLocaleAmount("1'234.56")?.value).toBe(1234.56);
  });

  it("parses 1'234'567,89", () => {
    expect(parseLocaleAmount("1'234'567,89")?.value).toBe(1234567.89);
  });
});

describe('parseLocaleAmount — RU / FR space thousand', () => {
  it('parses regular-space "10 000"', () => {
    expect(parseLocaleAmount('10 000')?.value).toBe(10000);
  });

  it('parses regular-space with decimal "1 234,56"', () => {
    expect(parseLocaleAmount('1 234,56')?.value).toBe(1234.56);
  });

  it('parses non-breaking space "1 234,56"', () => {
    expect(parseLocaleAmount('1 234,56')?.value).toBe(1234.56);
  });

  it('trims trailing whitespace', () => {
    expect(parseLocaleAmount('  42  ')?.value).toBe(42);
  });
});

describe('parseLocaleAmount — rejected inputs', () => {
  it('rejects null and non-string', () => {
    expect(parseLocaleAmount(null)).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseLocaleAmount(123 as any)).toBeNull();
    expect(parseLocaleAmount(undefined)).toBeNull();
  });

  it('rejects empty / whitespace-only', () => {
    expect(parseLocaleAmount('')).toBeNull();
    expect(parseLocaleAmount('   ')).toBeNull();
  });

  it('rejects zero and negatives', () => {
    expect(parseLocaleAmount('0')).toBeNull();
    expect(parseLocaleAmount('0,00')).toBeNull();
    expect(parseLocaleAmount('-5')).toBeNull();
  });

  it('rejects non-numeric characters', () => {
    expect(parseLocaleAmount('abc')).toBeNull();
    expect(parseLocaleAmount('1a')).toBeNull();
    expect(parseLocaleAmount('$5')).toBeNull();
  });

  it('rejects more than two fractional digits', () => {
    expect(parseLocaleAmount('5.123')).toBeNull();
    expect(parseLocaleAmount('5,123')).toBeNull();
  });

  it('rejects malformed multi-dot 1.23.45 (groups must be 3 digits)', () => {
    expect(parseLocaleAmount('1.23.45')).toBeNull();
  });

  it('rejects malformed multi-comma 1,23,45', () => {
    expect(parseLocaleAmount('1,23,45')).toBeNull();
  });

  it('rejects a lone separator', () => {
    expect(parseLocaleAmount('.')).toBeNull();
    expect(parseLocaleAmount(',')).toBeNull();
  });

  it('rejects trailing / leading separator', () => {
    expect(parseLocaleAmount('5.')).toBeNull();
    expect(parseLocaleAmount('.5')).toBeNull();
    expect(parseLocaleAmount(',5')).toBeNull();
  });

  it('rejects mixed-format where thousand sep appears after decimal', () => {
    expect(parseLocaleAmount('1.234,56.789')).toBeNull();
  });
});

describe('parseLocaleAmount — detection tags', () => {
  it('tags plain integer', () => {
    expect(parseLocaleAmount('100')?.detected).toBe('plain');
  });

  it('appends +apostrophe for Swiss input', () => {
    expect(parseLocaleAmount("1'234.56")?.detected).toContain('+apostrophe');
  });

  it('appends +space when whitespace thousand separator was present', () => {
    expect(parseLocaleAmount('10 000')?.detected).toContain('+space');
  });
});
