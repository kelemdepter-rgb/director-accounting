/**
 * Tiny CSV serializer that follows RFC 4180:
 * - Fields containing comma, double-quote, CR, or LF are wrapped in `"…"`.
 * - Double-quotes inside a field are doubled.
 * - Rows are joined with `\r\n` (Excel-friendly).
 *
 * A UTF-8 BOM is prepended so Excel opens it correctly on Windows.
 */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

const NEEDS_QUOTE_RE = /["\r\n,]/;

function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'number' ? String(value) : value;
  if (NEEDS_QUOTE_RE.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeField(c.header)).join(','));
  for (const row of rows) {
    lines.push(columns.map((c) => escapeField(c.value(row))).join(','));
  }
  // BOM + CRLF — Excel friendly.
  return '﻿' + lines.join('\r\n');
}

/**
 * Trigger a browser download for the given CSV content. Web only — on native
 * this is a no-op (Step 8's deployment instructions cover share-sheet flows).
 */
export function downloadCsv(filename: string, content: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
