import { Prisma } from "@prisma/client";
import { ShiftsRepository } from "./repository.js";
import { serviceGuard } from "../../common/domain/service.js";
import { ConflictError } from "../../common/domain/errors.js";

const repo = ShiftsRepository();

export const ShiftsService = {
  create: async (data: Prisma.ShiftCreateInput) =>
    serviceGuard(async () => {
      try {
        return await repo.create(data);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictError("Shift already exists", { field: "name" });
        }
        throw error;
      }
    }),
  getById: async (id: string) => serviceGuard(async () => repo.findById(id)),
  update: async (id: string, data: Prisma.ShiftUpdateInput) => serviceGuard(async () => repo.update(id, data)),
  delete: async (id: string) => serviceGuard(async () => repo.delete(id)),
  list: async (skip = 0, take = 50) => serviceGuard(async () => repo.list(skip, take)),
};
