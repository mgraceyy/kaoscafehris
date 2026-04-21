import { Prisma } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { getSetting } from "../../lib/settings-cache.js";
import type {
  ClockInInput,
  ClockOutInput,
  ListAttendanceQuery,
  ManualAdjustInput,
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

/** Return the UTC date (midnight) for a given instant. */
function dateOnlyOf(instant: Date): Date {
  return new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate())
  );
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
  const dateKey = dateOnlyOf(clockInAt);

  // Idempotency for offline sync: if a localRecordId matches an existing row,
  // return it instead of creating a duplicate.
  if (input.localRecordId) {
    const existing = await prisma.attendance.findFirst({
      where: { employeeId: input.employeeId, localRecordId: input.localRecordId },
      include: attendanceInclude,
    });
    if (existing) return existing;
  }

  const shift = await findScheduledShift(input.employeeId, dateKey);
  let status: "PRESENT" | "LATE" = "PRESENT";
  let lateMinutes: number | null = null;

  if (shift) {
    const graceMinutes = await getSetting<number>("attendance.late_grace_minutes", 5);
    const scheduledStart = combineDateAndTime(dateKey, shift.startTime);
    const delta = diffMinutes(scheduledStart, clockInAt);
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

  const shift = await findScheduledShift(record.employeeId, record.date);
  if (shift) {
    const scheduledEnd = combineDateAndTime(record.date, shift.endTime);
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
  if (input.clockIn !== undefined) data.clockIn = new Date(input.clockIn);
  if (input.clockOut !== undefined) {
    data.clockOut = input.clockOut ? new Date(input.clockOut) : null;
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.remarks !== undefined) data.remarks = input.remarks;
  if (input.hoursWorked !== undefined) data.hoursWorked = input.hoursWorked;
  if (input.overtimeHours !== undefined) data.overtimeHours = input.overtimeHours;
  if (input.lateMinutes !== undefined) data.lateMinutes = input.lateMinutes;
  if (input.undertimeMinutes !== undefined) data.undertimeMinutes = input.undertimeMinutes;

  const nextClockIn = (data.clockIn as Date | undefined) ?? existing.clockIn;
  const nextClockOut =
    input.clockOut === undefined
      ? existing.clockOut
      : (data.clockOut as Date | null | undefined) ?? null;
  if (nextClockOut && nextClockOut <= nextClockIn) {
    throw new AppError(400, "Clock-out time must be after clock-in");
  }

  return prisma.attendance.update({
    where: { id },
    data,
    include: attendanceInclude,
  });
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
