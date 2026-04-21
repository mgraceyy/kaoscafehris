import type { Request, Response, NextFunction } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error-handler.js";
import * as authService from "./auth.service.js";

const COOKIE_NAME = "token";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, user } = await authService.login(req.body);
    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  res.json({ message: "Logged out" });
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }
    const user = await authService.getCurrentUser(req.user.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
