// "YYYY-MM-DD" in the device's own local time zone -- `date.toISOString()`
// always returns the UTC date, which is the *previous* local calendar day
// for roughly the first 5-8 hours of every day in Indonesia (WIB/WITA/WIT
// are all ahead of UTC). Several "what day is today" comparisons across
// this app used toISOString() directly and were wrong during that window
// every single day; use this instead anywhere a local calendar date is
// needed as a plain string (schedule dates, "today"/"this month" filters,
// memory dates, anniversary checks).
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// "HH:mm" in the device's own local time zone -- same toISOString() pitfall
// as localDateString() above, for the time-of-day half of a schedule.
export function localTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Parses a plain "YYYY-MM-DD" (no time/zone) as *local* midnight. `new
// Date("YYYY-MM-DD")` parses date-only ISO strings as UTC midnight per the
// JS spec -- comparing that against a local-midnight Date (e.g. from
// `new Date().setHours(0,0,0,0)`) is off by the local UTC offset, which can
// tip a same-day/day-boundary comparison to the wrong day.
export function parseLocalDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatElapsed(startedAt: string): string {
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
