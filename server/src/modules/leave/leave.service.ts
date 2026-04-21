import { Prisma } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { logAudit } from "../../lib/audit.js";
import type {
  CreateLeaveRequestInput,
  ListLeaveBalancesQuery,
  ListLeaveQuery,
  ReviewLeaveInput,
  UpsertLeaveBalanceInput,
} from "./leave.schema.js";

const requestInclude = {
  employee: {
    select: {
      id: true,
      employeeId: true,
      firstName: true,
      lastName: true,
      position: true,
      branchId: true,
    },
  },
} as const;

function dateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export async function listRequests(query: ListLeaveQuery) {
  const where: Prisma.LeaveRequestWhereInput = {};
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.status) where.status = query.status;
  if (query.leaveType) where.leaveType = query.leaveType;
  if (query.startDate || query.endDate) {
    where.startDate = {};
    if (query.startDate) where.startDate.gte = dateOnly(query.startDate);
    if (query.endDate) where.startDate.lte = dateOnly(query.endDate);
  }

  return prisma.leaveRequest.findMany({
    where,
    include: requestInclude,
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
}

export async function getRequestById(id: string) {
  const row = await prisma.leaveRequest.findUnique({
    where: { id },
    include: requestInclude,
  });
  if (!row) throw new AppError(404, "Leave request not found");
  return row;
}

export async function createRequest(input: CreateLeaveRequestInput) {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, employmentStatus: true },
  });
  if (!employee) throw new AppError(404, "Employee not found");
  if (employee.employmentStatus === "TERMINATED") {
    throw new AppError(400, "Terminated employees cannot file leave requests");
  }

  const created = await prisma.leaveRequest.create({
    data: {
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      startDate: dateOnly(input.startDate),
      endDate: dateOnly(input.endDate),
      totalDays: input.totalDays,
      reason: input.reason,
    },
    include: requestInclude,
  });
  await logAudit({
    action: "CREATE",
    tableName: "leave_requests",
    recordId: created.id,
    newValues: created,
  });
  return created;
}

/**
 * Approving a leave request deducts from the matching balance (if one exists)
 * for the request's start-date year. UNPAID leave has no balance effect.
 * Runs in a transaction so balance + request stay consistent.
 */
export async function reviewRequest(
  id: string,
  reviewerUserId: string,
  input: ReviewLeaveInput
) {
  const request = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!request) throw new AppError(404, "Leave request not found");
  if (request.status !== "PENDING") {
    throw new AppError(409, `Request is already ${request.status.toLowerCase()}`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.status === "APPROVED" && request.leaveType !== "UNPAID") {
      const year = new Date(request.startDate).getUTCFullYear();
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveType_year: {
            employeeId: request.employeeId,
            leaveType: request.leaveType,
            year,
          },
        },
      });

      if (balance) {
        const remaining = Number(balance.remainingDays);
        const requested = Number(request.totalDays);
        if (requested > remaining) {
          throw new AppError(
            400,
            `Insufficient balance: ${remaining} day(s) remaining, request is for ${requested} day(s)`
          );
        }
        const newUsed = Number(balance.usedDays) + requested;
        const newRemaining = Number(balance.totalDays) - newUsed;
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { usedDays: newUsed, remainingDays: newRemaining },
        });
      }
      // If no balance row exists, approve without tracking — admin can reconcile
      // later. This keeps the flow unblocked for employees hired mid-year.
    }

    return tx.leaveRequest.update({
      where: { id },
      data: {
        status: input.status,
        reviewedBy: reviewerUserId,
        reviewedAt: new Date(),
        reviewNotes: input.reviewNotes,
      },
      include: requestInclude,
    });
  });

  await logAudit({
    action: "UPDATE",
    tableName: "leave_requests",
    recordId: id,
    oldValues: request,
    newValues: updated,
  });
  return updated;
}

export async function cancelRequest(id: string) {
  const request = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!request) throw new AppError(404, "Leave request not found");
  if (request.status === "CANCELLED") return getRequestById(id);
  if (request.status === "APPROVED") {
    throw new AppError(
      409,
      "Approved requests cannot be cancelled. Contact an admin for reversal."
    );
  }
  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: requestInclude,
  });
  await logAudit({
    action: "UPDATE",
    tableName: "leave_requests",
    recordId: id,
    oldValues: request,
    newValues: updated,
  });
  return updated;
}

// --- Balances ---------------------------------------------------------------

export async function listBalances(query: ListLeaveBalancesQuery) {
  const where: Prisma.LeaveBalanceWhereInput = {};
  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.year) where.year = query.year;
  return prisma.leaveBalance.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ year: "desc" }, { leaveType: "asc" }],
  });
}

export async function upsertBalance(input: UpsertLeaveBalanceInput) {
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true },
  });
  if (!employee) throw new AppError(404, "Employee not found");

  const existing = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveType_year: {
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        year: input.year,
      },
    },
  });

  if (existing) {
    const used = Number(existing.usedDays);
    if (input.totalDays < used) {
      throw new AppError(
        400,
        `Total days cannot be less than already-used days (${used})`
      );
    }
    const updated = await prisma.leaveBalance.update({
      where: { id: existing.id },
      data: {
        totalDays: input.totalDays,
        remainingDays: input.totalDays - used,
      },
    });
    await logAudit({
      action: "UPDATE",
      tableName: "leave_balances",
      recordId: existing.id,
      oldValues: existing,
      newValues: updated,
    });
    return updated;
  }

  const created = await prisma.leaveBalance.create({
    data: {
      employeeId: input.employeeId,
      leaveType: input.leaveType,
      year: input.year,
      totalDays: input.totalDays,
      usedDays: 0,
      remainingDays: input.totalDays,
    },
  });
  await logAudit({
    action: "CREATE",
    tableName: "leave_balances",
    recordId: created.id,
    newValues: created,
  });
  return created;
}
