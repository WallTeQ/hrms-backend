import prismaDefault from "../../../infra/database";
import type { Prisma } from "../../../generated/prisma";

export const DisciplinaryRecordsRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.DisciplinaryRecordCreateInput) => prisma.disciplinaryRecord.create({ data }),
  listForEmployee: async (employeeId: string) =>
    prisma.disciplinaryRecord.findMany({ where: { employeeId }, orderBy: { date: "desc" } }),
  find: async (id: string) => prisma.disciplinaryRecord.findUnique({ where: { id } }),
  update: async (id: string, data: Prisma.DisciplinaryRecordUpdateInput) =>
    prisma.disciplinaryRecord.update({ where: { id }, data }),
  delete: async (id: string) => prisma.disciplinaryRecord.delete({ where: { id } }),
});
