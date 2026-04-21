import { Prisma } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  CreateOvertimeInput,
  ReviewOvertimeInput,
  ListOvertimeQuery,
  ApproveShiftOvertimeInput,
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
    },
  },
} as const;

export async function listRequests(query: ListOvertimeQuery, scopedEmployeeId?: string) {
  const where: Prisma.OvertimeRequestWhereInput = {};
  if (scopedEmployeeId) {
    where.employeeId = scopedEmployeeId;
  } else if (query.employeeId) {
    where.employeeId = query.employeeId;
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
