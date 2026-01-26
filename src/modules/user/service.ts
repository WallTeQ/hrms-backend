import { UserRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";
import prisma from "../../infra/database.js";

const repo = UserRepository();

export const UserService = {
  getById: async (id: string, user?: any) => repo.findById(id, user),

  createUser: async (payload: Prisma.UserCreateInput) => {
    // Hashing should be handled by controller/service caller; assume password already hashed
    return repo.create(payload as any);
  },

  updateUser: async (id: string, data: Prisma.UserUpdateInput, actorId?: string, employeeData?: { firstName?: string; lastName?: string }) => {
    const existing = await repo.findById(id);
    if (!existing) return null;

    // Normalize data: if an employeeId is provided, convert to nested connect
    const prismaData: any = { ...data };
    if ((prismaData as any).employeeId) {
      prismaData.employee = { connect: { id: (prismaData as any).employeeId } };
      delete prismaData.employeeId;
    }

    // Handle employee name updates via nested update/create
    if (employeeData && (employeeData.firstName || employeeData.lastName)) {
      if (existing.employeeId) {
        prismaData.employee = prismaData.employee || {};
        prismaData.employee.update = { ...(employeeData as any) };
      } else {
        // create a new employee record and associate it
        prismaData.employee = prismaData.employee || {};
        prismaData.employee.create = { ...(employeeData as any), email: existing.email || (data as any).email };
      }
    }

    const updated = await repo.update(id, prismaData);

    // Audit role change
    if ((data as any).role && (data as any).role !== existing.role && actorId) {
      await prisma.auditLog.create({
        data: {
          actorId,
          action: "ROLE_CHANGE",
          entity: "User",
          entityId: id,
          details: {
            from: existing.role,
            to: (data as any).role,
          },
        },
      });
    }

    return updated;
  },

  list: async (skip = 0, take = 50, user?: any) => repo.list(skip, take, user),

  delete: async (id: string) => repo.delete(id),
};