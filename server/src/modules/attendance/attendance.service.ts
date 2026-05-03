import { Prisma } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { getSetting } from "../../lib/settings-cache.js";
import type {
  ClockInInput,
  ClockOutInput,
  ListAttendanceQuery,
  ManualAdjustInput,
  ManualCreateInput,
  SyncBatchInput,
} from "./attendance.schema.js";

const attendanceInclude = {
  employee: {
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      position: true,
    },
  },
  branch: { select: { id: true, name: true } },
} as const;

function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/**
 * Parse "H:mm AM/PM – ..." and return { hour, minute } in 24-hour format.
 * Falls back to { hour: 8, minute: 0 } if the setting is missing or unparseable.
 */
function parseWorkStartTime(setting: string): { hour: number; minute: number } {
  // Plain HH:mm (24-hour) — new format stored by TimePicker.
  const hhmm = setting.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return { hour: parseInt(hhmm[1], 10), minute: parseInt(hhmm[2], 10) };
  // Legacy "H:mm AM/PM – ..." format.
  const ampm = setting.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!ampm) return { hour: 8, minute: 0 };
  let hour = parseInt(ampm[1], 10);
  const minute = parseInt(ampm[2], 10);
  const period = ampm[3].toUpperCase();
  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;
  return { hour, minute };
}

/**
 * Determine the work-day calendar date for a clock-in timestamp.
 * Uses the company timezone and Default Work Hours start time so that
 * night-shift workers clocking in before the work-day start (e.g., 1 AM
 * when the day starts at 8 AM) are recorded under the previous calendar date.
 */
export async function workDayDateOf(instant: Date): Promise<Date> {
  const [tzSetting, workHoursSetting] = await Promise.all([
    getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
    getSetting<string>("company.default_work_hours", "05:00"),
  ]);

  // Extract IANA timezone name (e.g. "Asia/Manila") from "Asia/Manila (UTC+8)".
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const { hour: splitHour, minute: splitMinute } = parseWorkStartTime(workHoursSetting);

  // Get local date parts in the company timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(instant);

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  const localYear = get("year");
  const localMonth = get("month") - 1; // 0-indexed
  const localDay = get("day");
  const localHour = get("hour");
  const localMinute = get("minute");

  // If the local time is before the configured split time, this clock-in
  // belongs to the previous calendar date.
  const beforeSplit =
    localHour < splitHour || (localHour === splitHour && localMinute < splitMinute);

  if (beforeSplit) {
    const d = new Date(Date.UTC(localYear, localMonth, localDay));
    d.setUTCDate(d.getUTCDate() - 1);
    return d;
  }

  return new Date(Date.UTC(localYear, localMonth, localDay));
}

/**
 * Return the local calendar date of `instant` in the company timezone, with
 * NO split-time rollback. Used for manual attendance creation where the admin
 * has explicitly chosen the intended date.
 */
async function localCalendarDateOf(instant: Date): Promise<Date> {
  const tzSetting = await getSetting<string>("company.timezone", "Asia/Manila (UTC+8)");
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

function diffMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 100) / 100);
}

/**
 * Find the employee's scheduled shift for a given date (if any).
 * When the employee has multiple shifts on the same day, returns the one
 * whose scheduled start time is closest to `clockInAt` (in local time).
 * `tzOffsetMinutes` should be the company UTC offset, e.g. 480 for UTC+8.
 */
async function findScheduledShift(
  employeeId: string,
  date: Date,
  clockInAt?: Date,
  tzOffsetMinutes = 480,
) {
  const assignments = await prisma.shiftAssignment.findMany({
    where: { employeeId, shift: { date } },
    include: { shift: true },
    orderBy: { shift: { startTime: "asc" } },
  });

  if (assignments.length === 0) return null;
  if (assignments.length === 1 || !clockInAt) return assignments[0].shift;

  // Multiple shifts on the same day — pick the one whose start is closest to clock-in.
  let best = assignments[0].shift;
  let minDiff = Infinity;
  for (const { shift } of assignments) {
    const { scheduledStart } = getScheduledTimes(date, shift, tzOffsetMinutes);
    const diff = Math.abs(clockInAt.getTime() - scheduledStart.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      best = shift;
    }
  }
  return best;
}

/** Combine a date (UTC midnight) with a time-of-day (from @db.Time field). */
function combineDateAndTime(date: Date, timeOfDay: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      timeOfDay.getUTCHours(),
      timeOfDay.getUTCMinutes(),
      0
    )
  );
}

/**
 * Return the UTC offset in minutes for `tz` at `forDate`.
 * E.g. Asia/Manila → 480 (UTC+8). Handles DST-observing zones correctly.
 */
function getUtcOffsetMinutes(tz: string, forDate: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(forDate);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
  const localMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((localMs - forDate.getTime()) / 60_000);
}

/**
 * Like combineDateAndTime but treats the stored @db.Time hours/minutes as
 * LOCAL company timezone time rather than UTC. Shift times are entered by
 * admins in local time (e.g. "08:00" = 8 AM Manila), so we must subtract the
 * UTC offset to arrive at the correct UTC instant.
 */
function combineDateAndTimeLocal(date: Date, timeOfDay: Date, tzOffsetMinutes: number): Date {
  const dateMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const storedMs = timeOfDay.getUTCHours() * 3_600_000 + timeOfDay.getUTCMinutes() * 60_000;
  return new Date(dateMs + storedMs - tzOffsetMinutes * 60_000);
}

/**
 * Returns the scheduled start and end instants for a shift on a given date.
 * tzOffsetMinutes is the company timezone's UTC offset (e.g. +480 for Manila).
 * Handles overnight/graveyard shifts where endTime < startTime by adding one
 * day to scheduledEnd so it lands on the correct calendar day.
 */
function getScheduledTimes(
  date: Date,
  shift: { startTime: Date; endTime: Date },
  tzOffsetMinutes: number,
) {
  const scheduledStart = combineDateAndTimeLocal(date, shift.startTime, tzOffsetMinutes);
  let scheduledEnd = combineDateAndTimeLocal(date, shift.endTime, tzOffsetMinutes);
  const startMins = shift.startTime.getUTCHours() * 60 + shift.startTime.getUTCMinutes();
  const endMins = shift.endTime.getUTCHours() * 60 + shift.endTime.getUTCMinutes();
  if (endMins < startMins) {
    scheduledEnd = new Date(scheduledEnd.getTime() + 24 * 60 * 60 * 1000);
  }
  return { scheduledStart, scheduledEnd };
}

export async function deleteAttendance(id: string) {
  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) throw new AppError(404, "Attendance record not found");
  await prisma.attendance.delete({ where: { id } });
}

export async function listAttendance(query: ListAttendanceQuery) {
  const where: Prisma.AttendanceWhereInput = {};
  if (query.branchId) where.branchId = query.branchId;
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.status) where.status = query.status;
  if (query.date) where.date = dateOnly(query.date);
  else if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = dateOnly(query.startDate);
    if (query.endDate) where.date.lte = dateOnly(query.endDate);
  }

  return prisma.attendance.findMany({
    where,
    include: attendanceInclude,
    orderBy: [{ date: "desc" }, { clockIn: "desc" }],
    take: 500,
  });
}

export async function getAttendance(id: string) {
  const record = await prisma.attendance.findUnique({
    where: { id },
    include: attendanceInclude,
  });
  if (!record) throw new AppError(404, "Attendance record not found");
  return record;
}

/**
 * Clock-in creates a new attendance record for today. Rejects if one already
 * exists for the employee on the same date (unique constraint makes this
 * deterministic).
 */
export async function clockIn(input: ClockInInput, options?: { skipOpenRecordGuard?: boolean }) {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, branchId: true, employmentStatus: true },
  });
  if (!employee) throw new AppError(404, "Employee not found");
  if (employee.employmentStatus === "TERMINATED") {
    throw new AppError(400, "Terminated employees cannot clock in");
  }

  const clockInAt = input.clockIn ? new Date(input.clockIn) : new Date();
  const dateKey = await workDayDateOf(clockInAt);

  // Idempotency for offline sync: if a localRecordId matches an existing row,
  // return it instead of creating a duplicate.
  if (input.localRecordId) {
    const existing = await prisma.attendance.findFirst({
      where: { employeeId: input.employeeId, localRecordId: input.localRecordId },
      include: attendanceInclude,
    });
    if (existing) return existing;
  }

  const [tzSetting, graceMinutes] = await Promise.all([
    getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
    getSetting<number>("attendance.late_grace_minutes", 5),
  ]);
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const tzOffset = getUtcOffsetMinutes(tz, clockInAt);

  if (!options?.skipOpenRecordGuard) {
    // Block if there's an open (no clock-out) record from a PREVIOUS date.
    const openPrevRecord = await prisma.attendance.findFirst({
      where: {
        employeeId: input.employeeId,
        clockOut: null,
        status: { in: ["PRESENT", "LATE"] },
        date: { lt: dateKey },
      },
    });
    if (openPrevRecord) {
      throw new AppError(
        409,
        "Employee has not clocked out from a previous shift. Please clock out first."
      );
    }

    // Block if there's already an open record for TODAY (must clock out first).
    const openTodayRecord = await prisma.attendance.findFirst({
      where: {
        employeeId: input.employeeId,
        clockOut: null,
        status: { in: ["PRESENT", "LATE"] },
        date: dateKey,
      },
    });
    if (openTodayRecord) {
      throw new AppError(409, "Employee has not clocked out from the current shift. Please clock out first.");
    }

    // Block if the employee has already clocked in for all of their scheduled shifts today.
    const [existingCount, scheduledCount] = await Promise.all([
      prisma.attendance.count({ where: { employeeId: input.employeeId, date: dateKey } }),
      prisma.shiftAssignment.count({ where: { employeeId: input.employeeId, shift: { date: dateKey } } }),
    ]);
    if (existingCount > 0 && existingCount >= Math.max(scheduledCount, 1)) {
      throw new AppError(
        409,
        scheduledCount > 1
          ? "Employee has already clocked in for all scheduled shifts today."
          : "Employee has already clocked in for this date."
      );
    }
  }

  const shift = await findScheduledShift(input.employeeId, dateKey, clockInAt, tzOffset);
  let status: "PRESENT" | "LATE" = "PRESENT";
  let lateMinutes: number | null = null;

  if (shift) {
    const { scheduledStart } = getScheduledTimes(dateKey, shift, tzOffset);
    const delta = diffMinutes(scheduledStart, clockInAt);
    if (delta > graceMinutes) {
      status = "LATE";
      lateMinutes = delta;
    }
  }

  return prisma.attendance.create({
    data: {
      employeeId: input.employeeId,
      branchId: employee.branchId,
      date: dateKey,
      clockIn: clockInAt,
      status,
      lateMinutes: lateMinutes ?? undefined,
      selfieIn: input.selfieIn,
      deviceId: input.deviceId,
      localRecordId: input.localRecordId,
      syncStatus: "SYNCED",
    },
    include: attendanceInclude,
  });
}

export async function clockOut(attendanceId: string, input: ClockOutInput) {
  const record = await prisma.attendance.findUnique({ where: { id: attendanceId } });
  if (!record) throw new AppError(404, "Attendance record not found");
  if (record.clockOut) throw new AppError(409, "Already clocked out");

  const clockOutAt = input.clockOut ? new Date(input.clockOut) : new Date();
  if (clockOutAt <= record.clockIn) {
    throw new AppError(400, "Clock-out time must be after clock-in");
  }

  const hoursWorked = hoursBetween(record.clockIn, clockOutAt);
  let overtimeHours = 0;
  let undertimeMinutes: number | null = null;

  const tzSetting = await getSetting<string>("company.timezone", "Asia/Manila (UTC+8)");
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const tzOffset = getUtcOffsetMinutes(tz, clockOutAt);
  const shift = await findScheduledShift(record.employeeId, record.date, record.clockIn, tzOffset);
  if (shift) {
    const { scheduledEnd } = getScheduledTimes(record.date, shift, tzOffset);
    if (clockOutAt < scheduledEnd) {
      undertimeMinutes = diffMinutes(clockOutAt, scheduledEnd);
    }
    if (clockOutAt > scheduledEnd) {
      overtimeHours = hoursBetween(scheduledEnd, clockOutAt);
    }
  }

  return prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      clockOut: clockOutAt,
      selfieOut: input.selfieOut,
      hoursWorked,
      overtimeHours,
      undertimeMinutes: undertimeMinutes ?? undefined,
    },
    include: attendanceInclude,
  });
}

export async function manualAdjust(id: string, input: ManualAdjustInput) {
  const existing = await prisma.attendance.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Attendance record not found");

  const data: Prisma.AttendanceUpdateInput = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.remarks !== undefined) data.remarks = input.remarks;

  const nextClockIn = input.clockIn !== undefined ? new Date(input.clockIn) : existing.clockIn;
  const nextClockOut =
    input.clockOut === undefined
      ? existing.clockOut
      : input.clockOut ? new Date(input.clockOut) : null;

  if (nextClockOut && nextClockOut <= nextClockIn) {
    throw new AppError(400, "Clock-out time must be after clock-in");
  }

  data.clockIn = nextClockIn;
  data.clockOut = nextClockOut ?? null;

  const [tzSetting, graceMinutes] = await Promise.all([
    getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
    getSetting<number>("attendance.late_grace_minutes", 5),
  ]);
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const tzOffset = getUtcOffsetMinutes(tz, nextClockIn);
  const shift = await findScheduledShift(existing.employeeId, existing.date, nextClockIn, tzOffset);

  // Always recompute derived fields from the resolved clockIn/clockOut.
  if (nextClockOut) {
    data.hoursWorked = hoursBetween(nextClockIn, nextClockOut);

    if (shift) {
      const { scheduledEnd } = getScheduledTimes(existing.date, shift, tzOffset);
      data.undertimeMinutes = nextClockOut < scheduledEnd ? diffMinutes(nextClockOut, scheduledEnd) : null;
      data.overtimeHours = nextClockOut > scheduledEnd ? hoursBetween(scheduledEnd, nextClockOut) : 0;
    } else {
      data.overtimeHours = 0;
      data.undertimeMinutes = null;
    }
  } else {
    // No clock-out yet — clear computed fields.
    data.hoursWorked = null;
    data.overtimeHours = 0;
    data.undertimeMinutes = null;
  }

  // Recompute late status from the (possibly updated) clockIn.
  if (input.status === undefined) {
    if (shift) {
      const { scheduledStart } = getScheduledTimes(existing.date, shift, tzOffset);
      const delta = diffMinutes(scheduledStart, nextClockIn);
      if (delta > graceMinutes) {
        data.status = "LATE";
        data.lateMinutes = delta;
      } else {
        data.status = "PRESENT";
        data.lateMinutes = null;
      }
    }
  } else {
    // Status was explicitly set; keep provided lateMinutes if any, else clear.
    data.lateMinutes = input.lateMinutes ?? null;
  }

  return prisma.attendance.update({
    where: { id },
    data,
    include: attendanceInclude,
  });
}

export async function manualCreate(input: ManualCreateInput) {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, branchId: true, employmentStatus: true },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  const clockInAt = new Date(input.clockIn);
  // Use the plain local calendar date — no split-time rollback — because the
  // admin explicitly chose the target date in the form.
  const dateKey = await localCalendarDateOf(clockInAt);
  console.log("[manualCreate DEBUG] input.clockIn:", input.clockIn, "clockInAt UTC:", clockInAt.toISOString(), "dateKey:", dateKey.toISOString());

  const [tzSetting, graceMinutes] = await Promise.all([
    getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
    getSetting<number>("attendance.late_grace_minutes", 5),
  ]);
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const tzOffset = getUtcOffsetMinutes(tz, clockInAt);

  // Block if there is already an open (no clock-out) record for today.
  const openTodayRecord = await prisma.attendance.findFirst({
    where: {
      employeeId: input.employeeId,
      clockOut: null,
      status: { in: ["PRESENT", "LATE"] },
      date: dateKey,
    },
  });
  if (openTodayRecord) {
    throw new AppError(409, "Employee has an open shift today. Please clock out first before adding another record.");
  }

  // Block if all scheduled shifts for today already have attendance records.
  const [existingCount, scheduledCount] = await Promise.all([
    prisma.attendance.count({ where: { employeeId: input.employeeId, date: dateKey } }),
    prisma.shiftAssignment.count({ where: { employeeId: input.employeeId, shift: { date: dateKey } } }),
  ]);
  if (existingCount > 0 && existingCount >= Math.max(scheduledCount, 1)) {
    throw new AppError(
      409,
      `[DEBUG] dateKey=${dateKey.toISOString()} existingCount=${existingCount} scheduledCount=${scheduledCount} — ${scheduledCount > 1 ? "Attendance records already exist for all scheduled shifts on this date." : "An attendance record already exists for this employee on that date."}`
    );
  }

  const shift = await findScheduledShift(input.employeeId, dateKey, clockInAt, tzOffset);

  let status: "PRESENT" | "LATE" = "PRESENT";
  let lateMinutes: number | null = null;

  if (shift) {
    const { scheduledStart } = getScheduledTimes(dateKey, shift, tzOffset);
    const delta = diffMinutes(scheduledStart, clockInAt);
    if (delta > graceMinutes) {
      status = "LATE";
      lateMinutes = delta;
    }
  }

  let clockOutAt: Date | null = null;
  let hoursWorked: number | undefined;
  let overtimeHours: number | undefined;
  let undertimeMinutes: number | undefined;

  if (input.clockOut) {
    clockOutAt = new Date(input.clockOut);
    if (clockOutAt <= clockInAt) {
      throw new AppError(400, "Clock-out time must be after clock-in");
    }
    hoursWorked = hoursBetween(clockInAt, clockOutAt);
    if (shift) {
      const { scheduledEnd } = getScheduledTimes(dateKey, shift, tzOffset);
      if (clockOutAt < scheduledEnd) undertimeMinutes = diffMinutes(clockOutAt, scheduledEnd);
      if (clockOutAt > scheduledEnd) overtimeHours = hoursBetween(scheduledEnd, clockOutAt);
    }
  }

  return prisma.attendance.create({
    data: {
      employeeId: input.employeeId,
      branchId: employee.branchId,
      date: dateKey,
      clockIn: clockInAt,
      clockOut: clockOutAt ?? undefined,
      status,
      lateMinutes: lateMinutes ?? undefined,
      hoursWorked,
      overtimeHours,
      undertimeMinutes,
      remarks: input.remarks ?? undefined,
      syncStatus: "SYNCED",
    },
    include: attendanceInclude,
  });
}

export async function syncBatch(input: SyncBatchInput) {
  const created: string[] = [];
  const skipped: string[] = [];
  const failed: { localRecordId: string; reason: string }[] = [];

  // Process in chronological order so a Day-1 clock-out is committed before
  // the Day-2 clock-in runs, avoiding false open-record conflicts.
  const sorted = [...input.records].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
  );

  for (const record of sorted) {
    try {
      const existing = await prisma.attendance.findFirst({
        where: { employeeId: record.employeeId, localRecordId: record.localRecordId },
      });
      if (existing) {
        skipped.push(record.localRecordId);
        continue;
      }
      await clockIn(
        {
          employeeId: record.employeeId,
          clockIn: record.clockIn,
          selfieIn: record.selfieIn,
          deviceId: record.deviceId,
          localRecordId: record.localRecordId,
        },
        { skipOpenRecordGuard: true },
      );
      if (record.clockOut) {
        const row = await prisma.attendance.findFirst({
          where: { employeeId: record.employeeId, localRecordId: record.localRecordId },
        });
        if (row) {
          await clockOut(row.id, {
            clockOut: record.clockOut,
            selfieOut: record.selfieOut,
          });
        }
      }
      created.push(record.localRecordId);
    } catch (err) {
      failed.push({
        localRecordId: record.localRecordId,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { created, skipped, failed };
}
