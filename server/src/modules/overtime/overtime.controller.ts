import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/error-handler.js";
import prisma from "../../config/db.js";
import {
  listOvertimeQuerySchema,
  createOvertimeSchema,
  reviewOvertimeSchema,
  approveShiftOvertimeSchema,
  createScheduleSchema,
  updateScheduleSchema,
  listSchedulesQuerySchema,
} from "./overtime.schema.js";
import * as overtimeService from "./overtime.service.js";

async function resolveEmployeeId(userId: string): Promise<string> {
  const emp = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!emp) throw new AppError(403, "No employee profile attached to this account");
  return emp.id;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listOvertimeQuerySchema.parse(req.query);
    let scopedEmployeeId: string | undefined;
    let scopedBranchId: string | undefined;

    if (req.user?.role === "EMPLOYEE") {
      scopedEmployeeId = await resolveEmployeeId(req.user.userId);
    } else if (req.user?.role === "MANAGER") {
      const emp = await prisma.employee.findUnique({
        where: { userId: req.user.userId },
        select: { branchId: true },
      });
      if (emp) scopedBranchId = emp.branchId;
    }

    const data = await overtimeService.listRequests(query, scopedEmployeeId, scopedBranchId);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(401, "Authentication required");
    const input = createOvertimeSchema.parse(req.body);
    const employeeId = await resolveEmployeeId(req.user.userId);
    const data = await overtimeService.createRequest(employeeId, input);
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function review(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(401, "Authentication required");
    const input = reviewOvertimeSchema.parse(req.body);
    const data = await overtimeService.reviewRequest(req.params.id, req.user.userId, input);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function listSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSchedulesQuerySchema.parse(req.query);
    let scopedBranchId: string | undefined;
    if (req.user?.role === "MANAGER") {
      const emp = await prisma.employee.findUnique({
        where: { userId: req.user.userId },
        select: { branchId: true },
      });
      if (emp) scopedBranchId = emp.branchId;
    }
    const data = await overtimeService.listSchedules(query, scopedBranchId);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError(401, "Authentication required");
    const input = createScheduleSchema.parse(req.body);
    const data = await overtimeService.createSchedule(req.user.userId, input);
    res.status(201).json({ data });
  } catch (err) { next(err); }
}

export async function updateSchedule(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const input = updateScheduleSchema.parse(req.body);
    const data = await overtimeService.updateSchedule(req.params.id, input);
    res.json({ data });
  } catch (err) { next(err); }
}

export async function deleteSchedule(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    await overtimeService.deleteSchedule(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) { next(err); }
}

export async function setShiftOvertime(
  req: Request<{ shiftId: string; employeeId: string }>,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) throw new AppError(401, "Authentication required");
    const input = approveShiftOvertimeSchema.parse(req.body);
    const data = await overtimeService.setShiftOvertimeApproval(
      req.params.shiftId,
      req.params.employeeId,
      req.user.userId,
      input
    );
    res.json({ data });
  } catch (err) { next(err); }
}
