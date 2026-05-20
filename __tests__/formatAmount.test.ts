import { describe, expect, it } from 'vitest';

import { formatAmountInput, parseAmount, spellAmount } from '@/utils/formatAmount';

describe('formatAmountInput', () => {
  it('groups thousands in tr-TR with dots', () => {
    expect(formatAmountInput('520000', 'tr-TR')).toBe('520.000');
  });

  it('groups thousands in en-US with commas', () => {
    expect(formatAmountInput('520000', 'en-US')).toBe('520,000');
  });

  it('strips leading zeros (007 → 7)', () => {
    expect(formatAmountInput('007', 'tr-TR')).toBe('7');
  });

  it('preserves a leading 0. for sub-unit values', () => {
    expect(formatAmountInput('0.5', 'tr-TR')).toBe('0,5');
    expect(formatAmountInput('0.50', 'en-US')).toBe('0.50');
  });

  it('caps the fractional part at 2 digits', () => {
    expect(formatAmountInput('12385.65', 'tr-TR')).toBe('12.385,65');
    expect(formatAmountInput('12385.65', 'en-US')).toBe('12,385.65');
  });

  it('keeps a trailing separator so the user can keep typing', () => {
    expect(formatAmountInput('1', 'tr-TR')).toBe('1');
    expect(formatAmountInput('1,', 'tr-TR')).toBe('1,');
    expect(formatAmountInput('1.', 'en-US')).toBe('1.');
  });

  it('discards everything except digits and separators', () => {
    expect(formatAmountInput('abc1,234.5xyz%', 'en-US')).toBe('1,234.5');
    expect(formatAmountInput('₺  520 000', 'tr-TR')).toBe('520.000');
  });

  it('handles paste of "12.385,65" in tr-TR', () => {
    // The user pastes a tr-TR-formatted value back in; we should still
    // produce a canonical formatted output.
    expect(formatAmountInput('12.385,65', 'tr-TR')).toBe('12.385,65');
  });
});

describe('parseAmount', () => {
  it('parses formatted tr-TR strings', () => {
    expect(parseAmount('12.385,65')).toBe(12385.65);
  });
  it('parses formatted en-US strings', () => {
    expect(parseAmount('12,385.65')).toBe(12385.65);
  });
  it('returns null on garbage', () => {
    expect(parseAmount('abc')).toBeNull();
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
