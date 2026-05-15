import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/error-handler.js";
import { dateRangeQuerySchema } from "./portal.schema.js";
import * as portalService from "./portal.service.js";
import * as docService from "../employees/employee-document.service.js";

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

// --- My Documents -----------------------------------------------------------

type DocParams = { docId: string };

export async function listMyDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = requireUser(req);
    const employeeId = await portalService.resolveEmployeeIdOrThrow(userId);
    const data = await docService.listEmployeeDocuments(employeeId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function uploadMyDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = requireUser(req);
    if (!req.file) throw new AppError(400, "No file uploaded");
    const employeeId = await portalService.resolveEmployeeIdOrThrow(userId);
    const name = (req.body.name as string) || req.file.originalname;
    const data = await docService.createEmployeeDocument(employeeId, req.file, name);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function downloadMyDocument(req: Request<DocParams>, res: Response, next: NextFunction) {
  try {
    const { userId } = requireUser(req);
    const employeeId = await portalService.resolveEmployeeIdOrThrow(userId);
    const doc = await docService.getDocumentById(req.params.docId, employeeId);
    const uploadsBase = process.env.UPLOADS_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "uploads");
    const filePath = path.join(uploadsBase, "documents", doc.filename);
    res.download(filePath, doc.originalName);
  } catch (err) {
    next(err);
  }
}

export async function previewMyDocument(req: Request<DocParams>, res: Response, next: NextFunction) {
  try {
    const { userId } = requireUser(req);
    const employeeId = await portalService.resolveEmployeeIdOrThrow(userId);
    const doc = await docService.getDocumentById(req.params.docId, employeeId);
    const uploadsBase = process.env.UPLOADS_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "uploads");
    const filePath = path.resolve(path.join(uploadsBase, "documents", doc.filename));
    res.setHeader("Content-Type", doc.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalName.replace(/"/g, "_")}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

export async function deleteMyDocument(req: Request<DocParams>, res: Response, next: NextFunction) {
  try {
    const { userId } = requireUser(req);
    const employeeId = await portalService.resolveEmployeeIdOrThrow(userId);
    await docService.deleteEmployeeDocument(employeeId, req.params.docId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
