import { DocumentsRepository } from "./repository";
import type { Prisma } from "../../../generated/prisma";

const repo = DocumentsRepository();

export const DocumentsService = {
  create: async (data: Prisma.DocumentCreateInput) => repo.create(data),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => repo.listForEmployee(employeeId, skip, take),
  find: async (id: string) => repo.find(id),
  delete: async (id: string) => repo.delete(id),
  listExpiring: async (withinDays = 30) => repo.listExpiring(withinDays),
};