import cron from "node-cron";
import prisma from "../config/db.js";
import { getSetting } from "../lib/settings-cache.js";

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 100) / 100);
}

/**
 * Convert a local date + shift time (stored as @db.Time where UTC hours = local
 * wall-clock hours) into a real UTC timestamp.
 *
 * Strategy: build the "fake UTC" date (same calendar digits but in UTC), then ask
 * Intl what local time that represents, compute the offset, and subtract it.
 */
function shiftTimeToRealUtc(
  tz: string,
  localYear: number, localMonth: number, localDay: number,
  shiftHour: number, shiftMinute: number
): Date {
  const fakeUtc = new Date(Date.UTC(localYear, localMonth, localDay, shiftHour, shiftMinute, 0));
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(fakeUtc);
  const asLocalH = parseInt(p.find((x) => x.type === "hour")?.value   ?? "0", 10);
  const asLocalM = parseInt(p.find((x) => x.type === "minute")?.value ?? "0", 10);
  const offsetMs = ((asLocalH * 60 + asLocalM) - (shiftHour * 60 + shiftMinute)) * 60_000;
  return new Date(fakeUtc.getTime() - offsetMs);
}

/**
 * Runs every minute. Finds shifts that ended in the last minute (local time)
 * and auto-clocks out any employee who:
 *   - Has an open attendance record (no clockOut) for that day, AND
 *   - Does NOT have approved overtime (ShiftAssignment or OvertimeRequest)
 */
async function runAutoClockout() {
  const tzSetting = await getSetting<string>("company.timezone", "Asia/Manila (UTC+8)");
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";

  const now = new Date();

  // Get current local date + time in the company timezone.
  // Shift dates are stored as Date.UTC(localYear, localMonth, localDay), so we
  // must use the LOCAL calendar date — not now.getUTCDate() — for the lookup.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const localYear   = get("year");
  const localMonth  = get("month") - 1; // 0-indexed
  const localDay    = get("day");
  const localHour   = get("hour");
  const localMinute = get("minute");

  const nowLocalMinutes = localHour * 60 + localMinute;

  // Shifts are stored with date = Date.UTC(localYear, localMonth, localDay)
  const todayLocal = new Date(Date.UTC(localYear, localMonth, localDay));

  const shifts = await prisma.shift.findMany({
    where: { date: todayLocal },
    include: { assignments: { include: { employee: true } } },
  });

  for (const shift of shifts) {
    // Shift times are stored as @db.Time() where UTC hours = local wall-clock hours.
    const shiftEndHour   = shift.endTime.getUTCHours();
    const shiftEndMinute = shift.endTime.getUTCMinutes();
    const shiftEndLocalMinutes = shiftEndHour * 60 + shiftEndMinute;

    // Only process shifts that ended in the current 1-minute window (local time).
    const delta = nowLocalMinutes - shiftEndLocalMinutes;
    if (delta < 0 || delta >= 1) continue;

    // Build the real UTC timestamp for the shift end (for clockOut storage).
    const shiftEndReal = shiftTimeToRealUtc(tz, localYear, localMonth, localDay, shiftEndHour, shiftEndMinute);

    for (const assignment of shift.assignments) {
      if (assignment.overtimeApproved) continue;

      const approvedOT = await prisma.overtimeRequest.findFirst({
        where: { employeeId: assignment.employeeId, date: todayLocal, status: "APPROVED" },
      });
      if (approvedOT) continue;

      const overtimeSchedule = await prisma.overtimeSchedule.findFirst({
        where: { employeeId: assignment.employeeId, date: todayLocal },
      });
      if (overtimeSchedule) continue;

      const attendance = await prisma.attendance.findFirst({
        where: { employeeId: assignment.employeeId, date: todayLocal },
      });
      if (!attendance || attendance.clockOut) continue;

      const hoursWorked = hoursBetween(attendance.clockIn, shiftEndReal);

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { clockOut: shiftEndReal, hoursWorked, overtimeHours: 0, remarks: "Auto clocked-out at shift end" },
      });

      console.log(`[auto-clockout] Clocked out ${assignment.employee.employeeId} at ${shiftEndReal.toISOString()}`);
    }
  }
}

export function startAutoClockoutJob() {
  // Run every minute
  cron.schedule("* * * * *", () => {
    runAutoClockout().catch((err) =>
      console.error("[auto-clockout] Error:", err)
    );
  });
  console.log("[auto-clockout] Job scheduled (every minute)");
}
