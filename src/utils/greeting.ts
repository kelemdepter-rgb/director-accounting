/**
 * Pick the right greeting i18n key for the time of day.
 * Boundaries are in local time:
 *   5 ≤ h < 12  → morning
 *  12 ≤ h < 17  → afternoon
 *  17 ≤ h < 22  → evening
 *   else         → night
 */
export function greetingKeyForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'home.greetingMorning';
  if (hour >= 12 && hour < 17) return 'home.greetingAfternoon';
  if (hour >= 17 && hour < 22) return 'home.greetingEvening';
  return 'home.greetingNight';
}

export function currentGreetingKey(now: Date = new Date()): string {
  return greetingKeyForHour(now.getHours());
}
