import { prisma as defaultPrisma } from "../../../infra/database.js";
import type { Prisma } from ".prisma/client";

const prisma = defaultPrisma as any;

export const LeaveBalanceService = {
  getForEmployee: async (employeeId: string, year: number) =>
    prisma.leaveBalance.findFirst({ where: { employeeId, year } }),
  upsertBalance: async (employeeId: string, year: number, balance: number) =>
    prisma.leaveBalance.upsert({
      where: { employeeId_year: { employeeId, year } } as any,
      update: { balance },
      create: { employeeId, year, balance },
    }),
  listForYear: async (year: number, skip = 0, take = 50) => prisma.leaveBalance.findMany({ where: { year }, skip, take }),
  deleteBalance: async (id: string) => prisma.leaveBalance.delete({ where: { id } }),
};
