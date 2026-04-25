import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/error-handler.js";
import prisma from "../../config/db.js";
import {
  listLeaveBalancesQuerySchema,
  listLeaveQuerySchema,
} from "./leave.schema.js";
import * as leaveService from "./leave.service.js";

type IdParams = { id: string };

/** Resolve the Employee.id for the calling user, throwing if none exists. */
async function resolveOwnEmployeeId(userId: string): Promise<string> {
  const emp = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!emp) throw new AppError(403, "No employee profile attached to this account");
  return emp.id;
}

export async function listRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listLeaveQuerySchema.parse(req.query);
    // Employees may only see their own requests regardless of query params.
    if (req.user?.role === "EMPLOYEE") {
      query.employeeId = await resolveOwnEmployeeId(req.user.userId);
    }
    const data = await leaveService.listRequests(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getRequest(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await leaveService.getRequestById(req.params.id);
    // Employees can only fetch their own request.
    if (req.user?.role === "EMPLOYEE") {
      const ownEmpId = await resolveOwnEmployeeId(req.user.userId);
      if (data.employeeId !== ownEmpId) {
        throw new AppError(403, "You can only view your own leave requests");
      }
    }
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createRequest(req: Request, res: Response, next: NextFunction) {
  try {
    // Employees can only file for themselves — override whatever employeeId was sent.
    if (req.user?.role === "EMPLOYEE") {
      req.body.employeeId = await resolveOwnEmployeeId(req.user.userId);
    }
    const data = await leaveService.createRequest(req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function reviewRequest(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) throw new AppError(401, "Authentication required");
    const data = await leaveService.reviewRequest(
      req.params.id,
      req.user.userId,
      req.body
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function cancelRequest(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    // Employees can only cancel their own pending requests.
    if (req.user?.role === "EMPLOYEE") {
      const ownEmpId = await resolveOwnEmployeeId(req.user.userId);
      const request = await prisma.leaveRequest.findUnique({
        where: { id: req.params.id },
        select: { employeeId: true },
      });
      if (!request) throw new AppError(404, "Leave request not found");
      if (request.employeeId !== ownEmpId) {
        throw new AppError(403, "You can only cancel your own leave requests");
      }
    }
    const data = await leaveService.cancelRequest(req.params.id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function listBalances(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listLeaveBalancesQuerySchema.parse(req.query);
    // Employees may only view their own balances.
    if (req.user?.role === "EMPLOYEE") {
      query.employeeId = await resolveOwnEmployeeId(req.user.userId);
    }
    const data = await leaveService.listBalances(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function upsertBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await leaveService.upsertBalance(req.body);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function upsertBalanceForAll(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await leaveService.upsertBalanceForAll(req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
