import type { RequestHandler } from "express";
import { z } from "zod";

export function validate<T extends z.ZodType<any, any, any>>(schema: T): RequestHandler {
  return (req, res, next) => {
    // Normalize multipart single-key JSON payloads (e.g., FormData with JSON string)
    try {
      const ct = (req.headers["content-type"] || "").toString();
      if (ct.startsWith("multipart/form-data") && req.body && typeof req.body === "object") {
        const keys = Object.keys(req.body);
        if (keys.length === 1) {
          const onlyVal = (req.body as any)[keys[0]];
          if (typeof onlyVal === "string") {
            const trimmed = onlyVal.trim();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              const parsed = JSON.parse(onlyVal);
              req.body = parsed;
            }
          }
        }
      }
    } catch (e) {
      // ignore and let schema validation report errors
    }

    const result = schema.safeParse(req.body);
    if (!result.success) {
      // Flatten Zod issues into simple single-line messages for easier client consumption
      const messages = result.error.issues.map((issue) => {
        const path = issue.path && issue.path.length ? issue.path.join(".") : "body";
        return `${path}: ${issue.message}`;
      });
      return res.status(400).json({ error: "Validation failed", messages });
    }
    // replace body with parsed/validated data
    req.body = result.data;
    return next();
  };
}