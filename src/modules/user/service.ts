import { UserRepository } from "./repository.js";
import type { Prisma, Role } from ".prisma/client";
import prisma from "../../infra/database.js";
import bcrypt from "bcryptjs";
import { serviceGuard } from "../../common/domain/service.js";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../common/domain/errors.js";
import { generateEmployeeId } from "../../common/employeeId.js";

const repo = UserRepository();

export const UserService = {
  getById: async (id: string, actor?: { id?: string; role?: string }) =>
    serviceGuard(async () => {
      if (!actor?.role) {
        throw new ForbiddenError("Access denied");
      }

      switch (actor.role) {
        case "EMPLOYEE":
        case "DEPARTMENT_HEAD":
        case "PAYROLL_OFFICER":
          if (actor.id !== id) {
            throw new ForbiddenError("Access denied");
          }
          break;
        case "HR_ADMIN":
        case "SUPER_ADMIN":
          break;
        default:
          throw new ForbiddenError("Access denied");
      }

      const user = await repo.findById(id);
      if (!user) throw new NotFoundError("User not found", { userId: id });
      return user;
    }),

  createUser: async (payload: {
    email: string;
    password: string;
    role?: string;
    firstName?: string;
    lastName?: string;
  }) =>
    serviceGuard(async () => {
      if (!payload.email || !payload.password) {
        throw new ValidationError("Email and password are required");
      }

      const hashed = await bcrypt.hash(payload.password, 10);
      try {
        if (payload.firstName || payload.lastName) {
          return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            let employeeId: string | undefined;
            for (let attempt = 0; attempt < 5; attempt++) {
              const nextId = await generateEmployeeId(tx);
              try {
                const employee = await tx.employee.create({
                  data: {
                    id: nextId,
                    firstName: payload.firstName || "",
                    lastName: payload.lastName || "",
                    email: payload.email,
                  },
                });
                employeeId = employee.id;
                break;
              } catch (err: any) {
                if (err?.code === "P2002") continue;
                throw err;
              }
            }
            if (!employeeId) throw new ConflictError("Failed to generate a unique employee ID");
            return tx.user.create({
              data: {
                id: employeeId,
                email: payload.email,
                password: hashed,
                role: payload.role as Role | undefined,
              },
            });
          });
        }

        throw new ValidationError("firstName and lastName are required to create a user");
      } catch (err: any) {
        if (err?.code === "P2002") {
          throw new ConflictError("Email already exists", { field: "email" });
        }
        throw err;
      }
    }),

  updateUser: async (
    id: string,
    data: Prisma.UserUpdateInput & { firstName?: string; lastName?: string },
    actor?: { id?: string; role?: string }
  ) =>
    serviceGuard(async () => {
      const existing = await repo.findById(id);
      if (!existing) throw new NotFoundError("User not found", { userId: id });

      if ((data as any).role && (data as any).role !== existing.role) {
        if (!actor?.role || (actor.role !== "HR_ADMIN" && actor.role !== "SUPER_ADMIN")) {
          throw new ForbiddenError("Only HR_ADMIN or SUPER_ADMIN can change roles");
        }
      }

      const { firstName, lastName, ...userPayload } = data as any;
      const prismaData: any = { ...userPayload };

      if (firstName || lastName) {
        if (existing.employee) {
          prismaData.employee = prismaData.employee || {};
          prismaData.employee.update = { ...(firstName ? { firstName } : {}), ...(lastName ? { lastName } : {}) };
        } else {
          prismaData.employee = prismaData.employee || {};
          prismaData.employee.create = { ...(firstName ? { firstName } : {}), ...(lastName ? { lastName } : {}), email: existing.email || (data as any).email };
        }
      }

      const updated = await repo.update(id, prismaData);

      if ((data as any).role && (data as any).role !== existing.role && actor?.id) {
        await prisma.auditLog.create({
          data: {
            actorId: actor.id,
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
    }),

  list: async (skip = 0, take = 50, actor?: { id?: string; role?: string }) =>
    serviceGuard(async () => {
      if (!actor?.role) {
        throw new ForbiddenError("Access denied");
      }
      switch (actor.role) {
        case "HR_ADMIN":
        case "SUPER_ADMIN":
          break;
        case "EMPLOYEE":
        case "DEPARTMENT_HEAD":
        case "PAYROLL_OFFICER":
          return { items: [], total: 0 };
        default:
          throw new ForbiddenError("Access denied");
      }
      return repo.list(skip, take);
    }),

  delete: async (id: string) => serviceGuard(async () => repo.delete(id)),
};