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

// --- Constants (fallback defaults when DB settings not yet seeded) ----------
const DEFAULT_WORKING_DAYS = 22;
const DEFAULT_WORKING_HOURS = 8;
const DEFAULT_OT_MULTIPLIER = 1.25;

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

interface Rates {
  hourly: number;
  minute: number;
}

function computeRates(basicSalary: number, workingDays: number, workingHours: number): Rates {
  const hourly = basicSalary / workingDays / workingHours;
  return { hourly, minute: hourly / 60 };
}

async function getPayrollSettings(): Promise<{
  workingDaysPerMonth: number;
  workingHoursPerDay: number;
  otMultiplier: number;
}> {
  const keys = [
    "payroll.working_days_per_month",
    "payroll.working_hours_per_day",
    "payroll.overtime_multiplier",
  ];
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, JSON.parse(r.value) as number]));
  return {
    workingDaysPerMonth: map.get("payroll.working_days_per_month") ?? DEFAULT_WORKING_DAYS,
    workingHoursPerDay: map.get("payroll.working_hours_per_day") ?? DEFAULT_WORKING_HOURS,
    otMultiplier: map.get("payroll.overtime_multiplier") ?? DEFAULT_OT_MULTIPLIER,
  };
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
      department: true,
      basicSalary: true,
      sssNumber: true,
      philhealthNumber: true,
      pagibigNumber: true,
      tinNumber: true,
      userId: true,
      branch: { select: { id: true, name: true, city: true } },
    },
  },
  payrollRun: {
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      branch: { select: { id: true, name: true, city: true } },
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
      department: true,
      basicSalary: true,
      sssNumber: true,
      philhealthNumber: true,
      pagibigNumber: true,
      tinNumber: true,
      branch: { select: { id: true, name: true, city: true } },
    },
  },
  payrollRun: {
    select: {
      id: true,
      periodStart: true,
      periodEnd: true,
      status: true,
      branch: { select: { id: true, name: true, city: true } },
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

// --- Government bracket lookup --------------------------------------------

/**
 * Returns the employee-share AMOUNT from GovernmentTable for the given type +
 * salary. Picks the most recent effective bracket on or before the run's
 * period start. Returns 0 when no matching bracket is configured — admin can
 * enter the amount manually on the payslip.
 */
async function lookupContribution(
  tx: Tx,
  type: "SSS" | "PHILHEALTH" | "PAGIBIG" | "BIR",
  basicSalary: number,
  onOrBefore: Date
): Promise<number> {
  const row = await tx.governmentTable.findFirst({
    where: {
      type,
      effectiveDate: { lte: onOrBefore },
      rangeFrom: { lte: basicSalary },
      rangeTo: { gte: basicSalary },
    },
    orderBy: { effectiveDate: "desc" },
  });
  return row ? toNum(row.employeeShare) : 0;
}

// --- Processing -----------------------------------------------------------

/**
 * Process a DRAFT run: generate a payslip for every active employee in the
 * branch with basicSalary > 0. Auto-computes basic pay (bi-monthly = monthly
 * / 2), overtime pay, and late deduction from attendance in the window. All
 * government contributions are looked up as AMOUNTS from GovernmentTable —
 * never percentages. Other items (bonuses, cash advance, etc.) start at 0
 * and are added manually via the payslip editor.
 *
 * Re-processing clears existing payslips in the run first so admins can
 * re-run after fixing attendance.
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

  const { workingDaysPerMonth, workingHoursPerDay, otMultiplier } =
    await getPayrollSettings();

  const employees = await prisma.employee.findMany({
    where: {
      branchId: run.branchId,
      employmentStatus: "ACTIVE",
      basicSalary: { gt: 0 },
    },
    select: { id: true, basicSalary: true },
  });

  if (employees.length === 0) {
    throw new AppError(
      400,
      "Branch has no active employees with a basic salary set"
    );
  }

  const processed = await prisma.$transaction(async (tx) => {
    // Clear any existing payslips so we can re-run the compute.
    await tx.payslip.deleteMany({ where: { payrollRunId: run.id } });

    for (const emp of employees) {
      const basicSalary = toNum(emp.basicSalary);
      const rates = computeRates(basicSalary, workingDaysPerMonth, workingHoursPerDay);

      // Sum attendance facts in [periodStart, periodEnd].
      const atts = await tx.attendance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: run.periodStart, lte: run.periodEnd },
        },
        select: { lateMinutes: true, overtimeHours: true },
      });

      const totalLateMinutes = atts.reduce(
        (sum, a) => sum + (a.lateMinutes ?? 0),
        0
      );
      const totalOvertimeHours = atts.reduce(
        (sum, a) => sum + toNum(a.overtimeHours),
        0
      );

      const basicPay = round2(basicSalary / 2); // bi-monthly half
      const overtimePay = round2(totalOvertimeHours * rates.hourly * otMultiplier);
      const lateDeductions = round2(totalLateMinutes * rates.minute);

      // Government contribution amounts (0 when no bracket configured).
      const [sssAmt, phicAmt, hdmfAmt, birAmt] = await Promise.all([
        lookupContribution(tx, "SSS", basicSalary, run.periodStart),
        lookupContribution(tx, "PHILHEALTH", basicSalary, run.periodStart),
        lookupContribution(tx, "PAGIBIG", basicSalary, run.periodStart),
        lookupContribution(tx, "BIR", basicSalary, run.periodStart),
      ]);

      const grossPay = round2(basicPay + overtimePay);
      const totalDeductions = round2(
        lateDeductions + sssAmt + phicAmt + hdmfAmt + birAmt
      );
      const netPay = round2(grossPay - totalDeductions);

      const earningRows: Array<{
        type: "OVERTIME" | "BONUS" | "ALLOWANCE" | "HOLIDAY_PAY" | "OTHER";
        label: string;
        amount: number;
      }> = [];
      if (overtimePay > 0) {
        earningRows.push({
          type: "OVERTIME",
          label: `Overtime (${totalOvertimeHours.toFixed(2)} hrs)`,
          amount: overtimePay,
        });
      }

      const deductionRows: Array<{
        type:
          | "LATE"
          | "CASH_ADVANCE"
          | "SALARY_LOAN"
          | "SSS"
          | "PHILHEALTH"
          | "PAGIBIG"
          | "BIR_TAX"
          | "OTHER";
        label: string;
        amount: number;
      }> = [];
      if (lateDeductions > 0) {
        deductionRows.push({
          type: "LATE",
          label: `Late (${totalLateMinutes} min)`,
          amount: lateDeductions,
        });
      }
      if (sssAmt > 0) {
        deductionRows.push({ type: "SSS", label: "SSS", amount: sssAmt });
      }
      if (phicAmt > 0) {
        deductionRows.push({
          type: "PHILHEALTH",
          label: "PhilHealth",
          amount: phicAmt,
        });
      }
      if (hdmfAmt > 0) {
        deductionRows.push({
          type: "PAGIBIG",
          label: "Pag-IBIG",
          amount: hdmfAmt,
        });
      }
      if (birAmt > 0) {
        deductionRows.push({
          type: "BIR_TAX",
          label: "Withholding Tax",
          amount: birAmt,
        });
      }

      await tx.payslip.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.id,
          basicPay,
          overtimePay,
          bonuses: 0,
          allowances: 0,
          holidayPay: 0,
          grossPay,
          sssContribution: sssAmt,
          philhealthContribution: phicAmt,
          pagibigContribution: hdmfAmt,
          withholdingTax: birAmt,
          lateDeductions,
          cashAdvance: 0,
          salaryLoan: 0,
          otherDeductions: 0,
          totalDeductions,
          netPay,
          status: "DRAFT",
          earnings: { create: earningRows },
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
    newValues: {
      status: "PROCESSING",
      generatedPayslips: processed.payslips.length,
    },
  });
  return processed;
}

export async function completeRun(id: string, userId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: { payslips: { select: { id: true } } },
  });
  if (!run) throw new AppError(404, "Payroll run not found");
  if (run.status !== "PROCESSING") {
    throw new AppError(
      409,
      "Only PROCESSING runs can be completed. Process the run first."
    );
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
      data: {
        status: "COMPLETED",
        processedBy: userId,
        processedAt: new Date(),
      },
      include: runInclude,
    });
  });

  await logAudit({
    action: "UPDATE",
    tableName: "payroll_runs",
    recordId: id,
    oldValues: { status: run.status },
    newValues: {
      status: "COMPLETED",
      processedBy: userId,
      processedAt: completed.processedAt,
    },
  });
  return completed;
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
              department: true,
              basicSalary: true,
              sssNumber: true,
              philhealthNumber: true,
              pagibigNumber: true,
              tinNumber: true,
              userId: true,
              branch: { select: { id: true, name: true, city: true } },
            },
          },
          payrollRun: {
            select: {
              id: true,
              periodStart: true,
              periodEnd: true,
              status: true,
              branch: { select: { id: true, name: true, city: true } },
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
