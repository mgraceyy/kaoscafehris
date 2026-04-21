import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";
import { logAudit } from "../../lib/audit.js";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ListEmployeeQuery,
} from "./employee.schema.js";

function stripPassword<T extends { password?: string }>(
  v: T | null | undefined
): Omit<T, "password"> | null {
  if (!v) return null;
  const { password: _pw, ...rest } = v;
  return rest;
}

const employeeInclude = {
  branch: { select: { id: true, name: true, city: true } },
  user: { select: { id: true, email: true, role: true, isActive: true, lastLogin: true } },
} as const;

export async function listEmployees(query: ListEmployeeQuery) {
  const where: Prisma.EmployeeWhereInput = {};
  if (query.branchId) where.branchId = query.branchId;
  if (query.status) where.employmentStatus = query.status;
  if (query.role) where.user = { role: query.role };
  if (query.search) {
    where.OR = [
      { firstName: { contains: query.search, mode: "insensitive" } },
      { lastName: { contains: query.search, mode: "insensitive" } },
      { employeeId: { contains: query.search, mode: "insensitive" } },
      { position: { contains: query.search, mode: "insensitive" } },
      { user: { email: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  return prisma.employee.findMany({
    where,
    include: employeeInclude,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getEmployeeById(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: employeeInclude,
  });
  if (!employee) throw new AppError(404, "Employee not found");
  return employee;
}

export async function createEmployee(input: CreateEmployeeInput) {
  // Ensure branch exists (nicer error than generic FK failure).
  const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
  if (!branch) throw new AppError(400, "Selected branch does not exist");
  if (!branch.isActive) throw new AppError(400, "Cannot assign employee to an inactive branch");

  const hashedPassword = await bcrypt.hash(input.password, env.bcryptRounds);

  // Transactional: User + Employee must both succeed or both roll back.
  const employee = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        role: input.role,
        isActive: true,
      },
    });

    return tx.employee.create({
      data: {
        employeeId: input.employeeId,
        userId: user.id,
        branchId: input.branchId,
        firstName: input.firstName,
        lastName: input.lastName,
        middleName: input.middleName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        civilStatus: input.civilStatus,
        nationality: input.nationality,
        phone: input.phone,
        address: input.address,
        city: input.city,
        province: input.province,
        zipCode: input.zipCode,
        emergencyName: input.emergencyName,
        emergencyPhone: input.emergencyPhone,
        emergencyRelation: input.emergencyRelation,
        position: input.position,
        department: input.department,
        employmentStatus: input.employmentStatus,
        dateHired: input.dateHired,
        basicSalary: input.basicSalary,
        sssNumber: input.sssNumber,
        philhealthNumber: input.philhealthNumber,
        pagibigNumber: input.pagibigNumber,
        tinNumber: input.tinNumber,
      },
      include: employeeInclude,
    });
  });

  await logAudit({
    action: "CREATE",
    tableName: "employees",
    recordId: employee.id,
    newValues: employee,
  });
  return employee;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!existing) throw new AppError(404, "Employee not found");
  const before = { ...existing, user: stripPassword(existing.user) };

  if (input.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) throw new AppError(400, "Selected branch does not exist");
    if (!branch.isActive) throw new AppError(400, "Cannot reassign to an inactive branch");
  }

  const employeeData: Prisma.EmployeeUpdateInput = {};
  const assign = <K extends keyof UpdateEmployeeInput>(key: K) => {
    if (input[key] !== undefined) {
      (employeeData as Record<string, unknown>)[key as string] = input[key];
    }
  };
  (
    [
      "employeeId",
      "firstName",
      "lastName",
      "middleName",
      "dateOfBirth",
      "gender",
      "civilStatus",
      "nationality",
      "phone",
      "address",
      "city",
      "province",
      "zipCode",
      "emergencyName",
      "emergencyPhone",
      "emergencyRelation",
      "position",
      "department",
      "employmentStatus",
      "dateHired",
      "basicSalary",
      "sssNumber",
      "philhealthNumber",
      "pagibigNumber",
      "tinNumber",
    ] as const
  ).forEach(assign);
  if (input.branchId) {
    employeeData.branch = { connect: { id: input.branchId } };
  }

  const userData: Prisma.UserUpdateInput = {};
  if (input.email !== undefined) userData.email = input.email;
  if (input.role !== undefined) userData.role = input.role;
  if (input.isActive !== undefined) userData.isActive = input.isActive;
  if (input.password !== undefined) {
    userData.password = await bcrypt.hash(input.password, env.bcryptRounds);
  }
  const touchUser = Object.keys(userData).length > 0;

  const updated = await prisma.$transaction(async (tx) => {
    if (touchUser) {
      await tx.user.update({ where: { id: existing.userId }, data: userData });
    }
    return tx.employee.update({
      where: { id },
      data: employeeData,
      include: employeeInclude,
    });
  });

  await logAudit({
    action: "UPDATE",
    tableName: "employees",
    recordId: id,
    oldValues: before,
    newValues: updated,
  });
  return updated;
}

// --- CSV import -----------------------------------------------------------

export interface ImportResult {
  created: number;
  skipped: number;
  failed: Array<{ row: number; reason: string }>;
}

function parseCsvRow(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Expected CSV columns (header row required):
 * employeeId, firstName, lastName, email, password, role, branchId,
 * position, department, dateHired, basicSalary, employmentStatus
 */
export async function importEmployees(csvContent: string): Promise<ImportResult> {
  const lines = csvContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new AppError(400, "CSV must contain a header row and at least one data row");
  }

  const headers = parseCsvRow(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "")
  );
  const required = [
    "employeeid", "firstname", "lastname", "email",
    "branchid", "position", "datehired", "basicsalary",
  ];
  const missing = required.filter((r) => !headers.includes(r));
  if (missing.length > 0) {
    throw new AppError(400, `Missing required CSV columns: ${missing.join(", ")}`);
  }

  const result: ImportResult = { created: 0, skipped: 0, failed: [] };

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    try {
      // Skip the template example row if the user forgot to delete it.
      if (row["employeeid"].toUpperCase().startsWith("EXAMPLE")) {
        result.skipped++;
        continue;
      }

      const existing = await prisma.employee.findUnique({
        where: { employeeId: row["employeeid"] },
      });
      if (existing) {
        result.skipped++;
        continue;
      }

      const roleRaw = row["role"]?.toUpperCase();
      const statusRaw = row["employmentstatus"]?.toUpperCase();

      // Accept branch ID (UUID) or branch name (case-insensitive).
      const branchRaw = row["branchid"];
      let resolvedBranchId = branchRaw;
      const branchById = await prisma.branch.findUnique({ where: { id: branchRaw } });
      if (!branchById) {
        const branchByName = await prisma.branch.findFirst({
          where: { name: { equals: branchRaw, mode: "insensitive" } },
        });
        if (!branchByName) throw new AppError(400, `Branch "${branchRaw}" does not exist`);
        resolvedBranchId = branchByName.id;
      }

      await createEmployee({
        employeeId: row["employeeid"],
        firstName: row["firstname"],
        lastName: row["lastname"],
        email: row["email"],
        password: row["password"] || "ChangeMe@1234",
        role: (["ADMIN", "MANAGER", "EMPLOYEE"].includes(roleRaw)
          ? roleRaw
          : "EMPLOYEE") as "ADMIN" | "MANAGER" | "EMPLOYEE",
        branchId: resolvedBranchId,
        position: row["position"],
        department: row["department"] || undefined,
        dateHired: new Date(row["datehired"]),
        basicSalary: parseFloat(row["basicsalary"]) || 0,
        employmentStatus: (["ACTIVE", "INACTIVE", "ON_LEAVE"].includes(statusRaw)
          ? statusRaw
          : "ACTIVE") as "ACTIVE" | "INACTIVE" | "ON_LEAVE",
      });
      result.created++;
    } catch (err) {
      let reason = "An unexpected error occurred. Please check this row and try again.";
      if (err instanceof AppError) {
        reason = err.message;
      } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          const fields = (err.meta?.target as string[]) ?? [];
          if (fields.includes("email")) reason = "This email address is already in use.";
          else if (fields.includes("employeeId")) reason = "This Employee ID is already taken.";
          else reason = "A duplicate value was found. Please check this row.";
        } else if (err.code === "P2003") {
          reason = "One of the values (e.g. branch) no longer exists. Please verify and try again.";
        }
      } else if (err instanceof Error) {
        reason = err.message;
      }
      result.failed.push({ row: i + 1, reason });
    }
  }

  return result;
}

/**
 * Soft delete: sets employment status to TERMINATED and deactivates the user
 * account. We never hard-delete because payroll/attendance history references
 * employees and must remain auditable.
 */
export async function deactivateEmployee(id: string) {
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!existing) throw new AppError(404, "Employee not found");
  const before = { ...existing, user: stripPassword(existing.user) };

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.userId },
      data: { isActive: false },
    });
    return tx.employee.update({
      where: { id },
      data: {
        employmentStatus: "TERMINATED",
        dateTerminated: new Date(),
      },
      include: employeeInclude,
    });
  });

  await logAudit({
    action: "UPDATE",
    tableName: "employees",
    recordId: id,
    oldValues: before,
    newValues: updated,
  });
  return updated;
}
