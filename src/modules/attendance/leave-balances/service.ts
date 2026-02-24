import { prisma as defaultPrisma } from "../../../infra/database.js";
import type { Prisma } from ".prisma/client";
import { serviceGuard } from "../../../common/domain/service.js";

const prisma = defaultPrisma as any;

export const LeaveBalanceService = {
  getForEmployee: async (employeeId: string, year: number) =>
    serviceGuard(async () => prisma.leaveBalance.findFirst({ where: { employeeId, year } })),
  upsertBalance: async (employeeId: string, year: number, balance: number) =>
    serviceGuard(async () =>
      prisma.leaveBalance.upsert({
        where: { employeeId_year: { employeeId, year } } as any,
        update: { balance },
        create: { employeeId, year, balance },
      })
    ),
  listForYear: async (year: number, skip = 0, take = 50) => serviceGuard(async () => prisma.leaveBalance.findMany({ where: { year }, skip, take })),
  deleteBalance: async (id: string) => serviceGuard(async () => prisma.leaveBalance.delete({ where: { id } })),
};
