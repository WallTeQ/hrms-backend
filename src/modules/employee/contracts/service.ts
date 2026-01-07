import { ContractsRepository } from "./repository";
import type { Prisma } from "../../../generated/prisma";

const repo = ContractsRepository();

export const ContractsService = {
  create: async (data: Prisma.ContractCreateInput) => repo.create(data),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => repo.listForEmployee(employeeId, skip, take),
  find: async (id: string) => repo.find(id),
  update: async (id: string, data: Prisma.ContractUpdateInput) => repo.update(id, data),
  delete: async (id: string) => repo.delete(id),
};