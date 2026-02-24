import type { RequestHandler } from "express";
import { hasPermission, Role } from "../modules/auth/roles.js";
import prismaDefault from "../infra/database.js";

export function requireRole(role: string): RequestHandler {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== role) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}

export function requirePermission(permission: string): RequestHandler {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (!hasPermission(user.role as Role, permission)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    if (shouldAuditRequest(req)) {
      try {
        const entity = (req.baseUrl || req.path || "").split("/").filter(Boolean).pop() || "unknown";
        await prismaDefault.auditLog.create({
          data: {
            actorId: user.id || null,
            action: "DATA_MODIFICATION",
            entity,
            entityId: null,
            details: {
              method: req.method,
              path: req.originalUrl,
              permission,
              body: scrubBody(req.body),
            } as any,
          },
        });
      } catch (err) {
        // avoid blocking request on audit failures
        console.warn("Audit log write failed", err);
      }
    }
    return next();
  };
}

function shouldAuditRequest(req: any) {
  if (process.env.AUDIT_LOG_ENABLED === "false") return false;
  const method = (req.method || "").toUpperCase();
  if (!"POST|PUT|PATCH|DELETE".includes(method)) return false;
  const url = (req.originalUrl || "").toString();
  if (url.includes("/auth/")) return false;
  return true;
}

function scrubBody(body: any): any {
  if (!body || typeof body !== "object") return body;
  const clone: any = Array.isArray(body) ? body.map((v) => scrubBody(v)) : { ...body };
  const sensitive = ["password", "oldPassword", "newPassword", "otp", "token", "refreshToken"];
  for (const key of sensitive) {
    if (key in clone) clone[key] = "[REDACTED]";
  }
  return clone;
}

export function requireRoleForElevation(): RequestHandler {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "HR_ADMIN" && user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Forbidden: Only HR_ADMIN or SUPER_ADMIN can change roles" });
    }
    return next();
  };
}
