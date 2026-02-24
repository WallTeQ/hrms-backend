export type DomainErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PRECONDITION"
  | "INTERNAL";

export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: DomainErrorCode, status: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION", 400, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "NOT_FOUND", 404, details);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFLICT", 409, details);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "UNAUTHORIZED", 401, details);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "FORBIDDEN", 403, details);
  }
}

export class PreconditionError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "PRECONDITION", 412, details);
  }
}

export class InternalError extends DomainError {
  constructor(message: string = "Internal Server Error", details?: Record<string, unknown>) {
    super(message, "INTERNAL", 500, details);
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}
