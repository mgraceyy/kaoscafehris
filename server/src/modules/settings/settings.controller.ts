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
