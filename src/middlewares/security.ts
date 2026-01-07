import type { Request, Response, NextFunction } from "express";
import { redis } from "../infra/redis";

// Generic Redis-backed rate limiter (per IP or custom key)
export function createRateLimiter(options: { prefix: string; windowSeconds?: number; max: number }) {
  const { prefix, windowSeconds = 60, max } = options;
  return async function rateLimiter(req: Request, res: Response, next: NextFunction) {
    try {
      const id = (req.ip || req.headers["x-forwarded-for"] || "unknown").toString();
      const key = `rl:${prefix}:ip:${id}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      if (count > max) return res.status(429).json({ error: "Too many requests" });
      return next();
    } catch (err) {
      // Fail open on Redis errors to avoid DoS on legitimate users
      return next();
    }
  };
}

// Login brute-force protection using Redis counters and lockout
const FAIL_PREFIX = "auth:fail:email:";
const LOCK_PREFIX = "auth:lock:email:";
const AUDIT_LIST = "auth:audit";

export async function isLoginLocked(email: string) {
  const lockKey = LOCK_PREFIX + email.toLowerCase();
  const val = await redis.get(lockKey);
  return !!val;
}

export async function recordFailedLogin(email: string, threshold = 5, windowSeconds = 900, lockSeconds = 900) {
  const failKey = FAIL_PREFIX + email.toLowerCase();
  const newCount = await redis.incr(failKey);
  if (newCount === 1) await redis.expire(failKey, windowSeconds);
  // add to audit list
  await redis.lpush(AUDIT_LIST, JSON.stringify({ type: "login-failed", email, at: new Date().toISOString(), count: newCount }));
  await redis.ltrim(AUDIT_LIST, 0, 1000);
  if (newCount >= threshold) {
    const lockKey = LOCK_PREFIX + email.toLowerCase();
    await redis.set(lockKey, "1", "EX", lockSeconds);
    await redis.lpush(AUDIT_LIST, JSON.stringify({ type: "login-locked", email, at: new Date().toISOString(), lockSeconds }));
    await redis.ltrim(AUDIT_LIST, 0, 1000);
  }
}

export async function clearFailedLogin(email: string) {
  const failKey = FAIL_PREFIX + email.toLowerCase();
  await redis.del(failKey);
}

// Middleware to check if a login is locked
export function loginLockMiddleware() {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const email = (req.body?.email || "").toString();
      if (!email) return next();
      const locked = await isLoginLocked(email);
      if (locked) return res.status(423).json({ error: "Too many failed attempts. Account temporarily locked." });
      return next();
    } catch (err) {
      return next();
    }
  };
}

// Simple audit helper
export async function auditAuthEvent(type: string, payload: any) {
  try {
    await redis.lpush(AUDIT_LIST, JSON.stringify({ type, payload, at: new Date().toISOString() }));
    await redis.ltrim(AUDIT_LIST, 0, 1000);
  } catch (err) {
    // ignore
  }
}

// Token revocation (logout) helpers
const REVOKED_TOKEN_PREFIX = "token:revoked:";

export async function revokeToken(token: string, expiresInSeconds = 60 * 60 * 24 * 7) {
  try {
    // try to parse token expiry if possible
    const jwt = require("jsonwebtoken");
    const decoded: any = jwt.decode(token) || {};
    if (decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remaining = decoded.exp - now;
      if (remaining > 0) expiresInSeconds = Math.min(expiresInSeconds, remaining);
    }
  } catch (e) {
    // ignore decoding issues
  }
  const key = REVOKED_TOKEN_PREFIX + token;
  await redis.set(key, "1", "EX", expiresInSeconds);
}

export async function isTokenRevoked(token: string) {
  const key = REVOKED_TOKEN_PREFIX + token;
  const val = await redis.get(key);
  return !!val;
}

// IP blocklist helpers
const BLOCKED_IP_PREFIX = "ip:blocked:";

export async function blockIp(ip: string, ttlSeconds = 60 * 60 * 24) {
  const key = BLOCKED_IP_PREFIX + ip;
  await redis.set(key, "1", "EX", ttlSeconds);
}

export async function isIpBlocked(ip: string) {
  const key = BLOCKED_IP_PREFIX + ip;
  const val = await redis.get(key);
  return !!val;
}

