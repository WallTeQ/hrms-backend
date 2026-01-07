import { DisciplinaryRecordsRepository } from "./repository";
import type { Prisma } from "../../../generated/prisma";

const repo = DisciplinaryRecordsRepository();

export const DisciplinaryRecordsService = {
  create: async (data: Prisma.DisciplinaryRecordCreateInput) => repo.create(data),
  listForEmployee: async (employeeId: string) => repo.listForEmployee(employeeId),
  find: async (id: string) => repo.find(id),
  update: async (id: string, data: Prisma.DisciplinaryRecordUpdateInput) => repo.update(id, data),
  delete: async (id: string) => repo.delete(id),
};
