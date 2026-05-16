import type { Request, Response, NextFunction } from "express";
import {
  listGovTablesQuerySchema,
  listSettingsQuerySchema,
} from "./settings.schema.js";
import * as settingsService from "./settings.service.js";

type IdParams = { id: string };
type KeyParams = { key: string };

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSettingsQuerySchema.parse(req.query);
    const data = await settingsService.listSettings(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateByKey(
  req: Request<KeyParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await settingsService.updateSetting(req.params.key, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await settingsService.bulkUpdate(req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getGovernmentTables(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = listGovTablesQuerySchema.parse(req.query);
    const data = await settingsService.listGovTables(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function upsertGovernmentTable(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await settingsService.upsertGovTable(req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deleteGovernmentEntry(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    await settingsService.deleteGovTable(req.params.id);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}

type RoleParams = { role: string };
const VALID_PERM_ROLES = ["branch_manager", "employee"] as const;
type PermRole = (typeof VALID_PERM_ROLES)[number];

function parsePermRole(role: string): PermRole {
  if (!VALID_PERM_ROLES.includes(role as PermRole)) {
    throw Object.assign(new Error("Invalid role"), { statusCode: 400 });
  }
  return role as PermRole;
}

export async function getPermissions(
  req: Request<RoleParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const role = parsePermRole(req.params.role);
    const data = await settingsService.getRolePermissions(role);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function savePermissions(
  req: Request<RoleParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const role = parsePermRole(req.params.role);
    await settingsService.setRolePermissions(role, req.body);
    res.json({ data: req.body });
  } catch (err) {
    next(err);
  }
}
