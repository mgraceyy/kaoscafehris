import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response, NextFunction } from "express";

export interface AuditContext {
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const storage = new AsyncLocalStorage<AuditContext>();

export function getAuditContext(): AuditContext | undefined {
  return storage.getStore();
}

/**
 * Sets the current user on the in-flight audit context. Called by the
 * `authenticate` middleware after the JWT is verified. Safe to call outside
 * a request (no-op).
 */
export function setAuditContextUser(userId: string): void {
  const ctx = storage.getStore();
  if (ctx) ctx.userId = userId;
}

/**
 * App-level middleware that opens a per-request AsyncLocalStorage scope so
 * downstream services can call logAudit() without threading actor args.
 * Runs before `authenticate` — the user id is filled in later via
 * setAuditContextUser().
 */
export function auditContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const ctx: AuditContext = {
    userId: null,
    ipAddress: (req.ip ?? req.socket?.remoteAddress) || null,
    userAgent: req.headers["user-agent"] ?? null,
  };
  storage.run(ctx, () => next());
}
