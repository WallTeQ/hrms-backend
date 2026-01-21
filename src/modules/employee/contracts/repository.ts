import prismaDefault from "../../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const ContractsRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.ContractCreateInput) => prisma.contract.create({ data }),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => {
    const items = await prisma.contract.findMany({ where: { employeeId }, skip, take, orderBy: { startDate: "desc" } });
    const total = await prisma.contract.count({ where: { employeeId } });
    return { items, total };
  },
  find: async (id: string) => prisma.contract.findUnique({ where: { id } }),
  update: async (id: string, data: Prisma.ContractUpdateInput) => prisma.contract.update({ where: { id }, data }),
  delete: async (id: string) => prisma.contract.delete({ where: { id } }),
  listFailed: async (skip = 0, take = 50) => {
    const items = await prisma.contract.findMany({ where: { uploadStatus: 'FAILED' }, skip, take, orderBy: { createdAt: 'desc' } });
    const total = await prisma.contract.count({ where: { uploadStatus: 'FAILED' } });
    return { items, total };
  },
});