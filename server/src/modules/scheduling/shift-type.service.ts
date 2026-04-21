import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { logAudit } from "../../lib/audit.js";
import { CreateShiftTypeInput, UpdateShiftTypeInput } from "./shift-type.schema.js";

function timeToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

export async function createShiftType(input: CreateShiftTypeInput, userId?: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: input.branchId },
  });
  if (!branch) {
    throw new AppError(404, "Branch not found");
  }

  // Check for duplicate name in the branch
  const existing = await prisma.shiftType.findUnique({
    where: {
      branchId_name: {
        branchId: input.branchId,
        name: input.name,
      },
    },
  });
  if (existing) {
    throw new AppError(400, `Shift type "${input.name}" already exists for this branch`);
  }

  const shiftType = await prisma.shiftType.create({
    data: {
      branchId: input.branchId,
      name: input.name,
      startTime: timeToDate(input.startTime),
      endTime: timeToDate(input.endTime),
    },
  });

  await logAudit({
    userId,
    action: "CREATE",
    tableName: "shift_types",
    recordId: shiftType.id,
    newValues: shiftType,
  });

  return shiftType;
}

export async function listShiftTypes(branchId: string) {
  return prisma.shiftType.findMany({
    where: {
      branchId,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getShiftTypeById(id: string) {
  const shiftType = await prisma.shiftType.findUnique({
    where: { id },
  });
  if (!shiftType) {
    throw new AppError(404, "Shift type not found");
  }
  return shiftType;
}

export async function updateShiftType(
  id: string,
  input: UpdateShiftTypeInput,
  userId?: string
) {
  const shiftType = await getShiftTypeById(id);

  // If updating name, check for duplicate
  if (input.name && input.name !== shiftType.name) {
    const existing = await prisma.shiftType.findUnique({
      where: {
        branchId_name: {
          branchId: shiftType.branchId,
          name: input.name,
        },
      },
    });
    if (existing) {
      throw new AppError(400, `Shift type "${input.name}" already exists for this branch`);
    }
  }

  const updated = await prisma.shiftType.update({
    where: { id },
    data: {
      name: input.name,
      startTime: input.startTime ? timeToDate(input.startTime) : undefined,
      endTime: input.endTime ? timeToDate(input.endTime) : undefined,
    },
  });

  await logAudit({
    userId,
    action: "UPDATE",
    tableName: "shift_types",
    recordId: id,
    oldValues: shiftType,
    newValues: updated,
  });

  return updated;
}

export async function deleteShiftType(id: string, userId?: string) {
  const shiftType = await getShiftTypeById(id);

  // Check if any shifts reference this type
  const shiftsCount = await prisma.shift.count({
    where: { shiftTypeId: id },
  });

  if (shiftsCount > 0) {
    throw new AppError(
      400,
      `Cannot delete shift type. ${shiftsCount} shift(s) are using this template.`
    );
  }

  const deleted = await prisma.shiftType.delete({
    where: { id },
  });

  await logAudit({
    userId,
    action: "DELETE",
    tableName: "shift_types",
    recordId: id,
    oldValues: shiftType,
  });

  return deleted;
}
