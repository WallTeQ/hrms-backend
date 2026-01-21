import prismaDefault from "../../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const DisciplinaryRecordsRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.DisciplinaryRecordCreateInput) => prisma.disciplinaryRecord.create({ data }),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) => {
    const items = await prisma.disciplinaryRecord.findMany({ where: { employeeId }, skip, take, orderBy: { date: "desc" } });
    const total = await prisma.disciplinaryRecord.count({ where: { employeeId } });
    return { items, total };
  },
  find: async (id: string) => prisma.disciplinaryRecord.findUnique({ where: { id } }),
  update: async (id: string, data: Prisma.DisciplinaryRecordUpdateInput) =>
    prisma.disciplinaryRecord.update({ where: { id }, data }),
  delete: async (id: string) => prisma.disciplinaryRecord.delete({ where: { id } }),
});
