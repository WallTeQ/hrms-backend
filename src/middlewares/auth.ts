import type { RequestHandler } from "express";
import { verifyAccessToken, JWTPayload } from "../common/jwt.js";
import { isTokenRevoked, isIpBlocked } from "./security.js";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

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
    const payload = verifyAccessToken(token);
    // check revocation
    const revoked = await isTokenRevoked(token);
    if (revoked) return res.status(401).json({ error: "Token revoked" });
    // attach user info
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
