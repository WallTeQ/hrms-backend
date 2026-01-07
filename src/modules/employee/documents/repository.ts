import prismaDefault from "../../../infra/database";
import type { Prisma } from "../../../generated/prisma";

export const DocumentsRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.DocumentCreateInput) => prisma.document.create({ data }),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    prisma.document.findMany({ where: { employeeId }, skip, take, orderBy: { createdAt: "desc" } }),
  find: async (id: string) => prisma.document.findUnique({ where: { id } }),
  delete: async (id: string) => prisma.document.delete({ where: { id } }),
  listExpiring: async (withinDays: number = 30) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    return prisma.document.findMany({ where: { expiresAt: { lte: cutoff } }, orderBy: { expiresAt: "asc" } });
  },
});