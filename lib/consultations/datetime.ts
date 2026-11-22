// Booking times: a calendar day plus a time slot, in the browser's timezone.
// The API always receives an ISO 8601 UTC string.

// ponytail: fixed UI slots (every 30 min, 7am to 9pm). The API accepts any
// future time; move these to config or a tutor availability table if needed.
export const SLOT_MINUTES = 30;
const FIRST_SLOT = 7 * 60;
const LAST_SLOT = 21 * 60;

const pad = (n: number) => String(n).padStart(2, "0");

/** "HH:mm" for a date's local time. */
export function toTimeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The given day at "HH:mm" local time. */
export function combineDateAndTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/** Slots ("HH:mm") on that day that are still in the future. */
export function timeSlots(day: Date, now: Date): string[] {
  const slots: string[] = [];
  for (let minutes = FIRST_SLOT; minutes <= LAST_SLOT; minutes += SLOT_MINUTES) {
    const value = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
    if (combineDateAndTime(day, value) > now) slots.push(value);
  }
  return slots;
}

// Display formats, in the viewer's locale and timezone (browser only: the server
// doesn't know the viewer's timezone, see LocalDateTime).
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** "21 Nov 2026, 6:00 pm" */
export const formatDateTime = (date: Date) => dateTimeFormat.format(date);
/** "Sat, 21 Nov 2026" */
export const formatDay = (date: Date) => dayFormat.format(date);
/** "6:00 pm" */
export const formatTime = (date: Date) => timeFormat.format(date);
