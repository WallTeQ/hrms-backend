import { ContractsRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";

const repo = ContractsRepository();

export const ContractsService = {
  create: async (data: Prisma.ContractCreateInput) => {
    const createData: any = { ...data };
    // Convert date strings to Date objects for Prisma
    if (typeof (createData as any).startDate === 'string') {
      (createData as any).startDate = new Date((createData as any).startDate);
    }
    if (typeof (createData as any).endDate === 'string') {
      (createData as any).endDate = (createData as any).endDate ? new Date((createData as any).endDate) : undefined;
    }
    return repo.create(createData as Prisma.ContractCreateInput);
  },
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => repo.listForEmployee(employeeId, skip, take),
  find: async (id: string) => repo.find(id),
  update: async (id: string, data: Prisma.ContractUpdateInput) => {
    const updateData: any = { ...data };
    if (typeof (updateData as any).startDate === 'string') {
      (updateData as any).startDate = new Date((updateData as any).startDate);
    }
    if (typeof (updateData as any).endDate === 'string') {
      (updateData as any).endDate = (updateData as any).endDate ? new Date((updateData as any).endDate) : undefined;
    }
    return repo.update(id, updateData as Prisma.ContractUpdateInput);
  },
  delete: async (id: string) => repo.delete(id),
  listFailed: async (skip = 0, take = 50) => repo.listFailed(skip, take),
};