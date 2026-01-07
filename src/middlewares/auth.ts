import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { isTokenRevoked, isIpBlocked } from "./security";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export const authMiddleware: RequestHandler = async (req, res, next) => {
  // Blocklist check for IP
  try {
    const blocked = await isIpBlocked(req.ip || "");
    if (blocked) return res.status(403).json({ error: "Forbidden" });
  } catch (e) {
    // ignore
  }

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // check revocation
    const revoked = await isTokenRevoked(token);
    if (revoked) return res.status(401).json({ error: "Token revoked" });
    // attach minimal user info
    (req as any).user = { id: payload.sub ?? payload.userId, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
