import { describe, expect, it } from 'vitest';

import { toCsv } from '@/utils/csv';

interface Row {
  name: string;
  amount: number;
  note: string | null;
}

const columns = [
  { header: 'Name', value: (r: Row) => r.name },
  { header: 'Amount', value: (r: Row) => r.amount },
  { header: 'Note', value: (r: Row) => r.note },
] as const;

describe('toCsv', () => {
  it('serialises plain fields without quoting', () => {
    const csv = toCsv([{ name: 'Ada', amount: 100, note: 'breakfast' }], columns);
    expect(csv.endsWith('Ada,100,breakfast')).toBe(true);
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const csv = toCsv(
      [{ name: 'Smith, John', amount: 42, note: 'has a "quote"' }],
      columns,
    );
    expect(csv).toContain('"Smith, John"');
    expect(csv).toContain('"has a ""quote"""');
  });

  it('renders null/undefined as empty', () => {
    const csv = toCsv([{ name: 'Bob', amount: 0, note: null }], columns);
    expect(csv.endsWith('Bob,0,')).toBe(true);
  });

  it('emits a UTF-8 BOM as the very first character', () => {
    const csv = toCsv<Row>([], columns);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('joins rows with CRLF', () => {
    const csv = toCsv<Row>(
      [
        { name: 'A', amount: 1, note: null },
        { name: 'B', amount: 2, note: null },
      ],
      columns,
    );
    expect(csv).toContain('\r\nA,1,');
    expect(csv).toContain('\r\nB,2,');
  });
});
