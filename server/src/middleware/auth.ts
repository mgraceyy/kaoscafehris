import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@prisma/client";
import { setAuditContextUser } from "../lib/audit-context.js";

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

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    req.user = payload;
    setAuditContextUser(payload.userId);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
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
