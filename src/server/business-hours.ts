import 'server-only';

type Slot = { open: string; close: string };
type DaySchedule = { day: number; closed?: boolean | null; slots?: Slot[] | null };
type ExceptionSchedule = { date: string; closed?: boolean | null; slots?: Slot[] | null; note?: string | null };

export type BusinessHoursInput = {
  weekly?: DaySchedule[] | null;
  exceptions?: ExceptionSchedule[] | null;
} | null | undefined;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Wall-clock date/time in the tenant's IANA zone. */
function localNow(now: Date, zone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      // Not `{ timeZone }` shorthand: Next 16.2.10's production minifier inlines this
      // function, renames the parameter, and leaves the shorthand dangling (ReferenceError).
      timeZone: zone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: WEEKDAY_INDEX[parts.weekday],
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    hhmm: `${parts.hour}:${parts.minute}`,
  };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function slotsFor(hours: NonNullable<BusinessHoursInput>, day: number, date: string): Slot[] {
  const exception = hours.exceptions?.find((e) => e.date === date);
  const source = exception ?? hours.weekly?.find((w) => w.day === day);
  if (!source || source.closed) return [];
  return [...(source.slots ?? [])].sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
}

/**
 * Renders the weekly schedule plus a code-computed open/closed verdict for the
 * prompt. LLMs are unreliable at timezone and clock arithmetic, so the model is
 * told the answer instead of being asked to derive it.
 */
export function describeBusinessHours(hours: BusinessHoursInput, timeZone: string, now = new Date()): string {
  if (!hours?.weekly?.length) return '';

  const schedule = DAY_NAMES.map((name, day) => {
    const entry = hours.weekly?.find((w) => w.day === day);
    if (!entry || entry.closed || !entry.slots?.length) return `- ${name}: Closed`;
    return `- ${name}: ${entry.slots.map((s) => `${s.open}–${s.close}`).join(', ')}`;
  }).join('\n');

  const local = localNow(now, timeZone);
  const todaySlots = slotsFor(hours, local.day, local.date);
  const openNow = todaySlots.some((s) => local.minutes >= toMinutes(s.open) && local.minutes < toMinutes(s.close));

  let next = '';
  if (!openNow) {
    for (let offset = 0; offset <= 7 && !next; offset++) {
      const day = (local.day + offset) % 7;
      const slot = slotsFor(hours, day, addDays(local.date, offset)).find(
        (s) => offset > 0 || toMinutes(s.open) > local.minutes,
      );
      if (slot) next = `${offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : DAY_NAMES[day]} at ${slot.open}`;
    }
  }

  const todayNote = hours.exceptions?.find((e) => e.date === local.date)?.note;

  return [
    `Weekly hours (${timeZone}):`,
    schedule,
    `Current local time: ${DAY_NAMES[local.day]} ${local.hhmm}.`,
    openNow ? 'Status right now: OPEN.' : `Status right now: CLOSED.${next ? ` Next opening: ${next}.` : ''}`,
    todayNote ? `Note for today: ${todayNote}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
