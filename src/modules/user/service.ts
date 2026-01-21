import { UserRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";
import prisma from "../../infra/database.js";

const repo = UserRepository();

export const UserService = {
  getById: async (id: string, user?: any) => repo.findById(id, user),

  updateUser: async (id: string, data: Prisma.UserUpdateInput, actorId?: string) => {
    const existing = await repo.findById(id);
    if (!existing) return null;

    const updated = await repo.update(id, data);

    // Audit role change
    if (data.role && data.role !== existing.role && actorId) {
      await prisma.auditLog.create({
        data: {
          actorId,
          action: "ROLE_CHANGE",
          entity: "User",
          entityId: id,
          details: {
            from: existing.role,
            to: data.role,
          },
        },
      });
    }

    return updated;
  },

  list: async (skip = 0, take = 50, user?: any) => repo.list(skip, take, user),

  delete: async (id: string) => repo.delete(id),
};