import type { RequestHandler } from "express";
import { cacheGet, cacheSet } from "../infra/redis.js";

// Simple caching middleware keyed by request URL and query string
export function cacheResponse(ttlSeconds = 60): RequestHandler {
  return async (req, res, next) => {
    const key = `cache:${req.method}:${req.originalUrl}`;
    try {
      const cached = await cacheGet<any>(key);
      if (cached !== null) {
        return res.json(cached);
      }

      // capture res.json to store the response
      const origJson = res.json.bind(res);
      res.json = (body: any) => {
        // fire-and-forget cache set to keep this function synchronous and matching Express types
        cacheSet(key, body, ttlSeconds).catch(() => {});
        return origJson(body);
      };

      return next();
    } catch (err) {
      // on error, continue without cache
      return next();
    }
  };
}
