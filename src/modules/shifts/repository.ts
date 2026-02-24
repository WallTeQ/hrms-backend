import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const ShiftsRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.ShiftCreateInput) => prisma.shift.create({ data }),
  findById: async (id: string) => prisma.shift.findUnique({ where: { id } }),
  update: async (id: string, data: Prisma.ShiftUpdateInput) => prisma.shift.update({ where: { id }, data }),
  delete: async (id: string) => prisma.shift.delete({ where: { id } }),
  list: async (skip = 0, take = 50) => {
    const items = await prisma.shift.findMany({ skip, take, orderBy: { createdAt: "desc" } });
    const total = await prisma.shift.count();
    return { items, total };
  },
});
