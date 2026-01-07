import prismaDefault from "../../../infra/database";
import type { Prisma } from "../../../generated/prisma";

export const ContractsRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.ContractCreateInput) => prisma.contract.create({ data }),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    prisma.contract.findMany({ where: { employeeId }, skip, take, orderBy: { startDate: "desc" } }),
  find: async (id: string) => prisma.contract.findUnique({ where: { id } }),
  update: async (id: string, data: Prisma.ContractUpdateInput) => prisma.contract.update({ where: { id }, data }),
  delete: async (id: string) => prisma.contract.delete({ where: { id } }),
});