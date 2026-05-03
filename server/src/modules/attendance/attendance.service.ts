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

/** Return the UTC date (midnight) for a given instant, using UTC date. */
function dateOnlyOf(instant: Date): Date {
  return new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())
  );
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
<<<<<<< Updated upstream
async function workDayDateOf(instant: Date): Promise<Date> {
  const [tzSetting, splitTimeSetting] = await Promise.all([
=======
export async function workDayDateOf(instant: Date): Promise<Date> {
  const [tzSetting, workHoursSetting] = await Promise.all([
>>>>>>> Stashed changes
    getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
    getSetting<string>("company.default_work_hours", "05:00"),
  ]);

  // Extract IANA timezone name (e.g. "Asia/Manila") from "Asia/Manila (UTC+8)".
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const { hour: splitHour, minute: splitMinute } = parseWorkStartTime(splitTimeSetting);

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

  // Roll back to the previous calendar date for clock-ins before the configured Split Time
  // (Settings → Split Time / Day Boundary). Set this to the earliest possible shift start
  // so only true night-shift continuations (e.g. 1–4 AM) get rolled back.
  const beforeWorkStart =
    localHour < splitHour || (localHour === splitHour && localMinute < splitMinute);

  if (beforeWorkStart) {
    const d = new Date(Date.UTC(localYear, localMonth, localDay));
    d.setUTCDate(d.getUTCDate() - 1);
    return d;
  }

  return new Date(Date.UTC(localYear, localMonth, localDay));
}

function diffMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60_000);
}

function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round(((to.getTime() - from.getTime()) / 3_600_000) * 100) / 100);
}

/**
 * Find the employee's scheduled shift for a given date (if any). Used to
 * compute late/undertime minutes based on the scheduled start/end.
 */
async function findScheduledShift(employeeId: string, date: Date) {
  const assignment = await prisma.shiftAssignment.findFirst({
    where: {
      employeeId,
      shift: { date },
    },
    include: { shift: true },
    orderBy: { shift: { startTime: "asc" } },
  });
  return assignment?.shift ?? null;
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
<<<<<<< Updated upstream
 * Compute how many minutes past the shift start the clock-in is.
 *
 * Shift times are stored as @db.Time() where the UTC hours/minutes equal the
 * local wall-clock hours (e.g. a 7:00 AM shift is stored as 07:00 UTC).
 * Clock-in timestamps are real UTC, so we must extract the local time of the
 * clock-in and compare against the shift's UTC hours directly — never mix the
 * two via Date arithmetic.
 */
async function computeLateMinutes(clockInAt: Date, shiftStartTime: Date): Promise<number> {
  const tzSetting = await getSetting<string>("company.timezone", "Asia/Manila (UTC+8)");
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(clockInAt);

  const localHour   = parseInt(parts.find((p) => p.type === "hour")?.value   ?? "0", 10);
  const localMinute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

  const shiftMinutes  = shiftStartTime.getUTCHours() * 60 + shiftStartTime.getUTCMinutes();
  const clockInMinutes = localHour * 60 + localMinute;

  return clockInMinutes - shiftMinutes;
}

export async function deleteAttendance(id: string) {
  const record = await prisma.attendance.findUnique({ where: { id } });
  if (!record) throw new AppError(404, "Attendance record not found");
  await prisma.attendance.delete({ where: { id } });
=======
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
>>>>>>> Stashed changes
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
export async function clockIn(input: ClockInInput) {
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

  // Block clock-in if the employee has any open record (no clock-out) from a previous date.
  const openRecord = await prisma.attendance.findFirst({
    where: {
      employeeId: input.employeeId,
      clockOut: null,
      status: { in: ["PRESENT", "LATE"] },
      date: { lt: dateKey },
    },
  });
  if (openRecord) {
    throw new AppError(
      409,
      "Employee has not clocked out from a previous shift. Please clock out first."
    );
  }

  const shift = await findScheduledShift(input.employeeId, dateKey);
  let status: "PRESENT" | "LATE" = "PRESENT";
  let lateMinutes: number | null = null;

  if (shift) {
<<<<<<< Updated upstream
    const graceMinutes = await getSetting<number>("attendance.late_threshold", 0);
    const delta = await computeLateMinutes(clockInAt, shift.startTime);
=======
    const [graceMinutes, tzSetting] = await Promise.all([
      getSetting<number>("attendance.late_grace_minutes", 5),
      getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
    ]);
    const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
    const { scheduledStart } = getScheduledTimes(dateKey, shift, getUtcOffsetMinutes(tz, clockInAt));
    const delta = diffMinutes(scheduledStart, clockInAt);
>>>>>>> Stashed changes
    if (delta > graceMinutes) {
      status = "LATE";
      lateMinutes = delta;
    }
  }

  try {
    return await prisma.attendance.create({
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
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new AppError(409, "Employee has already clocked in for this date");
    }
    throw err;
  }
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

  const [shift, tzSetting] = await Promise.all([
    findScheduledShift(record.employeeId, record.date),
    getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
  ]);
  if (shift) {
    const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
    const { scheduledEnd } = getScheduledTimes(record.date, shift, getUtcOffsetMinutes(tz, clockOutAt));
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

  // Fetch shift + settings once for all derived field calculations.
  const [shift, tzSetting, graceMinutes] = await Promise.all([
    findScheduledShift(existing.employeeId, existing.date),
    getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
    getSetting<number>("attendance.late_grace_minutes", 5),
  ]);
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const tzOffset = getUtcOffsetMinutes(tz, nextClockIn);

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
<<<<<<< Updated upstream
      const graceMinutes = await getSetting<number>("attendance.late_threshold", 0);
      const delta = await computeLateMinutes(nextClockIn, shift.startTime);
=======
      const { scheduledStart } = getScheduledTimes(existing.date, shift, tzOffset);
      const delta = diffMinutes(scheduledStart, nextClockIn);
>>>>>>> Stashed changes
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
  const dateKey = await workDayDateOf(clockInAt);

  const [shift, tzSetting, graceMinutes] = await Promise.all([
    findScheduledShift(input.employeeId, dateKey),
    getSetting<string>("company.timezone", "Asia/Manila (UTC+8)"),
    getSetting<number>("attendance.late_grace_minutes", 5),
  ]);
  const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
  const tzOffset = getUtcOffsetMinutes(tz, clockInAt);

  let status: "PRESENT" | "LATE" = "PRESENT";
  let lateMinutes: number | null = null;

  if (shift) {
<<<<<<< Updated upstream
    const graceMinutes = await getSetting<number>("attendance.late_threshold", 0);
    const delta = await computeLateMinutes(clockInAt, shift.startTime);
=======
    const { scheduledStart } = getScheduledTimes(dateKey, shift, tzOffset);
    const delta = diffMinutes(scheduledStart, clockInAt);
>>>>>>> Stashed changes
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

  try {
    return await prisma.attendance.create({
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
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError(409, "An attendance record already exists for this employee on that date");
    }
    throw err;
  }
}

export async function syncBatch(input: SyncBatchInput) {
  const created: string[] = [];
  const skipped: string[] = [];
  const failed: { localRecordId: string; reason: string }[] = [];

  for (const record of input.records) {
    try {
      const existing = await prisma.attendance.findFirst({
        where: { employeeId: record.employeeId, localRecordId: record.localRecordId },
      });
      if (existing) {
        skipped.push(record.localRecordId);
        continue;
      }
      await clockIn({
        employeeId: record.employeeId,
        clockIn: record.clockIn,
        selfieIn: record.selfieIn,
        deviceId: record.deviceId,
        localRecordId: record.localRecordId,
      });
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
