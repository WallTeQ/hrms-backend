import type { RequestHandler } from "express";

function sanitizeString(s: string) {
  // Very small sanitizer: escape angle brackets to mitigate simple XSS injection in stored fields
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === "object") {
    const out: any = {};
    for (const k of Object.keys(obj)) out[k] = sanitizeObject(obj[k]);
    return out;
  }
  return obj;
}

export const sanitizeBody: RequestHandler = (req, res, next) => {
  try {
    if (req.body && typeof req.body === "object") req.body = sanitizeObject(req.body);
  } catch (e) {
    // ignore
  }
  next();
};
