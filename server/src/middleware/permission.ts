import type { Request, Response, NextFunction } from "express";
import prisma from "../config/db.js";

export type PermModule = "schedule" | "attendance" | "leave" | "branches" | "employees" | "payroll" | "reports" | "settings";
export type PermAction = "view" | "create" | "edit" | "delete";
type PermState = "on" | "off" | "locked";
type StoredPerms = Partial<Record<PermModule, Partial<Record<PermAction, PermState>>>>;

// Defaults mirror the branch_manager section in the UI's ROLE_SECTIONS constant.
const MANAGER_DEFAULTS: StoredPerms = {
  schedule:   { view: "on", create: "on",  edit: "on",  delete: "on"  },
  attendance: { view: "on", create: "on",  edit: "on",  delete: "off" },
  leave:      { view: "on", create: "on",  edit: "on",  delete: "off" },
  branches:   { view: "on", create: "off", edit: "on",  delete: "off" },
  employees:  { view: "on", create: "off", edit: "off", delete: "off" },
};

let _cache: StoredPerms | null = null;
let _expiry = 0;
const TTL = 60_000;

export function invalidatePermissionCache() {
  _cache = null;
  _expiry = 0;
}

async function loadManagerPerms(): Promise<StoredPerms> {
  if (_cache && Date.now() < _expiry) return _cache;
  const row = await prisma.systemSetting.findUnique({
    where: { key: "permissions.branch_manager" },
  });
  _cache = row ? (JSON.parse(row.value) as StoredPerms) : MANAGER_DEFAULTS;
  _expiry = Date.now() + TTL;
  return _cache;
}

export function authorizePermission(module: PermModule, action: PermAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (req.user.role === "ADMIN") { next(); return; }
    if (req.user.role === "MANAGER") {
      const perms = await loadManagerPerms();
      if (perms[module]?.[action] === "on") { next(); return; }
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }
    res.status(403).json({ message: "Insufficient permissions" });
  };
}
