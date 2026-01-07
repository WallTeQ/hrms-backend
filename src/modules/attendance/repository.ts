import prismaDefault from "../../infra/database";
import type { Prisma } from "../../generated/prisma";

export type AttendanceFilters = {
  employeeId?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
};

export const AttendanceRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.AttendanceCreateInput) =>
    prisma.attendance.create({ data }),

  findById: async (id: string) =>
    prisma.attendance.findUnique({ where: { id } }),

  list: async (filters: AttendanceFilters = {}) => {
    const { employeeId, startDate, endDate, skip = 0, take = 100 } = filters;
    return prisma.attendance.findMany({
      where: {
        AND: [
          employeeId ? { employeeId } : {},
          startDate && endDate
            ? { date: { gte: startDate, lte: endDate } }
            : startDate
            ? { date: { gte: startDate } }
            : endDate
            ? { date: { lte: endDate } }
            : {},
        ],
      },
      skip,
      take,
      orderBy: { date: "desc" },
    });
  },

  update: async (id: string, data: Prisma.AttendanceUpdateInput) =>
    prisma.attendance.update({ where: { id }, data }),

  delete: async (id: string) => prisma.attendance.delete({ where: { id } }),

  mark: async (employeeId: string, date: Date, status: Prisma.AttendanceStatus) =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findFirst({ where: { employeeId, date } });
      if (existing) {
        return tx.attendance.update({ where: { id: existing.id }, data: { status } });
      }
      return tx.attendance.create({ data: { employeeId, date, status } });
    }),
});