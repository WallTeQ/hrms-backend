import type { RequestHandler } from "express";

// Reject multipart uploads larger than MAX_UPLOAD_BYTES
export function uploadGuard(maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024)): RequestHandler {
  return (req, res, next) => {
    try {
      const ct = (req.headers["content-type"] || "").toString();
      if (ct.startsWith("multipart/form-data")) {
        const cl = Number(req.headers["content-length"] || 0);
        if (cl && cl > maxBytes) return res.status(413).json({ error: "Payload too large" });
      }
    } catch (e) {
      // ignore
    }
    next();
  };
}
