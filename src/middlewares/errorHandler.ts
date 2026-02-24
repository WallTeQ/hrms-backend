import type { ErrorRequestHandler } from "express";
import { mapErrorToHttp } from "../common/domain/errorMapping.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Log minimal info
  // eslint-disable-next-line no-console
  console.error(err);
  const mapped = mapErrorToHttp(err);
  const payload: { error: string; code?: string; details?: Record<string, unknown> } = {
    error: mapped.message,
  };
  if (mapped.code) payload.code = mapped.code;
  if (mapped.details) payload.details = mapped.details;
  res.status(mapped.status).json(payload);
};
