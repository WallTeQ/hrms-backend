import type { RequestHandler } from "express";
import { hasPermission, Role } from "../modules/auth/roles.js";

export function requireRole(role: string): RequestHandler {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== role) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

export function requirePermission(permission: string): RequestHandler {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!hasPermission(user.role as Role, permission)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }
    return next();
  };
}

export function requireRoleForElevation(): RequestHandler {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "HR_ADMIN" && user.role !== "BOARD") {
      return res.status(403).json({ error: "Forbidden: Only HR_ADMIN or BOARD can change roles" });
    }
    return next();
  };
}
