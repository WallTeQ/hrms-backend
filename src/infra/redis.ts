import IORedis, { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI;
let client: Redis;

// Prefer using REDIS_URL/REDIS_URI. If missing, fall back to host/port object form for local dev.
if (redisUrl) {
  if (process.env.REDIS_TLS === "true" && redisUrl.startsWith("redis://")) {
    const tlsUrl = redisUrl.replace(/^redis:\/\//, "rediss://");
    client = new IORedis(tlsUrl);
  } else {
    client = new IORedis(redisUrl);
  }
} else {
  client = new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
  });
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

// Delete keys by prefix (use with caution in production; KEYS can be expensive)
export async function cacheDelByPrefix(prefix: string) {
  const pattern = `${prefix}*`;
  const keys = await redis.keys(pattern);
  if (keys.length === 0) return 0;
  return redis.del(...keys);
}

export default redis;
