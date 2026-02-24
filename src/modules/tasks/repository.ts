import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const TasksRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.TaskCreateInput) => prisma.task.create({ data }),
  findById: async (id: string) => prisma.task.findUnique({ where: { id } }),
  update: async (id: string, data: Prisma.TaskUpdateInput) => prisma.task.update({ where: { id }, data }),
  delete: async (id: string) => prisma.task.delete({ where: { id } }),
  list: async (filters: { employeeId?: string; departmentId?: string; status?: string; skip?: number; take?: number } = {}) => {
    const { employeeId, departmentId, status, skip = 0, take = 50 } = filters;
    const where: Prisma.TaskWhereInput = {
      AND: [
        employeeId ? { employeeId } : {},
        departmentId ? { departmentId } : {},
        status ? { status: status as any } : {},
      ],
    };

    const items = await prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        department: { select: { id: true, name: true } },
        skill: { select: { id: true, name: true } },
      },
    });
    const total = await prisma.task.count({ where });
    return { items, total };
  },
});
