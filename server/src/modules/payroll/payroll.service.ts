import { Prisma, type PrismaClient } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { logAudit } from "../../lib/audit.js";
import { getScheduledTimes } from "../attendance/attendance.service.js";
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
          "payroll.regular_ot_rate",
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

  const otRatePerHour          = getSetting("payroll.regular_ot_rate", 0);
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
    select: { employeeId: true, date: true },
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
    if (!hasShift && rec.source !== "MANUAL" && !periodHolidayDateKeys.has(dateKey)) continue;

    const scheduledHrs = scheduledHoursMap.get(rec.employeeId)?.get(dateKey) ?? 0;
    // If hoursWorked is null (clock-out not yet recorded) but a shift is scheduled,
    // fall back to the shift duration so open records still count toward payroll.
    const actualHrs = rec.hoursWorked !== null
      ? toNum(rec.hoursWorked)
      : scheduledHrs; // 0 when no shift — can't estimate without a clock-out
    // Only count overtime hours if explicitly approved (shift-level or OvertimeRequest).
    const isOtApproved = overtimeApprovedDatesMap.get(rec.employeeId)?.has(dateKey) ?? false;
    const otHrs = isOtApproved ? toNum(rec.overtimeHours) : 0;
    // Regular hours = actual minus approved OT, capped at scheduled shift duration.
    // For manually-added attendance with no shift assignment, use actual hours directly (no cap).
    const regularHrs = scheduledHrs > 0
      ? Math.min(Math.max(0, actualHrs - otHrs), scheduledHrs)
      : Math.max(0, actualHrs - otHrs);
    const countedHrs = round2(regularHrs + otHrs);

    // Compute late minutes live from clock-in vs scheduled shift start so stale or
    // missing lateMinutes on the attendance record never bleed into the deduction.
    const shiftStartForDate = scheduledShiftStartMap.get(rec.employeeId)?.get(dateKey);
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
    const shiftEnd = scheduledShiftEndMap.get(rec.employeeId)?.get(dateKey);
    const ndClockIn  = shiftStartForDate && rec.clockIn < shiftStartForDate ? shiftStartForDate : rec.clockIn;
    const ndClockOut = (!isOtApproved && rec.clockOut && shiftEnd && rec.clockOut > shiftEnd)
      ? shiftEnd
      : rec.clockOut;
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
      //   a 3rd shift ending 7AM). Same-day: countedHrs (break-adjusted, consistent with pay calc).
      const hoursOnDate = isCrossing
        ? Math.max(0, round2(localHoursSinceMidnight(rec.clockOut, tz)))
        : countedHrs;

      if (!holidayAttMap.has(rec.employeeId)) holidayAttMap.set(rec.employeeId, new Map());
      const empHMap = holidayAttMap.get(rec.employeeId)!;
      const existingH = empHMap.get(localOutDateKey);
      // Prefer same-day records over crossing records when both land on the same local date.
      if (!existingH || (existingH.isCrossing && !isCrossing)) {
        empHMap.set(localOutDateKey, { hoursOnDate, lateMinutes: computedLateMinutes, isCrossing });
      }

      // For crossing shifts, also store an entry under the clock-IN date so that any
      // hours worked on that date are credited to its holiday (if one exists).
      // Examples: 2nd shift 3PM May 1 → May 2 (~9 hrs on May 1), PM 12-Hour 7PM May 1
      // → May 2 (5 hrs on May 1). hoursOnDate here = clock-in to local midnight.
      // Night shifts starting at or after 22:00 local (e.g. 3rd shift 11PM) are excluded —
      // their holiday coverage comes from the prior day's crossing shift instead.
      if (isCrossing) {
        // hours from clockIn to next local midnight = 24 - hoursSinceMidnight(clockIn)
        const hoursOnInDate = Math.max(0, round2(24 - localHoursSinceMidnight(rec.clockIn, tz)));
        if (hoursOnInDate > 0) {
          // Use the scheduled shift start to determine if this is a late-night shift.
          // Fall back to the actual clock-in time when no shift assignment exists.
          const shiftStart = scheduledShiftStartMap.get(rec.employeeId)?.get(dateKey) ?? rec.clockIn;
          const isNightShift = localTimeInMinutes(shiftStart, tz) >= 22 * 60; // starts at or after 22:00 local
          if (!isNightShift) {
            const localInDateKey = localDateKey(rec.clockIn, tz);
            const existingIn = empHMap.get(localInDateKey);
            if (!existingIn) {
              empHMap.set(localInDateKey, { hoursOnDate: hoursOnInDate, lateMinutes: computedLateMinutes, isCrossing: true });
            }
          }
        }
      }
    }
  }

  // Boundary late-minutes lookup: when the period starts on a holiday, employees who worked
  // the overnight shift the day before (ending in the early hours of period start) may have
  // unrecorded late minutes because the clock-in date mismatch causes the late calc to
  // report 0. Fetch that one extra day to carry their late minutes into this period's deduction.
  const dayBeforePeriod = new Date(run.periodStart);
  dayBeforePeriod.setUTCDate(dayBeforePeriod.getUTCDate() - 1);
  const dayBeforePeriodKey = dayBeforePeriod.toISOString().slice(0, 10);

  const hasHolidayOnPeriodStart = periodHolidays.some(
    (h) => h.date.toISOString().slice(0, 10) === run.periodStart.toISOString().slice(0, 10),
  );

  if (hasHolidayOnPeriodStart) {
    const boundaryAttendance = await prisma.attendance.findMany({
      where: { employeeId: { in: employeeIds }, date: dayBeforePeriod },
      select: { employeeId: true, clockIn: true, clockOut: true, hoursWorked: true, lateMinutes: true },
    });

    for (const rec of boundaryAttendance) {
      if (!attendanceDateMap.has(rec.employeeId)) attendanceDateMap.set(rec.employeeId, new Map());
      if (!attendanceDateMap.get(rec.employeeId)!.has(dayBeforePeriodKey)) {
        const isOvernight = !!(rec.clockOut &&
          isCrossingLocal(rec.clockIn, rec.clockOut, tz));
        const hoursWorked = toNum(rec.hoursWorked);
        // Stored lateMinutes may be 0 due to overnight date-mismatch in the late
        // calculation (clock-in at 2AM on date D looks early when scheduledStart is
        // 11PM on date D). Derive effective late from the unworked portion of the
        // standard 8-hour shift so the deduction reflects reality.
        const storedLate = rec.lateMinutes ?? 0;
        const effectiveLate = storedLate > 0 ? storedLate : Math.round(Math.max(0, 8 - hoursWorked) * 60);
        attendanceDateMap.get(rec.employeeId)!.set(dayBeforePeriodKey, {
          hoursWorked,
          lateMinutes: effectiveLate,
          isOvernight,
        });
        // Credit holiday pay for any boundary record whose actual work time falls on the
        // period-start date — covers both true crossing shifts (clockIn Apr 30, clockOut
        // May 1) and rollback-artifact records where the date field was pushed back one
        // day by the old split-time logic but both timestamps are on May 1 local time.
        if (rec.clockOut) {
          if (localDateKey(rec.clockOut, tz) === localDateKey(run.periodStart, tz)) {
            const localOutDateKey = localDateKey(rec.clockOut, tz);
            const crossing = isCrossingLocal(rec.clockIn, rec.clockOut, tz);
            // Crossing shift: credit from midnight to clockOut.
            // Same-day shift on the holiday (date field rolled back): credit full worked hours,
            // capped at 8 (standard daily rate basis) from midnight on the holiday.
            const midnightUtc = localMidnightUtc(localOutDateKey, tz);
            const creditFromMs = crossing ? midnightUtc.getTime() : rec.clockIn.getTime();
            const capMs = midnightUtc.getTime() + 8 * 3_600_000;
            const outMs = Math.min(rec.clockOut.getTime(), capMs);
            const hoursOnDate = Math.max(0, round2((outMs - creditFromMs) / 3_600_000));
            if (!holidayAttMap.has(rec.employeeId)) holidayAttMap.set(rec.employeeId, new Map());
            const empHMap = holidayAttMap.get(rec.employeeId)!;
            // Boundary attendance (e.g. Apr 30 graveyard ending on May 1 holiday)
            // always takes priority over any crossing split from a shift that starts
            // on the holiday but ends the next day (e.g. May 1 12hr → May 2).  The
            // rule is: a shift qualifies for holiday pay on its clock-OUT date.
            empHMap.set(localOutDateKey, { hoursOnDate, lateMinutes: 0, isCrossing: true });
            // Do NOT update hoursWorkedMap here: the April payroll already paid basic pay
            // for the full crossing shift. Only the holiday premium belongs in May.
          }
        }
      }
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

      if (emp.payType === "HOURLY") {
        const rate = toNum(emp.hourlyRate);
        const regularHours = round2(Math.max(0, totalHoursWorked - totalOtHours));
        basicPay = round2(rate * regularHours);
        overtimePay = totalOtHours > 0 && otRatePerHour > 0
          ? round2(totalOtHours * otRatePerHour)
          : 0;
      } else {
        basicPay = round2(toNum(emp.basicSalary) / 2);
        overtimePay = totalOtHours > 0 && otRatePerHour > 0
          ? round2(totalOtHours * otRatePerHour)
          : 0;
      }

      const overtimeEarnings: Array<{ type: "OVERTIME"; label: string; amount: number }> =
        overtimePay > 0
          ? [{ type: "OVERTIME" as const, label: `Overtime (${totalOtHours} hrs × ₱${otRatePerHour}/hr)`, amount: overtimePay }]
          : [];

      const totalNightDiffHours = round2(nightDiffHoursMap.get(emp.id) ?? 0);
      // Night diff base = employee's effective hourly rate (hourly employees use their rate;
      // monthly employees use basicSalary ÷ 26 days ÷ 8 hrs).
      const baseHourlyRate = emp.payType === "HOURLY"
        ? toNum(emp.hourlyRate)
        : toNum(emp.basicSalary) / 26 / 8;
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

            // No qualifying attendance on this holiday date = day off, no holiday pay.
            if (!entry) return null;

            // Eligible hours are capped at 8 (standard daily rate basis, covers both 8hr and 12hr
            // shifts). For crossing shifts (Apr 30 3rd → May 1), lateMinutes applied to the prior
            // day and don't reduce the holiday portion — just cap at actual hours on the holiday.
            // For same-day shifts, late reduces eligibility as before.
            const eligibleHours = entry.isCrossing
              ? Math.min(entry.hoursOnDate, 8)
              : Math.max(0, Math.min(entry.hoursOnDate, 8 - entry.lateMinutes / 60));
            const prorationFactor = round2(eligibleHours / 8);

            const pct = toNum(h.percentage);
            const amount = pct > 0
              ? round2(dailyRateForHoliday * prorationFactor * pct / 100)
              : round2(toNum(h.amount) * prorationFactor);

            if (amount <= 0) return null;

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
