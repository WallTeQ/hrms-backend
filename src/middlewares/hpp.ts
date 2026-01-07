import type { RequestHandler } from "express";

// Simple HPP protection: convert array query params to first value unless explicitly allowed
export function hpp(whitelist: string[] = []): RequestHandler {
  return (req, _res, next) => {
    const q: any = req.query || {};
    for (const k of Object.keys(q)) {
      if (Array.isArray(q[k]) && !whitelist.includes(k)) {
        q[k] = q[k][0];
      }
    }
    req.query = q;
    next();
  };
}
