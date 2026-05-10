// Timezone utilities — all functions are synchronous and accept an IANA timezone
// name (e.g. "Asia/Manila") as a parameter.

/** Fixed company timezone — this system is Davao, Philippines only. */
export const COMPANY_TZ = "Asia/Manila";

/** Extract the IANA timezone name from the setting value (e.g. "Asia/Manila (UTC+8)" → "Asia/Manila"). */
export function extractIanaTz(settingRaw: string): string {
  return settingRaw.split(" ")[0] ?? "Asia/Manila";
}

/** Return "YYYY-MM-DD" in the given timezone for an instant. */
export function localDateKey(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instant); // "en-CA" locale → "2026-05-01" format
}

/** Return year/month/day (1-indexed month) in the given timezone for an instant. */
export function localDateParts(instant: Date, tz: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Return hour/minute in the given timezone for an instant. */
export function localTimeParts(instant: Date, tz: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(instant);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return { hour: get("hour"), minute: get("minute") };
}

/** Fractional hours since local midnight (0–24). */
export function localHoursSinceMidnight(instant: Date, tz: string): number {
  const { hour, minute } = localTimeParts(instant, tz);
  return hour + minute / 60;
}

/** Minutes since local midnight (0–1440). */
export function localTimeInMinutes(instant: Date, tz: string): number {
  const { hour, minute } = localTimeParts(instant, tz);
  return hour * 60 + minute;
}

/** Whether clockIn and clockOut fall on different local calendar dates. */
export function isCrossingLocal(clockIn: Date, clockOut: Date, tz: string): boolean {
  return localDateKey(clockIn, tz) !== localDateKey(clockOut, tz);
}

/** Return a UTC-midnight Date representing the local calendar date of `instant`. */
export function localCalendarDate(instant: Date, tz: string): Date {
  const { year, month, day } = localDateParts(instant, tz);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Return the UTC instant of 00:00 local time on the given local date key ("YYYY-MM-DD").
 *  Uses noon to detect the offset (avoids DST midnight ambiguity). */
export function localMidnightUtc(dateKey: string, tz: string): Date {
  // Use noon UTC on the target date — DST transitions never happen at noon.
  const noonUtc = new Date(`${dateKey}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(noonUtc);
  const localHour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10);
  // Offset = localHour - 12.  e.g. UTC+8 → 20:00 local at noon UTC → offset = +8
  const offsetHours = localHour - 12;
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, -offsetHours, 0, 0));
}
