import type { RequestHandler } from "express";

export function requireRole(role: string): RequestHandler {
  return (req, res, next) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== role) return res.status(403).json({ error: "Forbidden" });
    return next();
  };
}
