import cron from "node-cron";
import prisma from "../config/db.js";

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 100) / 100);
}

/**
 * Runs every minute. Finds shifts that ended in the last minute and
 * auto-clocks out any employee who:
 *   - Has an open attendance record (no clockOut) for that day, AND
 *   - Does NOT have approved overtime (either via ShiftAssignment or OvertimeRequest)
 */
async function runAutoClockout() {
  const now = new Date();
  // Window: shifts whose endTime falls between (now - 1 min) and now (UTC)
  const windowStart = new Date(now.getTime() - 60_000);

  // We compare only hours/minutes from the @db.Time field.
  // Find shifts scheduled for today where endTime is in our window.
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const shifts = await prisma.shift.findMany({
    where: {
      date: todayUtc,
      status: "PUBLISHED",
    },
    include: {
      assignments: {
        include: { employee: true },
      },
    },
  });

  for (const shift of shifts) {
    // Reconstruct the shift's end datetime in UTC
    const shiftEnd = new Date(
      Date.UTC(
        todayUtc.getUTCFullYear(),
        todayUtc.getUTCMonth(),
        todayUtc.getUTCDate(),
        shift.endTime.getUTCHours(),
        shift.endTime.getUTCMinutes(),
        0
      )
    );

    // Only process shifts that ended within our 1-minute window
    if (shiftEnd < windowStart || shiftEnd > now) continue;

    for (const assignment of shift.assignments) {
      // Skip if this employee has pre-approved overtime on this shift
      if (assignment.overtimeApproved) continue;

      // Skip if employee has an approved overtime request for today
      const approvedOT = await prisma.overtimeRequest.findFirst({
        where: {
          employeeId: assignment.employeeId,
          date: todayUtc,
          status: "APPROVED",
        },
      });
      if (approvedOT) continue;

      // Find the open attendance record for today
      const attendance = await prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId: assignment.employeeId, date: todayUtc } },
      });
      if (!attendance || attendance.clockOut) continue;

      // Auto clock-out at shift end time
      const hoursWorked = hoursBetween(attendance.clockIn, shiftEnd);

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          clockOut: shiftEnd,
          hoursWorked,
          overtimeHours: 0,
          remarks: "Auto clocked-out at shift end",
        },
      });

      console.log(
        `[auto-clockout] Clocked out ${assignment.employee.employeeId} at ${shiftEnd.toISOString()}`
      );
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
