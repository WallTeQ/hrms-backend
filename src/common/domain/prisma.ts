import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "./errors.js";

export function mapPrismaError(err: unknown) {
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError("Invalid request data");
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = err.meta?.target as any;
      if (Array.isArray(target) && target.includes("email")) {
        return new ConflictError("Email already exists", { target });
      }
      return new ConflictError("Resource already exists", { target });
    }
    if (err.code === "P2025") {
      return new NotFoundError("Record not found");
    }
    if (err.code === "P2003") {
      return new ValidationError("Invalid foreign key reference", { field: err.meta?.field_name as any });
    }
    if (err.code === "P2000") {
      return new ValidationError("Value too long for column", { column: err.meta?.column_name as any });
    }
  }
  return null;
}
