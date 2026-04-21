import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/error-handler.js";
import { dateRangeQuerySchema } from "./portal.schema.js";
import * as portalService from "./portal.service.js";

export async function uploadPhoto(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = requireUser(req);
    if (!req.file) throw new AppError(400, "No file uploaded");
    const url = `/uploads/photos/${req.file.filename}`;
    const data = await portalService.updateProfilePhoto(userId, url);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

function requireUser(req: Request): { userId: string } {
  if (!req.user) throw new AppError(401, "Authentication required");
  return { userId: req.user.userId };
}

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = requireUser(req);
    const data = await portalService.getProfile(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = requireUser(req);
    const data = await portalService.updateProfile(userId, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = requireUser(req);
    await portalService.changePassword(userId, req.body);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
}

export async function getSchedule(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = requireUser(req);
    const query = dateRangeQuerySchema.parse(req.query);
    const data = await portalService.getSchedule(userId, query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getAttendance(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId } = requireUser(req);
    const query = dateRangeQuerySchema.parse(req.query);
    const data = await portalService.getAttendanceHistory(userId, query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
