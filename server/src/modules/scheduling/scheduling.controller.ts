import type { Request, Response, NextFunction } from "express";
import { assignEmployeesSchema, listShiftsQuerySchema } from "./scheduling.schema.js";
import * as schedulingService from "./scheduling.service.js";

type IdParams = { id: string };
type ShiftEmployeeParams = { id: string; employeeId: string };

export async function listShifts(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listShiftsQuerySchema.parse(req.query);
    const data = await schedulingService.listShifts(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getShift(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await schedulingService.getShiftById(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createShift(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await schedulingService.createShift(req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function updateShift(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await schedulingService.updateShift(req.params.id, req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function deleteShift(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    await schedulingService.deleteShift(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function assignEmployees(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const input = assignEmployeesSchema.parse(req.body);
    const data = await schedulingService.assignEmployees(req.params.id, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function unassignEmployee(
  req: Request<ShiftEmployeeParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await schedulingService.unassignEmployee(
      req.params.id,
      req.params.employeeId
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
