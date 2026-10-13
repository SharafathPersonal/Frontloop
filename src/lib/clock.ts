/**
 * "4:05 PM" in the given IANA zone. Built from numeric parts rather than a
 * locale string, so server and browser ICU builds cannot render it differently
 * (no hydration mismatch from "pm" vs "PM" or narrow no-break spaces).
 */
export function formatClock(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`;
}
