import { InternalError, isDomainError } from "./errors.js";
import { mapPrismaError } from "./prisma.js";

export async function serviceGuard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (isDomainError(err)) {
      throw err;
    }
    const mapped = mapPrismaError(err);
    if (mapped) {
      throw mapped;
    }
    throw new InternalError();
  }
}
