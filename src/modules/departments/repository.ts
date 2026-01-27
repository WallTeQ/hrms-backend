import prismaDefault from "../../infra/database.js";
import type { Prisma } from "@prisma/client";

export const DepartmentsRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.DepartmentCreateInput) => prisma.department.create({ data }),
  findById: async (id: string) => prisma.department.findUnique({ where: { id }, include: { manager: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { employees: true } } } }),
  update: async (id: string, data: Prisma.DepartmentUpdateInput) => prisma.department.update({ where: { id }, data }),
  delete: async (id: string) => prisma.department.delete({ where: { id } }),
  list: async (skip = 0, take = 50) => {
    const [items, total] = await Promise.all([
      prisma.department.findMany({ skip, take, orderBy: { createdAt: "desc" }, include: { manager: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { employees: true } } } }),
      prisma.department.count(),
    ]);
    return { items, total };
  },

  listEmployees: async (departmentId: string, skip = 0, take = 50) => {
    const [items, total] = await Promise.all([
      prisma.employee.findMany({ where: { departmentId }, skip, take, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, email: true } }),
      prisma.employee.count({ where: { departmentId } }),
    ]);
    return { items, total };
  },
});