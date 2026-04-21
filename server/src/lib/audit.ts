import { Prisma, type AuditAction } from "@prisma/client";
import prisma from "../config/db.js";
import { getAuditContext } from "./audit-context.js";

type Tx = Prisma.TransactionClient | typeof prisma;

export interface LogAuditInput {
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: unknown;
  newValues?: unknown;
  /** Optional override if you already know the actor outside a request context. */
  userId?: string | null;
}

function toJsonInput(
  v: unknown
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.JsonNull;
  // JSON-roundtrip strips Decimal/Date/undefined into serializable primitives.
  return JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
}

/**
 * Write an audit log entry. Never throws — logging failures must not break
 * the main request flow. Reads actor metadata from AsyncLocalStorage when
 * called inside a request handled by auditContextMiddleware.
 *
 * Pass `tx` to join an existing transaction.
 */
export async function logAudit(input: LogAuditInput, tx: Tx = prisma): Promise<void> {
  try {
    const ctx = getAuditContext();
    await tx.auditLog.create({
      data: {
        userId: input.userId ?? ctx?.userId ?? null,
        action: input.action,
        tableName: input.tableName,
        recordId: input.recordId,
        oldValues: toJsonInput(input.oldValues),
        newValues: toJsonInput(input.newValues),
        ipAddress: ctx?.ipAddress ?? null,
        userAgent: ctx?.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("logAudit failed:", err);
  }
}
