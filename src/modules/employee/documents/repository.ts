import prismaDefault from "../../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const DocumentsRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.DocumentCreateInput) => prisma.document.create({ data }),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => {
    const items = await prisma.document.findMany({ where: { employeeId }, skip, take, orderBy: { createdAt: "desc" } });
    const total = await prisma.document.count({ where: { employeeId } });
    return { items, total };
  },
  find: async (id: string) => prisma.document.findUnique({ where: { id } }),
  delete: async (id: string) => prisma.document.delete({ where: { id } }),
  listExpiring: async (withinDays: number = 30) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    return prisma.document.findMany({ where: { expiresAt: { lte: cutoff } }, orderBy: { expiresAt: "asc" } });
  },
});