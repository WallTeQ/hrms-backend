import { InternalError, isDomainError } from "./errors.js";

export type HttpErrorPayload = {
  status: number;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
};

export function mapErrorToHttp(err: unknown): HttpErrorPayload {
  if (isDomainError(err)) {
    return {
      status: err.status,
      message: err.message,
      code: err.code,
      details: err.details,
    };
  }

  const fallback = new InternalError();
  return { status: fallback.status, message: fallback.message, code: fallback.code };
}
