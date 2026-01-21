import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL
let client: Redis;

// Prefer using REDIS_URL/REDIS_URI. If missing, fall back to host/port object form for local dev.
if (redisUrl) {
  if (process.env.REDIS_TLS === "true" && redisUrl.startsWith("redis://")) {
    const tlsUrl = redisUrl.replace(/^redis:\/\//, "rediss://");
    client = new Redis(tlsUrl);
  } else {
    client = new Redis(redisUrl);
  }
} else {
  client = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
  });
}

// BullMQ requires Redis option `maxRetriesPerRequest` to be null. Ensure it's set for compatibility.
try {
  if ((client as any).options) {
    (client as any).options.maxRetriesPerRequest = null;
  } else {
    (client as any).options = { maxRetriesPerRequest: null };
  }
} catch (e) {
  // ignore in environments where options may be read-only
}

export const redis = client;

// OTP helpers
const OTP_PREFIX = "signup:otp:";
const VERIFIED_PREFIX = "signup:verified:";

export async function setSignupOtp(email: string, otp: string, ttlSeconds = 300) {
  const key = OTP_PREFIX + email.toLowerCase();
  await redis.set(key, otp, "EX", ttlSeconds);
}

export async function getSignupOtp(email: string) {
  const key = OTP_PREFIX + email.toLowerCase();
  return redis.get(key);
}

export async function deleteSignupOtp(email: string) {
  const key = OTP_PREFIX + email.toLowerCase();
  await redis.del(key);
}

export async function markSignupVerified(email: string, ttlSeconds = 900) {
  const key = VERIFIED_PREFIX + email.toLowerCase();
  await redis.set(key, "1", "EX", ttlSeconds);
}

export async function isSignupVerified(email: string) {
  const key = VERIFIED_PREFIX + email.toLowerCase();
  const val = await redis.get(key);
  return !!val;
}

export async function deleteSignupVerified(email: string) {
  const key = VERIFIED_PREFIX + email.toLowerCase();
  await redis.del(key);
}

// Password reset OTP helpers
const RESET_OTP_PREFIX = "reset:otp:";
const RESET_VERIFIED_PREFIX = "reset:verified:";

export async function setPasswordResetOtp(email: string, otp: string, ttlSeconds = 300) {
  const key = RESET_OTP_PREFIX + email.toLowerCase();
  await redis.set(key, otp, "EX", ttlSeconds);
}

export async function getPasswordResetOtp(email: string) {
  const key = RESET_OTP_PREFIX + email.toLowerCase();
  return redis.get(key);
}

export async function deletePasswordResetOtp(email: string) {
  const key = RESET_OTP_PREFIX + email.toLowerCase();
  await redis.del(key);
}

export async function markPasswordResetVerified(email: string, ttlSeconds = 900) {
  const key = RESET_VERIFIED_PREFIX + email.toLowerCase();
  await redis.set(key, "1", "EX", ttlSeconds);
}

export async function isPasswordResetVerified(email: string) {
  const key = RESET_VERIFIED_PREFIX + email.toLowerCase();
  const val = await redis.get(key);
  return !!val;
}

export async function deletePasswordResetVerified(email: string) {
  const key = RESET_VERIFIED_PREFIX + email.toLowerCase();
  await redis.del(key);
}

// Generic cache helpers
export async function cacheSet(key: string, value: unknown, ttlSeconds = 60) {
  const payload = JSON.stringify(value);
  if (ttlSeconds > 0) {
    await redis.set(key, payload, "EX", ttlSeconds);
  } else {
    await redis.set(key, payload);
  }
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  const val = await redis.get(key);
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch (e) {
    return null;
  }
}

export async function cacheDel(key: string) {
  return redis.del(key);
}

// Convenience: wrap async fn with cache
export async function cacheWrap<T = any>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const result = await fn();
  await cacheSet(key, result, ttlSeconds);
  return result;
}

// Delete keys by prefix using SCAN + UNLINK (non-blocking delete) for production safety
export async function cacheDelByPrefix(prefix: string) {
  const pattern = `${prefix}*`;
  const keys: string[] = [];

  // Use SCAN to iterate keys in batches instead of KEYS (which blocks Redis)
  let cursor = "0";
  do {
    const res = await redis.scan(cursor, "MATCH", pattern, "COUNT", "1000");
    cursor = res[0];
    keys.push(...res[1]);
  } while (cursor !== "0");

  if (keys.length === 0) return 0;

  // Use UNLINK if available (non-blocking removal), fall back to DEL
  const BATCH = 500;
  let deleted = 0;
  for (let i = 0; i < keys.length; i += BATCH) {
    const batch = keys.slice(i, i + BATCH);
    try {
      if ((redis as any).unlink) {
        deleted += await (redis as any).unlink(...batch);
      } else {
        deleted += await redis.del(...batch);
      }
    } catch (e) {
      // ignore individual batch failures but continue
    }
  }
  return deleted;
}

export default redis;
