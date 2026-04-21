import { Prisma } from "@prisma/client";
import prisma from "../../config/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type { ListAuditLogsQuery } from "./audit-log.schema.js";

const logSelect = {
  id: true,
  userId: true,
  action: true,
  tableName: true,
  recordId: true,
  oldValues: true,
  newValues: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  user: { select: { id: true, email: true, role: true } },
} satisfies Prisma.AuditLogSelect;

export async function listAuditLogs(query: ListAuditLogsQuery) {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = query.action;
  if (query.tableName) where.tableName = query.tableName;
  if (query.recordId) where.recordId = query.recordId;
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      where.createdAt.gte = new Date(`${query.startDate}T00:00:00.000Z`);
    }
    if (query.endDate) {
      where.createdAt.lte = new Date(`${query.endDate}T23:59:59.999Z`);
    }
  }

  const skip = (query.page - 1) * query.pageSize;
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      select: logSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getAuditLogById(id: string) {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    select: logSelect,
  });
  if (!log) throw new AppError(404, "Audit log entry not found");
  return log;
}

export async function getDistinctTables(): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    distinct: ["tableName"],
    select: { tableName: true },
    orderBy: { tableName: "asc" },
  });
  return rows.map((r) => r.tableName);
}
