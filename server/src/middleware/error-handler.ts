import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

function targetLabel(target: unknown): string | null {
  if (Array.isArray(target)) return target.join(", ");
  if (typeof target === "string") return target;
  return null;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const label = targetLabel(err.meta?.target) || "value";
        res.status(409).json({ message: `A record with this ${label} already exists` });
        return;
      }
      case "P2025": {
        res.status(404).json({ message: "Record not found" });
        return;
      }
      case "P2003": {
        res.status(409).json({
          message: "Operation blocked by related records (foreign key constraint)",
        });
        return;
      }
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ message: "Invalid request data" });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
}
