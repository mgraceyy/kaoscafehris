import type { Request, Response, NextFunction } from "express";
import { listAuditLogsQuerySchema } from "./audit-log.schema.js";
import * as auditLogService from "./audit-log.service.js";

type IdParams = { id: string };

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listAuditLogsQuerySchema.parse(req.query);
    const data = await auditLogService.listAuditLogs(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await auditLogService.getAuditLogById(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getTables(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await auditLogService.getDistinctTables();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
