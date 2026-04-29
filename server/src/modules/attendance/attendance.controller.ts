import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/error-handler.js";
import { listAttendanceQuerySchema } from "./attendance.schema.js";
import * as attendanceService from "./attendance.service.js";

type IdParams = { id: string };

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listAttendanceQuerySchema.parse(req.query);
    const data = await attendanceService.listAttendance(query);
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
    const data = await attendanceService.getAttendance(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function clockIn(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await attendanceService.clockIn(req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function clockOut(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await attendanceService.clockOut(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function adjust(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await attendanceService.manualAdjust(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function manualCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await attendanceService.manualCreate(req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function sync(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await attendanceService.syncBatch(req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function uploadSelfie(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new AppError(400, "No image file uploaded");
    const url = `/uploads/selfies/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    next(err);
  }
}
