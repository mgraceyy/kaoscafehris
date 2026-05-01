import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type { EarningType } from "@prisma/client";

const ALLOWED_TYPES: EarningType[] = ["BONUS", "ALLOWANCE", "OTHER"];

export async function listEmployeeEarnings(employeeId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError(404, "Employee not found");

  return prisma.employeeEarning.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addEmployeeEarning(
  employeeId: string,
  input: { type: EarningType; label: string; amount: number }
) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError(404, "Employee not found");

  if (!ALLOWED_TYPES.includes(input.type)) {
    throw new AppError(400, "Earning type must be BONUS, ALLOWANCE, or OTHER");
  }
  if (!input.label?.trim()) throw new AppError(400, "Label is required");
  if (typeof input.amount !== "number" || input.amount < 0) {
    throw new AppError(400, "Amount must be a non-negative number");
  }

  return prisma.employeeEarning.create({
    data: {
      employeeId,
      type: input.type,
      label: input.label.trim(),
      amount: input.amount,
    },
  });
}

export async function updateEmployeeEarning(
  employeeId: string,
  eeId: string,
  input: { label?: string; amount?: number }
) {
  const ee = await prisma.employeeEarning.findFirst({ where: { id: eeId, employeeId } });
  if (!ee) throw new AppError(404, "Employee earning not found");

  return prisma.employeeEarning.update({
    where: { id: eeId },
    data: {
      ...(input.label !== undefined && { label: input.label.trim() }),
      ...(input.amount !== undefined && { amount: input.amount }),
    },
  });
}

export async function removeEmployeeEarning(employeeId: string, eeId: string) {
  const ee = await prisma.employeeEarning.findFirst({ where: { id: eeId, employeeId } });
  if (!ee) throw new AppError(404, "Employee earning not found");

  await prisma.employeeEarning.delete({ where: { id: eeId } });
}
