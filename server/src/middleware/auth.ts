import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@prisma/client";
import { setAuditContextUser } from "../lib/audit-context.js";
import prisma from "../config/db.js";

export interface AuthPayload {
  userId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  let payload: AuthPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: payload.userId },
    select: { employmentStatus: true },
  });

  if (employee?.employmentStatus === "TERMINATED") {
    res.status(403).json({ message: "Your employment has been terminated. Access is no longer allowed." });
    return;
  }

  req.user = payload;
  setAuditContextUser(payload.userId);
  next();
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }
    next();
  };
}
