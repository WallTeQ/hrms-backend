import { DepartmentsRepository } from "./repository.js";
import type { Prisma } from "@prisma/client";
import prismaDefault from "../../infra/database.js";
import { serviceGuard } from "../../common/domain/service.js";
import { ConflictError, NotFoundError, ValidationError } from "../../common/domain/errors.js";

const repo = DepartmentsRepository();

export const DepartmentsService = {
  create: async (data: Prisma.DepartmentCreateInput) =>
    serviceGuard(async () => {
      const managerId = (data as any)?.managerId;
      const managerEmail = (data as any)?.managerEmail;
      const payload: any = { ...data };

      if (managerEmail) {
        const manager = await prismaDefault.employee.findUnique({ where: { email: managerEmail } });
        if (!manager) throw new NotFoundError(`Manager with email ${managerEmail} not found`);
        payload.managerId = manager.id;
        delete payload.managerEmail;
      }

      if (payload.managerId) {
        const manager = await prismaDefault.employee.findUnique({ where: { id: payload.managerId } });
        if (!manager) {
          throw new NotFoundError(`Manager with id ${payload.managerId} not found`);
        }
      }

      try {
        return await repo.create(payload);
      } catch (error: any) {
        if (error.code === "P2002") {
          throw new ConflictError("Department name already exists", { field: "name" });
        }
        throw error;
      }
    }),

  find: async (id: string) => serviceGuard(async () => repo.findById(id)),

  update: async (id: string, data: Prisma.DepartmentUpdateInput) =>
    serviceGuard(async () => {
      const managerEmail = (data as any)?.managerEmail;
      const payload: any = { ...data };

      if (managerEmail) {
        const manager = await prismaDefault.employee.findUnique({ where: { email: managerEmail } });
        if (!manager) throw new NotFoundError(`Manager with email ${managerEmail} not found`);
        payload.managerId = manager.id;
        delete payload.managerEmail;
      }

      if (payload.managerId !== undefined && payload.managerId !== null) {
        if (payload.managerId) {
          const manager = await prismaDefault.employee.findUnique({ where: { id: payload.managerId } });
          if (!manager) throw new NotFoundError(`Manager with id ${payload.managerId} not found`);
        }
      }

      return repo.update(id, payload);
    }),

  delete: async (id: string) =>
    serviceGuard(async () => {
      const employeeCount = await prismaDefault.employee.count({ where: { departmentId: id } });
      if (employeeCount > 0) {
        throw new ValidationError(`Cannot delete department with ${employeeCount} assigned employees. Please reassign or remove employees first.`);
      }
      return repo.delete(id);
    }),
  list: async (skip = 0, take = 50) => serviceGuard(async () => repo.list(skip, take)),
  listEmployees: async (departmentId: string, skip = 0, take = 50) => serviceGuard(async () => repo.listEmployees(departmentId, skip, take)),

  getDepartmentStats: async () =>
    serviceGuard(async () => {
      const departments = await prismaDefault.department.findMany({
        include: {
          _count: {
            select: { employees: true },
          },
        },
      });

      return departments.map((dept: any) => ({
        id: dept.id,
        name: dept.name,
        employeeCount: dept._count.employees,
      }));
    }),
};