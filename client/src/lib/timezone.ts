// Timezone utilities for client-side use. All functions accept an IANA timezone
// name (e.g. "Asia/Manila") as a parameter.

/** Fixed company timezone — this system is Davao, Philippines only. */
export const COMPANY_TZ = "Asia/Manila";

/** Extract the IANA timezone name from the setting value (e.g. "Asia/Manila (UTC+8)" → "Asia/Manila"). */
export function extractIanaTz(settingRaw: string): string {
  return settingRaw.split(" ")[0] ?? "Asia/Manila";
}

/** Return "YYYY-MM-DD" for today in the given timezone. */
export function todayIsoLocal(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

/** Convert a UTC ISO datetime string to "YYYY-MM-DD" in the given timezone. */
export function isoToDateStr(iso: string | null, tz: string): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "2000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

/** Convert a UTC ISO datetime string to "HH:mm" (24-hour) in the given timezone. */
export function isoToTimeStr(iso: string | null, tz: string): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

/** Format a UTC ISO datetime as 12-hour time in the given timezone. */
export function formatClockTime(iso: string | null, tz: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz,
  });
}

/** Convert admin-entered local date+time to an ISO 8601 string with the correct
 *  UTC offset for the given timezone. The offset is computed at noon on the
 *  date to avoid DST midnight ambiguity. */
export function toIso(date: string, time: string, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  // Use noon UTC on the target date to determine the offset.
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(noonUtc);
  const localHour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10);
  const offsetHours = localHour - 12;
  const sign = offsetHours >= 0 ? "+" : "-";
  const absH = Math.abs(offsetHours);
  const offsetStr = `${sign}${String(absH).padStart(2, "0")}:00`;
  return `${date}T${time}:00${offsetStr}`;
}

/** Return "YYYY-MM-DD" for the next calendar day in the given timezone. */
export function nextDayLocalIso(date: string, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(next);
}

