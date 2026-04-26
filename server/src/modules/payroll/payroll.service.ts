import { Prisma, type PrismaClient } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { logAudit } from "../../lib/audit.js";
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
  | "LATE" | "CASH_ADVANCE" | "SALARY_LOAN" | "OTHER";

function toDeductionType(type: string | null | undefined): DeductionTypeKey {
  const valid: DeductionTypeKey[] = [
    "SSS", "PHILHEALTH", "PAGIBIG", "BIR_TAX",
    "LATE", "CASH_ADVANCE", "SALARY_LOAN", "OTHER",
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
    select: { name: true, amount: true },
  });

  // OT rate setting.
  const settingRows = await prisma.systemSetting.findMany({
    where: { key: { in: ["payroll.regular_ot_rate"] } },
    select: { key: true, value: true },
  });

  function getSetting(key: string, fallback: number): number {
    const row = settingRows.find((r) => r.key === key);
    if (!row) return fallback;
    const v = JSON.parse(row.value);
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  }

  const otRatePerHour = getSetting("payroll.regular_ot_rate", 0);

  // Attendance for the period.
  const attendanceRows = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: { gte: run.periodStart, lte: run.periodEnd },
    },
    select: { employeeId: true, hoursWorked: true, overtimeHours: true },
  });

  const otHoursMap = new Map<string, number>();
  const hoursWorkedMap = new Map<string, number>();
  for (const rec of attendanceRows) {
    otHoursMap.set(rec.employeeId, (otHoursMap.get(rec.employeeId) ?? 0) + toNum(rec.overtimeHours));
    hoursWorkedMap.set(rec.employeeId, (hoursWorkedMap.get(rec.employeeId) ?? 0) + toNum(rec.hoursWorked));
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
      const totalOtHours = round2(otHoursMap.get(emp.id) ?? 0);
      const totalHoursWorked = round2(hoursWorkedMap.get(emp.id) ?? 0);

      let basicPay: number;
      let overtimePay: number;

      if (emp.payType === "HOURLY") {
        const rate = toNum(emp.hourlyRate);
        const regularHours = round2(Math.max(0, totalHoursWorked - totalOtHours));
        basicPay = round2(rate * regularHours);
        overtimePay = totalOtHours > 0 ? round2(rate * 1.25 * totalOtHours) : 0;
      } else {
        basicPay = round2(toNum(emp.basicSalary) / 2);
        overtimePay = totalOtHours > 0 ? round2(totalOtHours * otRatePerHour) : 0;
      }

      const overtimeEarnings: Array<{ type: "OVERTIME"; label: string; amount: number }> =
        overtimePay > 0
          ? [{ type: "OVERTIME" as const, label: `Overtime (${totalOtHours} hrs)`, amount: overtimePay }]
          : [];

      const holidayEarnings: Array<{ type: "HOLIDAY_PAY"; label: string; amount: number }> =
        periodHolidays
          .map((h) => ({ type: "HOLIDAY_PAY" as const, label: h.name, amount: round2(toNum(h.amount)) }))
          .filter((r) => r.amount > 0);

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

      // Build deductions from this employee's assigned deductions profile.
      const empDeductions = empDeductionMap.get(emp.id) ?? [];
      const deductionRows = empDeductions.map((ed) => ({
        type: toDeductionType(ed.deduction.type),
        label: ed.deduction.name,
        amount: round2(toNum(ed.amount ?? ed.deduction.amount)),
      }));

      // Fold into denormalized columns.
      const sssContribution        = sumByDeductionType(deductionRows, "SSS");
      const philhealthContribution = sumByDeductionType(deductionRows, "PHILHEALTH");
      const pagibigContribution    = sumByDeductionType(deductionRows, "PAGIBIG");
      const withholdingTax         = sumByDeductionType(deductionRows, "BIR_TAX");
      const lateDeductions         = sumByDeductionType(deductionRows, "LATE");
      const cashAdvance            = sumByDeductionType(deductionRows, "CASH_ADVANCE");
      const salaryLoan             = sumByDeductionType(deductionRows, "SALARY_LOAN");
      const otherDeductions        = sumByDeductionType(deductionRows, "OTHER");
      const totalDeductions        = round2(deductionRows.reduce((s, r) => s + r.amount, 0));

      const grossPay = round2(basicPay + overtimePay + holidayPayTotal + bonuses + allowances + otherEarningsTotal);
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
          grossPay,
          sssContribution,
          philhealthContribution,
          pagibigContribution,
          withholdingTax,
          lateDeductions,
          cashAdvance,
          salaryLoan,
          otherDeductions,
          totalDeductions,
          netPay,
          status: "DRAFT",
          earnings: { create: [...overtimeEarnings, ...holidayEarnings, ...profileEarningRows] },
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
  const bonuses = sumByType(e, "BONUS");
  const allowances = sumByType(e, "ALLOWANCE");
  const holidayPay = sumByType(e, "HOLIDAY_PAY");
  const otherEarnings = sumByType(e, "OTHER");

  const lateDeductions = sumByType(d, "LATE");
  const cashAdvance = sumByType(d, "CASH_ADVANCE");
  const salaryLoan = sumByType(d, "SALARY_LOAN");
  const sssContribution = sumByType(d, "SSS");
  const philhealthContribution = sumByType(d, "PHILHEALTH");
  const pagibigContribution = sumByType(d, "PAGIBIG");
  const withholdingTax = sumByType(d, "BIR_TAX");
  const otherDeductions = sumByType(d, "OTHER");

  const grossPay = round2(
    basicPay + overtimePay + bonuses + allowances + holidayPay + otherEarnings
  );
  const totalDeductions = round2(
    lateDeductions +
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
        grossPay,
        sssContribution,
        philhealthContribution,
        pagibigContribution,
        withholdingTax,
        lateDeductions,
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
