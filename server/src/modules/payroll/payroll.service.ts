import { Prisma, type PrismaClient } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { logAudit } from "../../lib/audit.js";
import { getScheduledTimes, hoursBetween } from "../attendance/attendance.service.js";
import { COMPANY_TZ, localDateKey, localCalendarDate, isCrossingLocal, localHoursSinceMidnight, localTimeInMinutes, localMidnightUtc } from "../../lib/timezone.js";
import type {
  AdjustPayslipInput,
  CreatePayrollRunInput,
  ListPayrollRunsQuery,
  PayslipDeductionInput,
  PayslipEarningInput,
} from "./payroll.schema.js";

type Tx = Prisma.TransactionClient | PrismaClient;

// --- Helpers ---------------------------------------------------------------

function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : Number(d);
}

// --- Query helpers ---------------------------------------------------------

const runInclude = {
  branch: { select: { id: true, name: true, city: true } },
  payslips: {
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          position: true,
        },
      },
    },
    orderBy: [
      { employee: { lastName: "asc" } },
      { employee: { firstName: "asc" } },
    ],
  },
} satisfies Prisma.PayrollRunInclude;

const payslipExportInclude = {
  employee: {
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      position: true,
      basicSalary: true,
      payType: true,
      hourlyRate: true,
      employmentStatus: true,
      sssNumber: true,
      philhealthNumber: true,
      pagibigNumber: true,
      tinNumber: true,
      userId: true,
      branch: { select: { id: true, name: true, city: true, address: true } },
    },
  },
  payrollRun: {
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      branch: { select: { id: true, name: true, city: true, address: true } },
    },
  },
  earnings: { orderBy: { type: "asc" } },
  deductions: { orderBy: { type: "asc" } },
} satisfies Prisma.PayslipInclude;

const payslipInclude = {
  employee: {
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      position: true,
      basicSalary: true,
      payType: true,
      hourlyRate: true,
      employmentStatus: true,
      sssNumber: true,
      philhealthNumber: true,
      pagibigNumber: true,
      tinNumber: true,
      branch: { select: { id: true, name: true, city: true, address: true } },
    },
  },
  payrollRun: {
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      branch: { select: { id: true, name: true, city: true, address: true } },
    },
  },
  earnings: { orderBy: { type: "asc" } },
  deductions: { orderBy: { type: "asc" } },
} satisfies Prisma.PayslipInclude;

// --- Run CRUD --------------------------------------------------------------

export async function listRuns(query: ListPayrollRunsQuery) {
  const where: Prisma.PayrollRunWhereInput = {};
  if (query.branchId) where.branchId = query.branchId;
  if (query.status) where.status = query.status;
  if (query.periodStart || query.periodEnd) {
    where.periodStart = {};
    if (query.periodStart) where.periodStart.gte = dateOnly(query.periodStart);
    if (query.periodEnd) where.periodStart.lte = dateOnly(query.periodEnd);
  }

  return prisma.payrollRun.findMany({
    where,
    include: {
      branch: { select: { id: true, name: true, city: true } },
      _count: { select: { payslips: true } },
    },
    orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
  });
}

export async function getRunById(id: string) {
  const row = await prisma.payrollRun.findUnique({
    where: { id },
    include: runInclude,
  });
  if (!row) throw new AppError(404, "Payroll run not found");
  return row;
}

export async function createRun(input: CreatePayrollRunInput) {
  const branch = await prisma.branch.findUnique({
    where: { id: input.branchId },
    select: { id: true, isActive: true },
  });
  if (!branch) throw new AppError(404, "Branch not found");
  if (!branch.isActive) throw new AppError(400, "Branch is inactive");

  const start = dateOnly(input.periodStart);
  const end = dateOnly(input.periodEnd);

  const clash = await prisma.payrollRun.findFirst({
    where: {
      branchId: input.branchId,
      periodStart: start,
      periodEnd: end,
    },
  });
  if (clash) {
    throw new AppError(
      409,
      "A payroll run for this branch + period already exists"
    );
  }

  const created = await prisma.payrollRun.create({
    data: {
      branchId: input.branchId,
      periodStart: start,
      periodEnd: end,
      status: "DRAFT",
    },
    include: runInclude,
  });
  await logAudit({
    action: "CREATE",
    tableName: "payroll_runs",
    recordId: created.id,
    newValues: created,
  });
  return created;
}

export async function cancelRun(id: string) {
  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) throw new AppError(404, "Payroll run not found");
  if (run.status === "COMPLETED") {
    throw new AppError(409, "Completed runs cannot be cancelled");
  }
  // Cascade removes payslips + their line items.
  await prisma.payrollRun.delete({ where: { id } });
  await logAudit({
    action: "DELETE",
    tableName: "payroll_runs",
    recordId: id,
    oldValues: run,
  });
}

// --- Processing -----------------------------------------------------------

type DeductionTypeKey =
  | "SSS" | "PHILHEALTH" | "PAGIBIG" | "BIR_TAX"
  | "LATE" | "UNPAID_LEAVE" | "CASH_ADVANCE" | "SALARY_LOAN" | "OTHER";

function toDeductionType(type: string | null | undefined): DeductionTypeKey {
  const valid: DeductionTypeKey[] = [
    "SSS", "PHILHEALTH", "PAGIBIG", "BIR_TAX",
    "LATE", "UNPAID_LEAVE", "CASH_ADVANCE", "SALARY_LOAN", "OTHER",
  ];
  return valid.includes(type as DeductionTypeKey) ? (type as DeductionTypeKey) : "OTHER";
}

function sumByDeductionType(
  rows: Array<{ type: DeductionTypeKey; amount: number }>,
  type: DeductionTypeKey
): number {
  return round2(rows.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0));
}

/**
 * Process a DRAFT run: generate a payslip for every active employee in the
 * branch. Basic pay is computed from attendance (HOURLY) or salary / 2
 * (MONTHLY_FIXED). Deductions are pulled from each employee's assigned
 * deductions (set on the employee profile) — nothing is hardcoded. All amounts
 * are adjustable per payslip after generation.
 *
 * Re-processing clears existing payslips in the run first.
 */
export async function processRun(id: string) {
  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) throw new AppError(404, "Payroll run not found");
  if (run.status === "COMPLETED") {
    throw new AppError(409, "Completed runs cannot be reprocessed");
  }
  if (run.status === "CANCELLED") {
    throw new AppError(409, "Cancelled runs cannot be reprocessed");
  }

  const employees = await prisma.employee.findMany({
    where: {
      branchId: run.branchId,
      employmentStatus: "ACTIVE",
      OR: [
        { payType: "MONTHLY_FIXED", basicSalary: { gt: 0 } },
        { payType: "HOURLY", hourlyRate: { not: null } },
      ],
    },
    select: { id: true, payType: true, basicSalary: true, hourlyRate: true },
  });

  if (employees.length === 0) {
    throw new AppError(400, "Branch has no active employees with a pay rate set");
  }

  const employeeIds = employees.map((e) => e.id);

  // Public holidays in the period.
  const periodHolidays = await prisma.publicHoliday.findMany({
    where: { date: { gte: run.periodStart, lte: run.periodEnd } },
    select: { date: true, name: true, amount: true, percentage: true },
  });
  const periodHolidayDateKeys = new Set(periodHolidays.map((h) => h.date.toISOString().slice(0, 10)));

  // OT rate setting.
  const settingRows = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          "payroll.late_deduction_per_minute",
          "payroll.night_diff_rate",
          "attendance.late_threshold",
        ],
      },
    },
    select: { key: true, value: true },
  });

  function getSetting(key: string, fallback: number): number {
    const row = settingRows.find((r) => r.key === key);
    if (!row) return fallback;
    const v = JSON.parse(row.value);
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  }

  const lateDeductionPerMinute = getSetting("payroll.late_deduction_per_minute", 0);
  const nightDiffPct           = getSetting("payroll.night_diff_rate", 0); // percentage, e.g. 10 = 10%
  const lateThresholdMinutes = getSetting("attendance.late_threshold", 0); // 0 = no grace period if not configured

  const tz = COMPANY_TZ;

  // Shift assignments for the period — determines which days are paid.
  const shiftAssignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId: { in: employeeIds },
      shift: { date: { gte: run.periodStart, lte: run.periodEnd } },
    },
    select: {
      employeeId: true,
      overtimeApproved: true,
      shift: { select: { date: true, startTime: true, endTime: true, shiftType: { select: { breakDuration: true } } } },
    },
  });

  // Approved overtime requests for the period (employee-submitted + reviewed).
  const approvedOtRequests = await prisma.overtimeRequest.findMany({
    where: {
      employeeId: { in: employeeIds },
      status: "APPROVED",
      date: { gte: run.periodStart, lte: run.periodEnd },
    },
    select: { employeeId: true, date: true, otHours: true },
  });

  // Admin-assigned overtime schedules for the period (auto-approved).
  const otSchedules = await prisma.overtimeSchedule.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: { gte: run.periodStart, lte: run.periodEnd },
    },
    select: { employeeId: true, date: true, otHours: true },
  });

  // scheduledDatesMap:    empId → Set of dateKeys with a shift assignment.
  // scheduledHoursMap:    empId → dateKey → scheduled shift duration (hours).
  // scheduledShiftEndMap: empId → dateKey → scheduled shift end (UTC Date).
  // scheduledShiftStartMap: empId → dateKey → scheduled shift start (UTC Date).
  // overtimeApprovedDatesMap: empId → Set of dateKeys where OT is approved.
  const scheduledDatesMap = new Map<string, Set<string>>();
  const scheduledHoursMap = new Map<string, Map<string, number>>();
  const scheduledShiftEndMap = new Map<string, Map<string, Date>>();
  const scheduledShiftStartMap = new Map<string, Map<string, Date>>();
  const overtimeApprovedDatesMap = new Map<string, Set<string>>();
  const assignedOtHoursMap = new Map<string, Map<string, number>>();

  for (const sa of shiftAssignments) {
    const dateKey = sa.shift.date.toISOString().slice(0, 10);

    // Handle overnight/graveyard shifts: endTime < startTime in @db.Time UTC storage.
    const startMs = sa.shift.startTime.getTime();
    const endMs = sa.shift.endTime.getTime();
    const shiftMs = endMs >= startMs ? endMs - startMs : endMs - startMs + 24 * 3_600_000;
    const breakMins = sa.shift.shiftType?.breakDuration ?? 60;
    const shiftHrs = shiftMs / 3_600_000 - breakMins / 60;

    if (!scheduledDatesMap.has(sa.employeeId)) scheduledDatesMap.set(sa.employeeId, new Set());
    scheduledDatesMap.get(sa.employeeId)!.add(dateKey);

    if (!scheduledHoursMap.has(sa.employeeId)) scheduledHoursMap.set(sa.employeeId, new Map());
    const prev = scheduledHoursMap.get(sa.employeeId)!.get(dateKey) ?? 0;
    if (shiftHrs > prev) scheduledHoursMap.get(sa.employeeId)!.set(dateKey, shiftHrs);

    if (!scheduledShiftEndMap.has(sa.employeeId)) scheduledShiftEndMap.set(sa.employeeId, new Map());
    if (!scheduledShiftStartMap.has(sa.employeeId)) scheduledShiftStartMap.set(sa.employeeId, new Map());
    const { scheduledStart: shiftStart, scheduledEnd } = getScheduledTimes(sa.shift.date, sa.shift, tz);
    scheduledShiftStartMap.get(sa.employeeId)!.set(dateKey, shiftStart);
    scheduledShiftEndMap.get(sa.employeeId)!.set(dateKey, scheduledEnd);

    // Pre-approved OT on the shift assignment itself.
    if (sa.overtimeApproved) {
      if (!overtimeApprovedDatesMap.has(sa.employeeId)) overtimeApprovedDatesMap.set(sa.employeeId, new Set());
      overtimeApprovedDatesMap.get(sa.employeeId)!.add(dateKey);
    }
  }

  // Also mark dates covered by an approved OvertimeRequest.
  for (const ot of approvedOtRequests) {
    const dateKey = ot.date.toISOString().slice(0, 10);
    if (!overtimeApprovedDatesMap.has(ot.employeeId)) overtimeApprovedDatesMap.set(ot.employeeId, new Set());
    overtimeApprovedDatesMap.get(ot.employeeId)!.add(dateKey);
    if (!assignedOtHoursMap.has(ot.employeeId)) assignedOtHoursMap.set(ot.employeeId, new Map());
    assignedOtHoursMap.get(ot.employeeId)!.set(dateKey, toNum(ot.otHours));
  }

  // Also mark dates covered by an admin-assigned OvertimeSchedule (auto-approved).
  for (const sched of otSchedules) {
    const dateKey = sched.date.toISOString().slice(0, 10);
    if (!overtimeApprovedDatesMap.has(sched.employeeId)) overtimeApprovedDatesMap.set(sched.employeeId, new Set());
    overtimeApprovedDatesMap.get(sched.employeeId)!.add(dateKey);
    if (!assignedOtHoursMap.has(sched.employeeId)) assignedOtHoursMap.set(sched.employeeId, new Map());
    // Schedule-assigned hours take priority over request hours if both exist for the same date.
    assignedOtHoursMap.get(sched.employeeId)!.set(dateKey, toNum(sched.otHours));
  }

  // Attendance for the period.
  const attendanceRows = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: { gte: run.periodStart, lte: run.periodEnd },
    },
    select: { employeeId: true, date: true, clockIn: true, clockOut: true, hoursWorked: true, overtimeHours: true, lateMinutes: true, source: true },
    orderBy: [{ clockIn: "asc" }],
  });

  // For MANUAL attendance records that have no matching ShiftAssignment (e.g., created before
  // the automatic ShiftAssignment creation was added), look up published shifts for the branch
  // on those dates and use the max shift duration as a cap reference. This prevents uncapped
  // accumulation of raw clock-in/out hours beyond what any shift on that day allows.
  {
    const manualNoShiftMap = new Map<string, Set<string>>();
    for (const rec of attendanceRows) {
      if (rec.source !== "MANUAL") continue;
      const dateKey = rec.date.toISOString().slice(0, 10);
      if (scheduledDatesMap.get(rec.employeeId)?.has(dateKey)) continue;
      if (!manualNoShiftMap.has(rec.employeeId)) manualNoShiftMap.set(rec.employeeId, new Set());
      manualNoShiftMap.get(rec.employeeId)!.add(dateKey);
    }

    if (manualNoShiftMap.size > 0) {
      const allDates = [...new Set([...manualNoShiftMap.values()].flatMap((s) => [...s]))];
      const fallbackShifts = await prisma.shift.findMany({
        where: {
          branchId: run.branchId,
          date: { in: allDates.map((d) => new Date(d + "T00:00:00.000Z")) },
        },
        select: {
          date: true,
          startTime: true,
          endTime: true,
          shiftType: { select: { breakDuration: true } },
        },
      });

      for (const shift of fallbackShifts) {
        const dateKey = shift.date.toISOString().slice(0, 10);
        const startMs = shift.startTime.getTime();
        const endMs = shift.endTime.getTime();
        const shiftMs = endMs >= startMs ? endMs - startMs : endMs - startMs + 24 * 3_600_000;
        const breakMins = shift.shiftType?.breakDuration ?? 60;
        const shiftHrs = shiftMs / 3_600_000 - breakMins / 60;

        for (const [empId, dates] of manualNoShiftMap) {
          if (!dates.has(dateKey)) continue;
          if (!scheduledHoursMap.has(empId)) scheduledHoursMap.set(empId, new Map());
          const prev = scheduledHoursMap.get(empId)!.get(dateKey) ?? 0;
          if (shiftHrs > prev) scheduledHoursMap.get(empId)!.set(dateKey, shiftHrs);
        }
      }
    }
  }

  // Returns how many hours of [clockIn, clockOut] fall in the 22:00–06:00 local window.
  function computeNightDiffHours(clockIn: Date, clockOut: Date | null): number {
    if (!clockOut || clockOut <= clockIn) return 0;
    let totalHours = 0;
    const inDate = new Date(localCalendarDate(clockIn, tz));
    const outDate = localCalendarDate(clockOut, tz);
    const cursor = new Date(inDate);
    while (cursor <= outDate) {
      const cursorKey = localDateKey(cursor, tz);
      const nextKey = (() => {
        const d = new Date(cursor);
        d.setUTCDate(d.getUTCDate() + 1);
        return localDateKey(d, tz);
      })();
      const nightStart = localMidnightUtc(cursorKey, tz).getTime() + 22 * 3_600_000;
      const nightEnd   = localMidnightUtc(nextKey, tz).getTime() + 6 * 3_600_000;
      const oStart = Math.max(clockIn.getTime(),  nightStart);
      const oEnd   = Math.min(clockOut.getTime(), nightEnd);
      if (oEnd > oStart) totalHours += (oEnd - oStart) / 3_600_000;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return round2(totalHours);
  }

  const otHoursMap = new Map<string, number>();
  const hoursWorkedMap = new Map<string, number>();
  const lateMinutesMap = new Map<string, number>();
  const nightDiffHoursMap = new Map<string, number>();
  // Per-employee, per-date attendance for holiday pay eligibility check.
  // isOvernight = true when clockOut falls on a different calendar date than clockIn
  // (i.e. the shift spans midnight). When a date has both a daytime and an overnight
  // record (e.g. employee works two shifts on the same day), the daytime record wins
  // so that holiday-pay eligibility is not incorrectly discarded.
  const attendanceDateMap = new Map<string, Map<string, { hoursWorked: number; lateMinutes: number; isOvernight: boolean }>>();
  // Holiday pay map keyed by LOCAL clock-out date (not attendance start date).
  // Rule: a shift qualifies for holiday pay on the date its clock-out falls in local time.
  //  • Apr 30 3rd shift (clock-out 7AM May 1 local) → May 1 holiday, hours = midnight→7AM
  //  • May 1 3rd shift (clock-out 7AM May 2 local) → NOT May 1 holiday
  //  • May 1 day shift / 12hr shift → May 1 holiday, hours capped at 8 (standard daily rate basis)
  const holidayAttMap = new Map<string, Map<string, { hoursOnDate: number; lateMinutes: number; isCrossing: boolean }>>();
  for (const rec of attendanceRows) {
    const dateKey = rec.date.toISOString().slice(0, 10);
    const hasShift = scheduledDatesMap.get(rec.employeeId)?.has(dateKey) ?? false;

    // Kiosk records only count on scheduled days or public holidays (shift generation
    // commonly excludes holidays, so no shift assignment exists even though the employee worked).
    // Admin-created (MANUAL) records are always counted regardless of schedule.
    if (!hasShift && rec.source !== "MANUAL" && !periodHolidayDateKeys.has(dateKey)) {
      console.log(`[payroll:att] SKIP emp=${rec.employeeId} date=${dateKey} hasShift=${hasShift} source=${rec.source} isHoliday=${periodHolidayDateKeys.has(dateKey)}`);
      continue;
    }

    const scheduledHrs = scheduledHoursMap.get(rec.employeeId)?.get(dateKey) ?? 0;
    const shiftStartForDate = scheduledShiftStartMap.get(rec.employeeId)?.get(dateKey);
    const shiftEnd = scheduledShiftEndMap.get(rec.employeeId)?.get(dateKey);
    console.log(`[payroll:att] PROC emp=${rec.employeeId} date=${dateKey} hasShift=${hasShift} scheduledHrs=${scheduledHrs} clockIn=${rec.clockIn?.toISOString()} clockOut=${rec.clockOut?.toISOString()} hoursWorked=${rec.hoursWorked} source=${rec.source}`);

    // Only count overtime hours if explicitly approved (shift-level, OvertimeRequest, or OvertimeSchedule).
    const isOtApproved = overtimeApprovedDatesMap.get(rec.employeeId)?.has(dateKey) ?? false;
    const assignedOtHrs = assignedOtHoursMap.get(rec.employeeId)?.get(dateKey);
    const otHrs = isOtApproved ? (assignedOtHrs ?? toNum(rec.overtimeHours)) : 0;

    // Clip clock-in/out to the scheduled shift window so early clock-ins and
    // unapproved late clock-outs don't inflate regular hours. Manual records
    // without a shift use raw hoursWorked directly.
    const effectiveClockIn = shiftStartForDate && rec.clockIn < shiftStartForDate
      ? shiftStartForDate
      : rec.clockIn;
    const effectiveClockOut = (!isOtApproved && rec.clockOut && shiftEnd && rec.clockOut > shiftEnd)
      ? shiftEnd
      : rec.clockOut;

    // Use the effective (clipped) clock-in/out times when a shift exists.
    // Without a shift (manual records), use the stored hoursWorked directly.
    // The scheduledHrs cap already accounts for unpaid break time.
    const actualHrs = shiftStartForDate
      ? (effectiveClockOut ? hoursBetween(effectiveClockIn, effectiveClockOut) : scheduledHrs)
      : rec.hoursWorked !== null
        ? toNum(rec.hoursWorked)
        : scheduledHrs;

    // Regular hours = actual minus approved OT, capped at scheduled shift duration.
    // For manually-added attendance with no shift assignment, use actual hours directly (no cap).
    const regularHrs = scheduledHrs > 0
      ? Math.min(Math.max(0, actualHrs - otHrs), scheduledHrs)
      : Math.max(0, actualHrs - otHrs);
    const countedHrs = round2(regularHrs + otHrs);

    // Compute late minutes live from clock-in vs scheduled shift start so stale or
    // missing lateMinutes on the attendance record never bleed into the deduction.
    const computedLateMinutes = (() => {
      if (!shiftStartForDate) return rec.lateMinutes ?? 0;
      const delta = Math.floor((rec.clockIn.getTime() - shiftStartForDate.getTime()) / 60_000);
      // Overnight correction: if delta < -6 h the clock-in is in the early-morning tail of
      // a graveyard shift that started the previous calendar day — re-anchor to prev-day start.
      if (delta < -6 * 60) {
        const prevDay = new Date(shiftStartForDate.getTime() - 24 * 60 * 60 * 1000);
        return Math.max(0, Math.floor((rec.clockIn.getTime() - prevDay.getTime()) / 60_000));
      }
      return Math.max(0, delta);
    })();

    otHoursMap.set(rec.employeeId, (otHoursMap.get(rec.employeeId) ?? 0) + otHrs);
    hoursWorkedMap.set(rec.employeeId, (hoursWorkedMap.get(rec.employeeId) ?? 0) + countedHrs);
    lateMinutesMap.set(rec.employeeId, (lateMinutesMap.get(rec.employeeId) ?? 0) + computedLateMinutes);

    // Cap both ends of the night diff window to the scheduled shift so early
    // clock-ins and unapproved late clock-outs don't inflate night diff hours.
    const ndClockIn  = effectiveClockIn;
    const ndClockOut = effectiveClockOut;
    const ndHrs = computeNightDiffHours(ndClockIn, ndClockOut);
    if (ndHrs > 0) {
      nightDiffHoursMap.set(rec.employeeId, (nightDiffHoursMap.get(rec.employeeId) ?? 0) + ndHrs);
    }

    // Detect overnight: clockOut falls on a different local calendar date than clockIn.
    const isOvernight = !!(rec.clockOut && isCrossingLocal(rec.clockIn, rec.clockOut, tz));

    if (!attendanceDateMap.has(rec.employeeId)) attendanceDateMap.set(rec.employeeId, new Map());
    const existingAtt = attendanceDateMap.get(rec.employeeId)!.get(dateKey);
    // Prefer daytime (non-overnight) record when both exist on the same date.
    if (!existingAtt || (existingAtt.isOvernight && !isOvernight)) {
      attendanceDateMap.get(rec.employeeId)!.set(dateKey, {
        hoursWorked: countedHrs,
        lateMinutes: computedLateMinutes,
        isOvernight,
      });
    }

    // Build holidayAttMap using local clock-out date so crossing shifts are credited to the
    // correct holiday (e.g. Apr 30 3rd shift clock-out on May 1 local → May 1 holiday entry).
    if (rec.clockOut) {
      const localOutDateKey = localDateKey(rec.clockOut, tz);
      const isCrossing = isCrossingLocal(rec.clockIn, rec.clockOut, tz);
      // Crossing: hours from local midnight of clock-out date to actual clock-out (e.g. 7hr for
      //   a 3rd shift ending 7AM). When the clock-out date is itself a holiday, use the full
      //   shift hours (capped at 8) so shifts that end exactly at midnight don't get zeroed out.
      // Same-day: countedHrs (break-adjusted, consistent with pay calc).
      const hoursOnDate = isCrossing
        ? (periodHolidayDateKeys.has(localOutDateKey)
            ? Math.min(countedHrs, 8)
            : Math.max(0, round2(localHoursSinceMidnight(rec.clockOut, tz))))
        : countedHrs;

      if (!holidayAttMap.has(rec.employeeId)) holidayAttMap.set(rec.employeeId, new Map());
      const empHMap = holidayAttMap.get(rec.employeeId)!;
      const existingH = empHMap.get(localOutDateKey);
      // Keep the entry with the most hours on the holiday date. Crossing shifts
      // (e.g. Apr 30 3rd shift → May 1) should not be overwritten by a same-day
      // shift when both land on the same holiday date.
      if (!existingH || hoursOnDate > existingH.hoursOnDate) {
        empHMap.set(localOutDateKey, { hoursOnDate, lateMinutes: computedLateMinutes, isCrossing });
      }

      // For crossing shifts, also store an entry under the clock-IN date so that any
      // hours worked on that date are credited to its holiday (if one exists).
      // Examples: 2nd shift 3PM May 1 → May 2 (~9 hrs on May 1), PM 12-Hour 7PM May 1
      // → May 2 (5 hrs on May 1). hoursOnDate here = clock-in to local midnight.
      // Night shifts starting at or after 22:00 local (e.g. 3rd shift 11PM) are excluded —
      // their holiday coverage comes from the prior day's crossing shift instead.
      if (isCrossing) {
        // Use the scheduled shift start to determine if this is a late-night shift.
        // Fall back to the actual clock-in time when no shift assignment exists.
        const shiftStart = scheduledShiftStartMap.get(rec.employeeId)?.get(dateKey) ?? rec.clockIn;
        const isNightShift = localTimeInMinutes(shiftStart, tz) >= 22 * 60; // starts at or after 22:00 local
        console.log(`[payroll:att] XING emp=${rec.employeeId} date=${dateKey} isCrossing=${isCrossing} isNightShift=${isNightShift} localTime=${localTimeInMinutes(shiftStart, tz)}`);
        if (!isNightShift) {
          // Cap early clock-in at the scheduled shift start so early login
          // does not inflate holiday pay credit (e.g. 6:41pm login for a 7pm
          // shift should credit 5 hrs, not 5.32 hrs).
          const effectiveClockIn = rec.clockIn > shiftStart ? rec.clockIn : shiftStart;
          const hoursOnInDate = Math.max(0, round2(24 - localHoursSinceMidnight(effectiveClockIn, tz)));
          if (hoursOnInDate > 0) {
            const localInDateKey = localDateKey(rec.clockIn, tz);
            const existingIn = empHMap.get(localInDateKey);
            console.log(`[payroll:att] IN-DATE emp=${rec.employeeId} localInDate=${localInDateKey} hoursOnInDate=${hoursOnInDate} existingIn=${!!existingIn} existingHours=${existingIn?.hoursOnDate}`);
            if (!existingIn) {
              empHMap.set(localInDateKey, { hoursOnDate: hoursOnInDate, lateMinutes: computedLateMinutes, isCrossing: true });
              console.log(`[payroll:att] IN-DATE SET emp=${rec.employeeId} ${localInDateKey} = ${hoursOnInDate}`);
            }
          }
        }
      }
    }
  }

  // Credit approved overtime hours from schedules and requests even when no attendance
  // record exists for the date (e.g. employee forgot to clock, or schedule is future-dated).
  for (const [empId, dateMap] of assignedOtHoursMap) {
    for (const [dateKey, otHrs] of dateMap) {
      // Skip dates already covered by an attendance record.
      if (attendanceDateMap.get(empId)?.has(dateKey)) continue;
      if (otHrs <= 0) continue;
      otHoursMap.set(empId, (otHoursMap.get(empId) ?? 0) + otHrs);
      hoursWorkedMap.set(empId, (hoursWorkedMap.get(empId) ?? 0) + otHrs);
      if (!attendanceDateMap.has(empId)) attendanceDateMap.set(empId, new Map());
      attendanceDateMap.get(empId)!.set(dateKey, { hoursWorked: otHrs, lateMinutes: 0, isOvernight: false });
    }
  }

  // Boundary attendance: for every holiday in the period, fetch attendance records
  // from the day before whose clock-out falls on the holiday date. This credits
  // holiday pay in the period where the holiday belongs (e.g. Apr 30 3rd shift
  // clocking out on May 1 → holiday pay appears in the May 1-15 payroll).
  {
    // Collect the unique day-before dates that precede a holiday in this period.
    const boundaryDates = new Set<string>();
    for (const h of periodHolidays) {
      const prev = new Date(h.date);
      prev.setUTCDate(prev.getUTCDate() - 1);
      boundaryDates.add(prev.toISOString().slice(0, 10));
    }

    console.log("[payroll:boundary] periodHolidays:", periodHolidays.map(h => h.date.toISOString().slice(0, 10)));
    console.log("[payroll:boundary] boundaryDates:", [...boundaryDates]);

    if (boundaryDates.size > 0) {
      // Fetch shift assignments on the boundary dates to identify 3rd-shift
      // (overnight) assignments: endTime < startTime in raw @db.Time (e.g. 22:00-06:00).
      const boundaryShiftAssignments = await prisma.shiftAssignment.findMany({
        where: {
          employeeId: { in: employeeIds },
          shift: { date: { in: [...boundaryDates].map((d) => new Date(d + "T00:00:00.000Z")) } },
        },
        select: {
          employeeId: true,
          shift: { select: { date: true, startTime: true, endTime: true } },
        },
      });

      // Set of "employeeId|dateKey" for overnight shifts on the boundary dates.
      const boundaryOvernightSet = new Set<string>();
      for (const sa of boundaryShiftAssignments) {
        const startMs = sa.shift.startTime.getUTCHours() * 60 + sa.shift.startTime.getUTCMinutes();
        const endMs = sa.shift.endTime.getUTCHours() * 60 + sa.shift.endTime.getUTCMinutes();
        if (endMs < startMs) {
          const dk = sa.shift.date.toISOString().slice(0, 10);
          boundaryOvernightSet.add(`${sa.employeeId}|${dk}`);
        }
      }
      console.log("[payroll:boundary] boundaryOvernightSet:", [...boundaryOvernightSet]);

      const boundaryAttendance = await prisma.attendance.findMany({
        where: {
          employeeId: { in: employeeIds },
          date: { in: [...boundaryDates].map((d) => new Date(d + "T00:00:00.000Z")) },
        },
        select: { employeeId: true, date: true, clockIn: true, clockOut: true, hoursWorked: true, lateMinutes: true },
      });

      console.log("[payroll:boundary] boundaryAttendance count:", boundaryAttendance.length);
      for (const r of boundaryAttendance) {
        console.log(`[payroll:boundary]   emp=${r.employeeId} date=${r.date.toISOString().slice(0,10)} clockIn=${r.clockIn.toISOString()} clockOut=${r.clockOut?.toISOString()} late=${r.lateMinutes}`);
      }

      // Build a lookup: holiday date key → previous date key
      const holidayToPrevDate = new Map<string, string>();
      for (const h of periodHolidays) {
        const holidayKey = h.date.toISOString().slice(0, 10);
        const prev = new Date(h.date);
        prev.setUTCDate(prev.getUTCDate() - 1);
        holidayToPrevDate.set(holidayKey, prev.toISOString().slice(0, 10));
      }
      console.log("[payroll:boundary] holidayToPrevDate:", [...holidayToPrevDate.entries()]);

      for (const rec of boundaryAttendance) {
        if (!rec.clockOut) {
          console.log(`[payroll:boundary] SKIP emp=${rec.employeeId}: no clockOut`);
          continue;
        }
        const recDateKey = rec.date.toISOString().slice(0, 10);

        // Detect overnight shifts on this attendance date. When clock-in/out
        // were stored with the shift date (e.g. 3rd shift Apr 30 10pm-6am,
        // clock-out 8am May 1 stored as 8am Apr 30), adjust times forward 24h
        // so the clock-out lands on the correct calendar date.
        const isOvernightShift = boundaryOvernightSet.has(`${rec.employeeId}|${recDateKey}`);
        let effectiveClockIn = rec.clockIn;
        let effectiveClockOut = rec.clockOut;
        if (isOvernightShift && !isCrossingLocal(rec.clockIn, rec.clockOut, tz)) {
          const clockInLocal = localDateKey(rec.clockIn, tz);
          if (clockInLocal === recDateKey) {
            effectiveClockIn = new Date(rec.clockIn.getTime() + 24 * 3_600_000);
            effectiveClockOut = new Date(rec.clockOut.getTime() + 24 * 3_600_000);
            console.log(`[payroll:boundary] ADJUST emp=${rec.employeeId}: +24h for overnight shift, clockIn=${effectiveClockIn.toISOString()} clockOut=${effectiveClockOut.toISOString()}`);
          }
        }

        const localOutKey = localDateKey(effectiveClockOut, tz);
        const matchPrev = holidayToPrevDate.get(localOutKey);
        console.log(`[payroll:boundary] CHECK emp=${rec.employeeId} recDate=${recDateKey} localOut=${localOutKey} matchPrev=${matchPrev} match=${matchPrev === recDateKey}`);
        if (matchPrev !== recDateKey) {
          console.log(`[payroll:boundary] SKIP emp=${rec.employeeId}: not holiday-adjacent`);
          continue;
        }

        // Only credit holiday pay when the attendance is from a 3rd / overnight
        // shift: either the clock genuinely crosses midnight, or the employee
        // clocked in late and all hours land on the holiday date (but the shift
        // started the previous calendar day). A day-shift overtime tail past
        // midnight is not a 3rd shift and does not earn next-day holiday pay.
        const crossing = isCrossingLocal(effectiveClockIn, effectiveClockOut, tz);
        console.log(`[payroll:boundary]   crossing=${crossing}`);
        if (!crossing) {
          // Non-crossing: clock-in and clock-out on the same local date. This is
          // a 3rd shift only if that date differs from the attendance date (e.g.
          // attendance date Apr 30 but clock-in/out both on May 1 = late for an
          // overnight shift).
          const clockInLocal = localDateKey(effectiveClockIn, tz);
          console.log(`[payroll:boundary]   non-crossing: clockInLocal=${clockInLocal} recDate=${recDateKey} same=${clockInLocal === recDateKey}`);
          if (clockInLocal === recDateKey) {
            console.log(`[payroll:boundary] SKIP emp=${rec.employeeId}: non-crossing same-date (not 3rd shift)`);
            continue;
          }
        }
        // For crossing shifts, also verify the shift assignment is overnight
        // (endTime < startTime) when available. If no assignment found, allow
        // the crossing shift through — it's inherently overnight.
        if (crossing && scheduledShiftEndMap.has(rec.employeeId)) {
          const shiftStart = scheduledShiftStartMap.get(rec.employeeId)?.get(recDateKey);
          const shiftEnd = scheduledShiftEndMap.get(rec.employeeId)?.get(recDateKey);
          if (shiftStart && shiftEnd) {
            const startMs = shiftStart.getUTCHours() * 60 + shiftStart.getUTCMinutes();
            const endMs = shiftEnd.getUTCHours() * 60 + shiftEnd.getUTCMinutes();
            console.log(`[payroll:boundary]   crossing shift check: startMs=${startMs} endMs=${endMs} overnight=${endMs < startMs}`);
            // endMs < startMs means the stored @db.Time wraps (e.g. 06:00 < 22:00 = overnight)
            if (endMs >= startMs) {
              console.log(`[payroll:boundary] SKIP emp=${rec.employeeId}: crossing not overnight shift`);
              continue;
            }
          }
        }

        const dayBeforePeriodKey = recDateKey;

        if (!attendanceDateMap.has(rec.employeeId)) attendanceDateMap.set(rec.employeeId, new Map());
        if (!attendanceDateMap.get(rec.employeeId)!.has(dayBeforePeriodKey)) {
          const isOvernight = !!(rec.clockOut &&
            isCrossingLocal(effectiveClockIn, effectiveClockOut, tz));
          const hoursWorked = toNum(rec.hoursWorked);
          const storedLate = rec.lateMinutes ?? 0;
          const effectiveLate = storedLate > 0 ? storedLate : Math.round(Math.max(0, 8 - hoursWorked) * 60);
          attendanceDateMap.get(rec.employeeId)!.set(dayBeforePeriodKey, {
            hoursWorked,
            lateMinutes: effectiveLate,
            isOvernight,
          });

          // Credit holiday pay for this boundary record.
          const localOutDateKey = localOutKey;
          const midnightUtc = localMidnightUtc(localOutDateKey, tz);
          const creditFromMs = crossing ? midnightUtc.getTime() : effectiveClockIn.getTime();
          const capMs = midnightUtc.getTime() + 8 * 3_600_000;
          const outMs = Math.min(effectiveClockOut.getTime(), capMs);
          const hoursOnDate = Math.max(0, round2((outMs - creditFromMs) / 3_600_000));
          console.log(`[payroll:boundary] CREDIT emp=${rec.employeeId} holidayDate=${localOutDateKey} hoursOnDate=${hoursOnDate} lateMinutes=${effectiveLate} isCrossing=${crossing}`);
          if (!holidayAttMap.has(rec.employeeId)) holidayAttMap.set(rec.employeeId, new Map());
          const empHMap = holidayAttMap.get(rec.employeeId)!;
          const existingBoundary = empHMap.get(localOutDateKey);
          if (!existingBoundary || hoursOnDate >= existingBoundary.hoursOnDate) {
            empHMap.set(localOutDateKey, { hoursOnDate, lateMinutes: effectiveLate, isCrossing: crossing });
          }
        }
      }
    } else {
      console.log("[payroll:boundary] NO boundaryDates (periodHolidays empty?)");
    }
  }

  console.log("[payroll:holidayAttMap] final state:");
  for (const [empId, dateMap] of holidayAttMap) {
    for (const [dk, entry] of dateMap) {
      console.log(`[payroll:holidayAttMap]   emp=${empId} date=${dk} hoursOnDate=${entry.hoursOnDate} lateMinutes=${entry.lateMinutes} isCrossing=${entry.isCrossing}`);
    }
  }

  // Approved UNPAID leave days per employee within the payroll period.
  const unpaidLeaveRows = await prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: employeeIds },
      leaveType: "UNPAID",
      status: "APPROVED",
      startDate: { lte: run.periodEnd },
      endDate: { gte: run.periodStart },
    },
    select: { employeeId: true, startDate: true, endDate: true, totalDays: true },
  });

  // Clamp each leave to the payroll period and sum up days per employee.
  const unpaidDaysMap = new Map<string, number>();
  for (const leave of unpaidLeaveRows) {
    const clampedStart = leave.startDate < run.periodStart ? run.periodStart : leave.startDate;
    const clampedEnd   = leave.endDate   > run.periodEnd   ? run.periodEnd   : leave.endDate;
    const msPerDay = 1000 * 60 * 60 * 24;
    const clampedDays = Math.round((clampedEnd.getTime() - clampedStart.getTime()) / msPerDay) + 1;
    // Use totalDays from the record but cap it to the clamped range so partial-period leaves are correct.
    const days = Math.min(toNum(leave.totalDays), clampedDays);
    unpaidDaysMap.set(leave.employeeId, round2((unpaidDaysMap.get(leave.employeeId) ?? 0) + days));
  }

  // Approved paid leave days per employee within the payroll period (non-UNPAID types).
  // Used to credit HOURLY employees who would otherwise lose pay for approved leave days.
  const paidLeaveRows = await prisma.leaveRequest.findMany({
    where: {
      employeeId: { in: employeeIds },
      leaveType: { not: "UNPAID" },
      status: "APPROVED",
      startDate: { lte: run.periodEnd },
      endDate: { gte: run.periodStart },
    },
    select: { employeeId: true, startDate: true, endDate: true, totalDays: true, leaveType: true },
  });

  const paidLeaveDaysMap = new Map<string, number>();
  for (const leave of paidLeaveRows) {
    const clampedStart = leave.startDate < run.periodStart ? run.periodStart : leave.startDate;
    const clampedEnd   = leave.endDate   > run.periodEnd   ? run.periodEnd   : leave.endDate;
    const msPerDay = 1000 * 60 * 60 * 24;
    const clampedDays = Math.round((clampedEnd.getTime() - clampedStart.getTime()) / msPerDay) + 1;
    const days = Math.min(toNum(leave.totalDays), clampedDays);
    paidLeaveDaysMap.set(leave.employeeId, round2((paidLeaveDaysMap.get(leave.employeeId) ?? 0) + days));
  }

  // Pre-fetch all employee deduction assignments for this batch.
  const allEmpDeductions = await prisma.employeeDeduction.findMany({
    where: { employeeId: { in: employeeIds } },
    include: { deduction: { select: { name: true, type: true, amount: true } } },
  });

  const empDeductionMap = new Map<string, typeof allEmpDeductions>();
  for (const ed of allEmpDeductions) {
    const arr = empDeductionMap.get(ed.employeeId) ?? [];
    arr.push(ed);
    empDeductionMap.set(ed.employeeId, arr);
  }

  // Pre-fetch all employee profile earnings (BONUS, ALLOWANCE, OTHER) for this batch.
  const allEmpEarnings = await prisma.employeeEarning.findMany({
    where: { employeeId: { in: employeeIds } },
  });

  const empEarningMap = new Map<string, typeof allEmpEarnings>();
  for (const ee of allEmpEarnings) {
    const arr = empEarningMap.get(ee.employeeId) ?? [];
    arr.push(ee);
    empEarningMap.set(ee.employeeId, arr);
  }

  const processed = await prisma.$transaction(async (tx) => {
    await tx.payslip.deleteMany({ where: { payrollRunId: run.id } });

    for (const emp of employees) {
      // Skip employees with no work in this period and no holiday pay from a crossing shift.
      if (!scheduledDatesMap.has(emp.id) && !hoursWorkedMap.has(emp.id) && !holidayAttMap.has(emp.id)) continue;

      const totalOtHours = round2(otHoursMap.get(emp.id) ?? 0);
      const totalHoursWorked = round2(hoursWorkedMap.get(emp.id) ?? 0);

      let basicPay: number;
      let overtimePay: number;

      // Employee's effective hourly rate, used for OT pay and as base for night diff.
      // OT is paid at the employee's regular hourly rate.
      const baseHourlyRate = emp.payType === "HOURLY"
        ? toNum(emp.hourlyRate)
        : toNum(emp.basicSalary) / 26 / 8;

      if (emp.payType === "HOURLY") {
        const rate = toNum(emp.hourlyRate);
        const regularHours = round2(Math.max(0, totalHoursWorked - totalOtHours));
        basicPay = round2(rate * regularHours);
        overtimePay = totalOtHours > 0 ? round2(totalOtHours * baseHourlyRate) : 0;
      } else {
        basicPay = round2(toNum(emp.basicSalary) / 2);
        overtimePay = totalOtHours > 0 ? round2(totalOtHours * baseHourlyRate) : 0;
      }

      const overtimeEarnings: Array<{ type: "OVERTIME"; label: string; amount: number }> =
        totalOtHours > 0
          ? [{ type: "OVERTIME" as const, label: `Overtime (${totalOtHours} hrs × ₱${baseHourlyRate}/hr)`, amount: overtimePay }]
          : [];

      const totalNightDiffHours = round2(nightDiffHoursMap.get(emp.id) ?? 0);
      const nightDiffPay = totalNightDiffHours > 0 && nightDiffPct > 0 && baseHourlyRate > 0
        ? round2(totalNightDiffHours * baseHourlyRate * (nightDiffPct / 100))
        : 0;
      const nightDiffEarnings: Array<{ type: "NIGHT_DIFFERENTIAL"; label: string; amount: number }> =
        nightDiffPay > 0
          ? [{ type: "NIGHT_DIFFERENTIAL" as const, label: `Night Differential (${totalNightDiffHours} hrs × ${nightDiffPct}%)`, amount: nightDiffPay }]
          : [];

      // Daily rate used for percentage-based holiday pay (8-hour equivalent).
      const dailyRateForHoliday = emp.payType === "HOURLY"
        ? round2(toNum(emp.hourlyRate) * 8)
        : round2(toNum(emp.basicSalary) / 26);

      const holidayEarnings: Array<{ type: "HOLIDAY_PAY"; label: string; amount: number }> =
        periodHolidays
          .map((h) => {
            const holidayDateKey = h.date.toISOString().slice(0, 10);
            const entry = holidayAttMap.get(emp.id)?.get(holidayDateKey);

            // Fallback: if holidayAttMap has no entry, derive hours from attendanceDateMap.
            // Only use non-overnight records — overnight shifts starting on the holiday
            // (e.g. May 1 3rd shift 11PM→8AM May 2) should not receive holiday pay;
            // their holiday coverage comes from the prior day's crossing shift instead.
            const fallback = !entry
              ? (() => {
                  const fb = attendanceDateMap.get(emp.id)?.get(holidayDateKey);
                  return fb && !fb.isOvernight ? fb : undefined;
                })()
              : undefined;
            if (!entry && !fallback) {
              console.log(`[payroll:holiday] NO ENTRY emp=${emp.id} holiday=${holidayDateKey} — holidayAttMap has emp: ${holidayAttMap.has(emp.id)}, attendanceDateMap has emp: ${attendanceDateMap.has(emp.id)}`);
            }
            if (!entry && !fallback) return null;

            const effectiveEntry = entry ?? {
              hoursOnDate: fallback!.hoursWorked,
              lateMinutes: fallback!.lateMinutes,
              isCrossing: fallback!.isOvernight,
            };

            // Eligible hours are capped at 8 (standard daily rate basis, covers both 8hr and 12hr
            // shifts). For crossing shifts (Apr 30 3rd → May 1), lateMinutes applied to the prior
            // day and don't reduce the holiday portion — just cap at actual hours on the holiday.
            // For same-day shifts, late reduces eligibility as before.
            const eligibleHours = effectiveEntry.isCrossing
              ? Math.min(effectiveEntry.hoursOnDate, 8)
              : Math.max(0, Math.min(effectiveEntry.hoursOnDate, 8 - effectiveEntry.lateMinutes / 60));
            const prorationFactor = round2(eligibleHours / 8);

            const pct = toNum(h.percentage);
            const amount = pct > 0
              ? round2(dailyRateForHoliday * prorationFactor * pct / 100)
              : round2(toNum(h.amount) * prorationFactor);

            if (amount <= 0) return null;

            console.log(`[payroll:holiday] CREDIT emp=${emp.id} holiday=${holidayDateKey} hoursOnDate=${effectiveEntry.hoursOnDate} isCrossing=${effectiveEntry.isCrossing} lateMinutes=${effectiveEntry.lateMinutes} eligibleHours=${eligibleHours} proration=${prorationFactor} amount=${amount}`);

            const label = pct > 0
              ? `${h.name} (${pct}% × ${eligibleHours.toFixed(2)} hrs)`
              : h.name;
            return { type: "HOLIDAY_PAY" as const, label, amount };
          })
          .filter((r): r is { type: "HOLIDAY_PAY"; label: string; amount: number } => r !== null);

      const holidayPayTotal = round2(holidayEarnings.reduce((s, r) => s + r.amount, 0));

      // Build profile earnings (BONUS, ALLOWANCE, OTHER) from this employee's assigned earnings.
      const empEarnings = empEarningMap.get(emp.id) ?? [];
      const profileEarningRows = empEarnings.map((ee) => ({
        type: ee.type as "BONUS" | "ALLOWANCE" | "OTHER",
        label: ee.label,
        amount: round2(toNum(ee.amount)),
      }));

      const bonuses    = round2(profileEarningRows.filter((r) => r.type === "BONUS").reduce((s, r) => s + r.amount, 0));
      const allowances = round2(profileEarningRows.filter((r) => r.type === "ALLOWANCE").reduce((s, r) => s + r.amount, 0));
      const otherEarningsTotal = round2(profileEarningRows.filter((r) => r.type === "OTHER").reduce((s, r) => s + r.amount, 0));

      // For HOURLY employees: credit approved paid leave days so they don't lose pay.
      // MONTHLY_FIXED employees already receive full semi-monthly pay regardless.
      const paidLeaveDays = emp.payType === "HOURLY" ? (paidLeaveDaysMap.get(emp.id) ?? 0) : 0;
      const paidLeaveEarnings: Array<{ type: "PAID_LEAVE"; label: string; amount: number }> = [];
      if (paidLeaveDays > 0) {
        const dailyRate = round2(toNum(emp.hourlyRate) * 8);
        const paidLeaveAmount = round2(dailyRate * paidLeaveDays);
        if (paidLeaveAmount > 0) {
          paidLeaveEarnings.push({
            type: "PAID_LEAVE",
            label: `Paid leave (${paidLeaveDays} day${paidLeaveDays !== 1 ? "s" : ""} × ₱${dailyRate}/day)`,
            amount: paidLeaveAmount,
          });
        }
      }
      const paidLeaveCredits = round2(paidLeaveEarnings.reduce((s, r) => s + r.amount, 0));

      // Build deductions from this employee's assigned deductions profile.
      const empDeductions = empDeductionMap.get(emp.id) ?? [];
      const deductionRows = empDeductions.map((ed) => ({
        type: toDeductionType(ed.deduction.type),
        label: ed.deduction.name,
        amount: round2(toNum(ed.amount ?? ed.deduction.amount)),
      }));

      // Auto-compute late deduction: only minutes exceeding the configured late threshold are
      // charged, at the rate set in payroll.late_deduction_per_minute. Both must be configured
      // in settings — no defaults are assumed.
      const totalLateMinutes = lateMinutesMap.get(emp.id) ?? 0;
      const deductibleMinutes = Math.max(0, totalLateMinutes - lateThresholdMinutes);
      if (lateDeductionPerMinute > 0 && deductibleMinutes > 0) {
        deductionRows.push({
          type: "LATE",
          label: `Late deduction (${deductibleMinutes} min × ₱${lateDeductionPerMinute}/min)`,
          amount: round2(deductibleMinutes * lateDeductionPerMinute),
        });
      }

      // Auto-compute unpaid leave deduction from approved UNPAID leave requests.
      // MONTHLY_FIXED: daily rate = basicSalary / 26 (DOLE standard divisor).
      // HOURLY: daily rate = hourlyRate × 8 hours.
      const unpaidDays = unpaidDaysMap.get(emp.id) ?? 0;
      if (unpaidDays > 0) {
        const dailyRate = emp.payType === "HOURLY"
          ? round2(toNum(emp.hourlyRate) * 8)
          : round2(toNum(emp.basicSalary) / 26);
        const unpaidLeaveAmount = round2(dailyRate * unpaidDays);
        if (unpaidLeaveAmount > 0) {
          deductionRows.push({
            type: "UNPAID_LEAVE",
            label: `Unpaid leave (${unpaidDays} day${unpaidDays !== 1 ? "s" : ""} × ₱${dailyRate}/day)`,
            amount: unpaidLeaveAmount,
          });
        }
      }

      // Fold into denormalized columns.
      const sssContribution        = sumByDeductionType(deductionRows, "SSS");
      const philhealthContribution = sumByDeductionType(deductionRows, "PHILHEALTH");
      const pagibigContribution    = sumByDeductionType(deductionRows, "PAGIBIG");
      const withholdingTax         = sumByDeductionType(deductionRows, "BIR_TAX");
      const lateDeductions         = sumByDeductionType(deductionRows, "LATE");
      const unpaidLeaveDeductions  = sumByDeductionType(deductionRows, "UNPAID_LEAVE");
      const cashAdvance            = sumByDeductionType(deductionRows, "CASH_ADVANCE");
      const salaryLoan             = sumByDeductionType(deductionRows, "SALARY_LOAN");
      const otherDeductions        = sumByDeductionType(deductionRows, "OTHER");
      const totalDeductions        = round2(deductionRows.reduce((s, r) => s + r.amount, 0));

      const grossPay = round2(basicPay + overtimePay + nightDiffPay + holidayPayTotal + bonuses + allowances + paidLeaveCredits + otherEarningsTotal);
      const netPay   = round2(grossPay - totalDeductions);

      console.log(`[payroll:payslip] CREATE emp=${emp.id} basicPay=${basicPay} overtimePay=${overtimePay} holidayPay=${holidayPayTotal} nightDiff=${nightDiffPay} paidLeave=${paidLeaveCredits} bonuses=${bonuses} allowances=${allowances} otherEarnings=${otherEarningsTotal} grossPay=${grossPay} totalDeductions=${totalDeductions} netPay=${netPay} totalHours=${totalHoursWorked} totalOtHours=${totalOtHours} holidayEarningsCount=${holidayEarnings.length}`);

      await tx.payslip.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.id,
          basicPay,
          overtimePay,
          bonuses,
          allowances,
          holidayPay: holidayPayTotal,
          paidLeaveCredits,
          grossPay,
          sssContribution,
          philhealthContribution,
          pagibigContribution,
          withholdingTax,
          lateDeductions,
          unpaidLeaveDeductions,
          cashAdvance,
          salaryLoan,
          otherDeductions,
          totalDeductions,
          netPay,
          totalHoursWorked,
          totalOtHours,
          totalLateMinutes: lateMinutesMap.get(emp.id) ?? 0,
          status: "DRAFT",
          earnings: { create: [...overtimeEarnings, ...nightDiffEarnings, ...holidayEarnings, ...paidLeaveEarnings, ...profileEarningRows] },
          deductions: { create: deductionRows },
        },
      });
    }

    return tx.payrollRun.update({
      where: { id: run.id },
      data: { status: "PROCESSING" },
      include: runInclude,
    });
  });

  await logAudit({
    action: "UPDATE",
    tableName: "payroll_runs",
    recordId: run.id,
    oldValues: { status: run.status },
    newValues: { status: "PROCESSING", generatedPayslips: processed.payslips.length },
  });
  return processed;
}

export interface FullyPaidDeduction {
  employeeDeductionId: string;
  employeeId: string;
  employeeName: string;
  deductionName: string;
  totalBalance: number;
  paidAmount: number;
}

export async function completeRun(id: string, userId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: { payslips: { select: { id: true, employeeId: true } } },
  });
  if (!run) throw new AppError(404, "Payroll run not found");
  if (run.status !== "PROCESSING") {
    throw new AppError(409, "Only PROCESSING runs can be completed. Process the run first.");
  }
  if (run.payslips.length === 0) {
    throw new AppError(400, "Run has no payslips to finalize");
  }

  const completed = await prisma.$transaction(async (tx) => {
    await tx.payslip.updateMany({
      where: { payrollRunId: id },
      data: { status: "FINALIZED" },
    });
    return tx.payrollRun.update({
      where: { id },
      data: { status: "COMPLETED", processedBy: userId, processedAt: new Date() },
      include: runInclude,
    });
  });

  // Update paidAmount for balance-tracked deductions and collect fully-paid ones.
  const employeeIds = run.payslips.map((p) => p.employeeId);
  const trackedDeductions = await prisma.employeeDeduction.findMany({
    where: { employeeId: { in: employeeIds }, totalBalance: { not: null } },
    include: {
      employee: { select: { firstName: true, lastName: true } },
      deduction: { select: { name: true, amount: true } },
    },
  });

  const fullyPaid: FullyPaidDeduction[] = [];
  for (const ed of trackedDeductions) {
    const amountPerPayroll = round2(toNum(ed.amount ?? ed.deduction.amount));
    const newPaidAmount = round2(toNum(ed.paidAmount) + amountPerPayroll);
    await prisma.employeeDeduction.update({
      where: { id: ed.id },
      data: { paidAmount: newPaidAmount },
    });
    if (newPaidAmount >= toNum(ed.totalBalance!)) {
      fullyPaid.push({
        employeeDeductionId: ed.id,
        employeeId: ed.employeeId,
        employeeName: `${ed.employee.firstName} ${ed.employee.lastName}`,
        deductionName: ed.deduction.name,
        totalBalance: toNum(ed.totalBalance!),
        paidAmount: newPaidAmount,
      });
    }
  }

  await logAudit({
    action: "UPDATE",
    tableName: "payroll_runs",
    recordId: id,
    oldValues: { status: run.status },
    newValues: { status: "COMPLETED", processedBy: userId, processedAt: completed.processedAt },
  });
  return { run: completed, fullyPaidDeductions: fullyPaid };
}

// --- Payslip CRUD ----------------------------------------------------------

export async function getPayslipById(id: string) {
  const row = await prisma.payslip.findUnique({
    where: { id },
    include: payslipInclude,
  });
  if (!row) throw new AppError(404, "Payslip not found");
  return row;
}

/**
 * Replace a payslip's itemized earnings + deductions with the input lists.
 * All values are AMOUNTS. Re-derives the flat summary columns (basicPay
 * unchanged unless overridden; gross/net recomputed from line items).
 *
 * Also folds per-type totals back into the denormalized columns
 * (sssContribution, cashAdvance, etc.) so existing reports keep working.
 */
export async function adjustPayslip(id: string, input: AdjustPayslipInput) {
  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: { payrollRun: { select: { status: true } } },
  });
  if (!payslip) throw new AppError(404, "Payslip not found");
  if (payslip.payrollRun.status === "COMPLETED") {
    throw new AppError(409, "Cannot edit a payslip in a completed run");
  }
  if (payslip.payrollRun.status === "CANCELLED") {
    throw new AppError(409, "Cannot edit a payslip in a cancelled run");
  }

  const basicPay =
    input.basicPay !== undefined ? round2(input.basicPay) : toNum(payslip.basicPay);

  const sumByType = <T extends string>(
    rows: Array<{ type: T; amount: number }>,
    type: T
  ): number => round2(rows.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0));

  const e = input.earnings;
  const d = input.deductions;

  const overtimePay = sumByType(e, "OVERTIME");
  const nightDifferential = sumByType(e, "NIGHT_DIFFERENTIAL");
  const bonuses = sumByType(e, "BONUS");
  const allowances = sumByType(e, "ALLOWANCE");
  const holidayPay = sumByType(e, "HOLIDAY_PAY");
  const paidLeaveCredits = sumByType(e, "PAID_LEAVE");
  const otherEarnings = sumByType(e, "OTHER");

  const lateDeductions = sumByType(d, "LATE");
  const unpaidLeaveDeductions = sumByType(d, "UNPAID_LEAVE");
  const cashAdvance = sumByType(d, "CASH_ADVANCE");
  const salaryLoan = sumByType(d, "SALARY_LOAN");
  const sssContribution = sumByType(d, "SSS");
  const philhealthContribution = sumByType(d, "PHILHEALTH");
  const pagibigContribution = sumByType(d, "PAGIBIG");
  const withholdingTax = sumByType(d, "BIR_TAX");
  const otherDeductions = sumByType(d, "OTHER");

  const grossPay = round2(
    basicPay + overtimePay + nightDifferential + bonuses + allowances + holidayPay + paidLeaveCredits + otherEarnings
  );
  const totalDeductions = round2(
    lateDeductions +
      unpaidLeaveDeductions +
      cashAdvance +
      salaryLoan +
      sssContribution +
      philhealthContribution +
      pagibigContribution +
      withholdingTax +
      otherDeductions
  );
  const netPay = round2(grossPay - totalDeductions);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payslipEarning.deleteMany({ where: { payslipId: id } });
    await tx.payslipDeduction.deleteMany({ where: { payslipId: id } });

    await tx.payslipEarning.createMany({
      data: e.map((row: PayslipEarningInput) => ({
        payslipId: id,
        type: row.type,
        label: row.label,
        amount: round2(row.amount),
      })),
    });
    await tx.payslipDeduction.createMany({
      data: d.map((row: PayslipDeductionInput) => ({
        payslipId: id,
        type: row.type,
        label: row.label,
        amount: round2(row.amount),
      })),
    });

    return tx.payslip.update({
      where: { id },
      data: {
        basicPay,
        overtimePay,
        bonuses,
        allowances,
        holidayPay,
        paidLeaveCredits,
        grossPay,
        sssContribution,
        philhealthContribution,
        pagibigContribution,
        withholdingTax,
        lateDeductions,
        unpaidLeaveDeductions,
        cashAdvance,
        salaryLoan,
        otherDeductions,
        totalDeductions,
        netPay,
      },
      include: payslipInclude,
    });
  });

  await logAudit({
    action: "UPDATE",
    tableName: "payslips",
    recordId: id,
    oldValues: payslip,
    newValues: updated,
  });
  return updated;
}

// --- Exports + self-access -------------------------------------------------

/**
 * Load a payslip plus everything the PDF renderer needs. Also returns
 * `employee.userId` so the caller can run the self-access check.
 */
export async function getPayslipForExport(id: string) {
  const row = await prisma.payslip.findUnique({
    where: { id },
    include: payslipExportInclude,
  });
  if (!row) throw new AppError(404, "Payslip not found");
  return row;
}

/**
 * Load a run with every payslip + relations, ready for bulk PDF / XLSX
 * export. Throws if the run has no payslips (nothing to export).
 */
export async function getRunForExport(id: string) {
  const row = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      branch: true,
      payslips: {
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              position: true,
              basicSalary: true,
              payType: true,
              hourlyRate: true,
              employmentStatus: true,
              sssNumber: true,
              philhealthNumber: true,
              pagibigNumber: true,
              tinNumber: true,
              userId: true,
              branch: { select: { id: true, name: true, city: true, address: true } },
            },
          },
          payrollRun: {
            select: {
              id: true,
              periodStart: true,
              periodEnd: true,
              status: true,
              branch: { select: { id: true, name: true, city: true, address: true } },
            },
          },
          earnings: { orderBy: { type: "asc" } },
          deductions: { orderBy: { type: "asc" } },
        },
        orderBy: [
          { employee: { lastName: "asc" } },
          { employee: { firstName: "asc" } },
        ],
      },
    },
  });
  if (!row) throw new AppError(404, "Payroll run not found");
  if (row.payslips.length === 0) {
    throw new AppError(400, "Run has no payslips to export");
  }
  return row;
}

/**
 * Check whether a user may access a payslip. ADMIN can always read; other
 * roles may read only payslips that belong to their own employee record.
 */
export function assertPayslipAccess(
  payslipEmployeeUserId: string,
  requestingUserId: string,
  requestingRole: "ADMIN" | "MANAGER" | "EMPLOYEE"
): void {
  if (requestingRole === "ADMIN") return;
  if (payslipEmployeeUserId === requestingUserId) return;
  throw new AppError(403, "Insufficient permissions");
}

/**
 * List payslips belonging to the employee profile of the given userId.
 * Only FINALIZED payslips are returned — employees shouldn't see drafts.
 */
export async function listMyPayslips(userId: string) {
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!employee) {
    throw new AppError(
      404,
      "No employee profile attached to this account"
    );
  }
  return prisma.payslip.findMany({
    where: { employeeId: employee.id, status: "FINALIZED" },
    include: {
      payrollRun: {
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
          status: true,
          branch: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ payrollRun: { periodStart: "desc" } }],
  });
}
