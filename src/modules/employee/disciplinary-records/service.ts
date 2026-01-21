import { DisciplinaryRecordsRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";

const repo = DisciplinaryRecordsRepository();

function toDateIfString(val: any) {
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return val;
}

export const DisciplinaryRecordsService = {
  create: async (data: Prisma.DisciplinaryRecordCreateInput) => {
    const payload = { ...(data as any) };
    if (payload.date) payload.date = toDateIfString(payload.date);
    return repo.create(payload);
  },
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => repo.listForEmployee(employeeId, skip, take),
  find: async (id: string) => repo.find(id),
  update: async (id: string, data: Prisma.DisciplinaryRecordUpdateInput) => {
    const payload = { ...(data as any) };
    if (payload.date) payload.date = toDateIfString(payload.date);
    return repo.update(id, payload);
  },
  delete: async (id: string) => repo.delete(id),
};
