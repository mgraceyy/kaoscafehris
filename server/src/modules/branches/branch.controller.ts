import type { Request, Response, NextFunction } from "express";
import { listBranchQuerySchema } from "./branch.schema.js";
import * as branchService from "./branch.service.js";

type IdParams = { id: string };

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listBranchQuerySchema.parse(req.query);
    const branches = await branchService.listBranches(query);
    res.json({ data: branches });
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
    const branch = await branchService.getBranchById(req.params.id);
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const branch = await branchService.createBranch(req.body);
    res.status(201).json({ data: branch });
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const branch = await branchService.updateBranch(req.params.id, req.body);
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
}

export async function deactivate(
  req: Request<IdParams>,
  res: Response,
  next: NextFunction
) {
  try {
    const branch = await branchService.deactivateBranch(req.params.id);
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
}
