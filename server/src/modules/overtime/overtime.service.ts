import { Prisma } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  CreateOvertimeInput,
  ReviewOvertimeInput,
  ListOvertimeQuery,
  ApproveShiftOvertimeInput,
  CreateScheduleInput,
  UpdateScheduleInput,
  ListSchedulesQuery,
} from "./overtime.schema.js";

function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

const overtimeInclude = {
  employee: {
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      position: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
    },
  },
} as const;

export async function listRequests(
  query: ListOvertimeQuery,
  scopedEmployeeId?: string,
  scopedBranchId?: string
) {
  const where: Prisma.OvertimeRequestWhereInput = {};
  if (scopedEmployeeId) {
    where.employeeId = scopedEmployeeId;
  } else if (query.employeeId) {
    where.employeeId = query.employeeId;
  }
  if (scopedBranchId) {
    where.employee = { branchId: scopedBranchId };
  }
  if (query.status) where.status = query.status;
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = dateOnly(query.startDate);
    if (query.endDate) where.date.lte = dateOnly(query.endDate);
  }

  return prisma.overtimeRequest.findMany({
    where,
    include: overtimeInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
}

export async function createRequest(employeeId: string, input: CreateOvertimeInput) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError(404, "Employee not found");

  return prisma.overtimeRequest.create({
    data: {
      employeeId,
      shiftId: input.shiftId,
      date: dateOnly(input.date),
      reason: input.reason,
    },
    include: overtimeInclude,
  });
}

export async function reviewRequest(
  id: string,
  reviewerId: string,
  input: ReviewOvertimeInput
) {
  const req = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!req) throw new AppError(404, "Overtime request not found");
  if (req.status !== "PENDING") throw new AppError(409, "Request already reviewed");

  return prisma.overtimeRequest.update({
    where: { id },
    data: {
      status: input.status,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes,
    },
    include: overtimeInclude,
  });
}

export async function revertRequest(id: string) {
  const req = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!req) throw new AppError(404, "Overtime request not found");
  if (req.status !== "APPROVED" && req.status !== "REJECTED") {
    throw new AppError(409, "Only approved or rejected requests can be reverted");
  }

  // Block revert if the overtime date falls within a completed payroll run
  const completedRun = await prisma.payrollRun.findFirst({
    where: {
      status: "COMPLETED",
      periodStart: { lte: new Date(req.date) },
      periodEnd: { gte: new Date(req.date) },
      payslips: { some: { employeeId: req.employeeId } },
    },
    select: { id: true, periodStart: true, periodEnd: true },
  });

  if (completedRun) {
    const start = completedRun.periodStart.toISOString().slice(0, 10);
    const end = completedRun.periodEnd.toISOString().slice(0, 10);
    throw new AppError(
      409,
      `Cannot revert: a completed payroll run (${start} – ${end}) already covers this overtime date.`
    );
  }

  return prisma.overtimeRequest.update({
    where: { id },
    data: { status: "PENDING", reviewedBy: null, reviewedAt: null, reviewNotes: null },
    include: overtimeInclude,
  });
}

// ─── Overtime Schedules (admin/manager pre-assigned) ─────────────────────────

const scheduleInclude = {
  employee: {
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      position: true,
      branch: { select: { id: true, name: true } },
    },
  },
} as const;

export async function listSchedules(query: ListSchedulesQuery, scopedBranchId?: string) {
  const where: Prisma.OvertimeScheduleWhereInput = {};
  if (query.employeeId) where.employeeId = query.employeeId;
  if (scopedBranchId) where.employee = { branchId: scopedBranchId };
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = dateOnly(query.startDate);
    if (query.endDate) where.date.lte = dateOnly(query.endDate);
  }
  return prisma.overtimeSchedule.findMany({
    where,
    include: scheduleInclude,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 500,
  });
}

export async function createSchedule(createdById: string, input: CreateScheduleInput) {
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw new AppError(404, "Employee not found");

  return prisma.overtimeSchedule.create({
    data: {
      employeeId: input.employeeId,
      date: dateOnly(input.date),
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes,
      createdById,
    },
    include: scheduleInclude,
  });
}

export async function updateSchedule(id: string, input: UpdateScheduleInput) {
  const existing = await prisma.overtimeSchedule.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Overtime schedule not found");

  return prisma.overtimeSchedule.update({
    where: { id },
    data: {
      ...(input.date ? { date: dateOnly(input.date) } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: scheduleInclude,
  });
}

export async function deleteSchedule(id: string) {
  const existing = await prisma.overtimeSchedule.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Overtime schedule not found");
  await prisma.overtimeSchedule.delete({ where: { id } });
}

/** Manager/admin toggles overtime pre-approval directly on a ShiftAssignment. */
export async function setShiftOvertimeApproval(
  shiftId: string,
  employeeId: string,
  approverId: string,
  input: ApproveShiftOvertimeInput
) {
  const assignment = await prisma.shiftAssignment.findUnique({
    where: { shiftId_employeeId: { shiftId, employeeId } },
  });
  if (!assignment) throw new AppError(404, "Shift assignment not found");

  return prisma.shiftAssignment.update({
    where: { shiftId_employeeId: { shiftId, employeeId } },
    data: {
      overtimeApproved: input.overtimeApproved,
      overtimeApprovedBy: input.overtimeApproved ? approverId : null,
    },
  });
}
