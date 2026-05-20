import { describe, expect, it } from 'vitest';

import {
  formatAmountInput,
  formatAmountInputWithCursor,
  parseAmount,
  spellAmount,
} from '@/utils/formatAmount';

describe('formatAmountInput', () => {
  it('inserts tr thousand separators', () => {
    expect(formatAmountInput('28000', 'tr')).toBe('28.000');
    expect(formatAmountInput('2800000', 'tr')).toBe('2.800.000');
    expect(formatAmountInput('999', 'tr')).toBe('999');
    expect(formatAmountInput('1000', 'tr')).toBe('1.000');
  });

  it('inserts en thousand separators', () => {
    expect(formatAmountInput('28000', 'en')).toBe('28,000');
    expect(formatAmountInput('2800000', 'en')).toBe('2,800,000');
  });

  it('strips leading zeros (007 → 7)', () => {
    expect(formatAmountInput('007', 'tr')).toBe('7');
  });

  it('preserves "0," / "0." for sub-unit values', () => {
    expect(formatAmountInput('0,5', 'tr')).toBe('0,5');
    expect(formatAmountInput('0.50', 'en')).toBe('0.50');
    expect(formatAmountInput('0', 'tr')).toBe('0');
  });

  it('caps the fractional part at 2 digits', () => {
    expect(formatAmountInput('28000,567', 'tr')).toBe('28.000,56');
    expect(formatAmountInput('12385.6543', 'en')).toBe('12,385.65');
  });

  it('keeps a trailing separator so the user can keep typing', () => {
    expect(formatAmountInput('28000,', 'tr')).toBe('28.000,');
    expect(formatAmountInput('28000,5', 'tr')).toBe('28.000,5');
    expect(formatAmountInput('1.', 'en')).toBe('1.');
  });

  it('discards characters that are not digits or the locale decimal sep', () => {
    // In tr, dot is the thousand grouper — it is dropped on input and
    // re-inserted by the grouping pass, so abc1.234,5xyz% → 1.234,5.
    expect(formatAmountInput('abc1.234,5xyz%', 'tr')).toBe('1.234,5');
    expect(formatAmountInput('abc1,234.5xyz%', 'en')).toBe('1,234.5');
  });

  it('handles paste of an already-formatted value (idempotent)', () => {
    expect(formatAmountInput('12.385,65', 'tr')).toBe('12.385,65');
    expect(formatAmountInput('12,385.65', 'en')).toBe('12,385.65');
  });
});

describe('parseAmount', () => {
  it('parses tr thousand separators correctly — the V3 regression', () => {
    // Round 2 returned null here because the parser thought ".000" was
    // a 3-digit fractional → "more than 2 decimal digits" → reject.
    expect(parseAmount('28.000', 'tr')).toBe(28000);
    expect(parseAmount('2.800.000', 'tr')).toBe(2_800_000);
    expect(parseAmount('1.000.000.000', 'tr')).toBe(1_000_000_000);
  });

  it('parses tr decimal correctly', () => {
    expect(parseAmount('28.000,50', 'tr')).toBe(28000.5);
    expect(parseAmount('0,5', 'tr')).toBe(0.5);
  });

  it('rejects mixed / ambiguous tr input', () => {
    expect(parseAmount('0.5', 'tr')).toBeNull(); // dot is thousand sep here
    expect(parseAmount('28,000.5', 'tr')).toBeNull();
    expect(parseAmount('abc', 'tr')).toBeNull();
    expect(parseAmount('', 'tr')).toBeNull();
    expect(parseAmount(null, 'tr')).toBeNull();
  });

  it('parses en correctly (dot IS decimal)', () => {
    expect(parseAmount('28,000', 'en')).toBe(28000);
    expect(parseAmount('28,000.50', 'en')).toBe(28000.5);
    // 28.000 in en means "28 with three trailing zeros after the
    // decimal" — V3 explicitly asserts this parses to 28.
    expect(parseAmount('28.000', 'en')).toBe(28);
  });

  it('round-trips with formatAmountInput', () => {
    // This is the exact bug the user reported: format then parse must
    // return the original value.
    const formatted = formatAmountInput('28000', 'tr');
    expect(formatted).toBe('28.000');
    expect(parseAmount(formatted, 'tr')).toBe(28000);

    // In tr, the user's keyboard produces a comma for the decimal.
    const formatted2 = formatAmountInput('12385,65', 'tr');
    expect(formatted2).toBe('12.385,65');
    expect(parseAmount(formatted2, 'tr')).toBe(12385.65);
  });
});

describe('formatAmountInputWithCursor', () => {
  it('keeps the caret past the same digit-count after reformat', () => {
    // User types "28000|" (caret at position 5, after the last 0).
    // After format: "28.000|" — caret should land after the last 0,
    // i.e. position 6.
    const { value, caret } = formatAmountInputWithCursor('28000', 5, 'tr');
    expect(value).toBe('28.000');
    expect(caret).toBe(6);
  });

  it('handles caret in the middle of the integer part', () => {
    // User types "28000" then moves caret to position 2 ("28|000").
    // Reformat gives "28.000"; caret should land after digit-count 2,
    // which is "28|" — position 2.
    const { value, caret } = formatAmountInputWithCursor('28000', 2, 'tr');
    expect(value).toBe('28.000');
    expect(caret).toBe(2);
  });
});

describe('spellAmount — Turkish (tr)', () => {
  it('520000 TRY tr → beş yüz yirmi bin lira', () => {
    expect(spellAmount(520000, 'TRY', 'tr')).toBe('beş yüz yirmi bin lira');
  });

  it('123987 TRY tr → yüz yirmi üç bin dokuz yüz seksen yedi lira', () => {
    expect(spellAmount(123987, 'TRY', 'tr')).toBe(
      'yüz yirmi üç bin dokuz yüz seksen yedi lira',
    );
  });

  it('12385.65 TRY tr → on iki bin üç yüz seksen beş lira altmış beş kuruş', () => {
    expect(spellAmount(12385.65, 'TRY', 'tr')).toBe(
      'on iki bin üç yüz seksen beş lira altmış beş kuruş',
    );
  });

  it('0.5 TRY tr → elli kuruş (no leading sıfır lira)', () => {
    expect(spellAmount(0.5, 'TRY', 'tr')).toBe('elli kuruş');
  });

  it('1000000 TRY tr → bir milyon lira', () => {
    expect(spellAmount(1000000, 'TRY', 'tr')).toBe('bir milyon lira');
  });

  it('0 TRY tr → sıfır lira', () => {
    expect(spellAmount(0, 'TRY', 'tr')).toBe('sıfır lira');
  });

  it('1000 TRY tr → bin lira (no bir before bin)', () => {
    expect(spellAmount(1000, 'TRY', 'tr')).toBe('bin lira');
  });

  it('100 TRY tr → yüz lira (no bir before yüz)', () => {
    expect(spellAmount(100, 'TRY', 'tr')).toBe('yüz lira');
  });

  it('switches major/minor for USD/EUR/CNY in tr', () => {
    expect(spellAmount(520000, 'USD', 'tr')).toBe('beş yüz yirmi bin dolar');
    expect(spellAmount(1, 'EUR', 'tr')).toBe('bir euro');
    expect(spellAmount(2.05, 'CNY', 'tr')).toBe('iki yuan beş fen');
  });
});

describe('spellAmount — English (en)', () => {
  it('520000 USD en → five hundred twenty thousand dollars', () => {
    expect(spellAmount(520000, 'USD', 'en')).toBe(
      'five hundred twenty thousand dollar',
    );
  });

  it('12385.65 USD en → twelve thousand three hundred eighty-five dollar sixty-five cent', () => {
    expect(spellAmount(12385.65, 'USD', 'en')).toBe(
      'twelve thousand three hundred eighty-five dollar sixty-five cent',
    );
  });

  it('0.5 EUR en → fifty cent', () => {
    expect(spellAmount(0.5, 'EUR', 'en')).toBe('fifty cent');
  });

  it('1000000 CNY en → one million yuan', () => {
    expect(spellAmount(1000000, 'CNY', 'en')).toBe('one million yuan');
  });

  it('preserves the hyphen between tens and ones', () => {
    expect(spellAmount(21, 'USD', 'en')).toBe('twenty-one dollar');
    expect(spellAmount(99, 'USD', 'en')).toBe('ninety-nine dollar');
  });
});

describe('spellAmount — Uyghur (ug)', () => {
  it('520000 TRY ug → بەش يۈز يىگىرمە مىڭ لىرا', () => {
    expect(spellAmount(520000, 'TRY', 'ug')).toBe(
      'بەش يۈز يىگىرمە مىڭ لىرا',
    );
  });

  it('1000 TRY ug → مىڭ لىرا (no بىر before مىڭ)', () => {
    expect(spellAmount(1000, 'TRY', 'ug')).toBe('مىڭ لىرا');
  });

  it('100 TRY ug → يۈز لىرا (no بىر before يۈز)', () => {
    expect(spellAmount(100, 'TRY', 'ug')).toBe('يۈز لىرا');
  });

  it('1000000 USD ug → بىر مىليون دوللار', () => {
    expect(spellAmount(1000000, 'USD', 'ug')).toBe('بىر مىليون دوللار');
  });

  it('0.5 EUR ug → ئەللىك سېنت', () => {
    expect(spellAmount(0.5, 'EUR', 'ug')).toBe('ئەللىك سېنت');
  });

  it('2.05 CNY ug → ئىككى يۈەن بەش فېن', () => {
    expect(spellAmount(2.05, 'CNY', 'ug')).toBe('ئىككى يۈەن بەش فېن');
  });
});

describe('spellAmount — negative / NaN', () => {
  it('returns empty for negative input', () => {
    expect(spellAmount(-5, 'TRY', 'tr')).toBe('');
  });
  it('returns empty for NaN', () => {
    expect(spellAmount(Number.NaN, 'TRY', 'tr')).toBe('');
  });
});
