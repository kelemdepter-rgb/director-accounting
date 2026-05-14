/**
 * Format an ISO date string for display. Uses the runtime locale so dates
 * follow the user's regional preferences (long for full screens, short for
 * dense lists).
 */
export function formatDate(
  value: string | Date,
  variant: 'short' | 'long' = 'short',
  locale: string = 'en-US',
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const options: Intl.DateTimeFormatOptions =
    variant === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: 'numeric' };

  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Return the local-time start-of-day for the given date.
 */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Return the next day's local-time start-of-day.
 */
export function startOfTomorrow(reference: Date = new Date()): Date {
  const d = startOfDay(reference);
  d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Convenience: ISO strings spanning "today" in local time.
 * Useful for `occurred_at gte X and lt Y` queries.
 */
export function todayRange(reference: Date = new Date()): { gte: string; lt: string } {
  return {
    gte: startOfDay(reference).toISOString(),
    lt: startOfTomorrow(reference).toISOString(),
  };
}
