import prismaDefault from "../../infra/database.js";
import type { Prisma, AttendanceStatus } from ".prisma/client";

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
    const items = await prisma.attendance.findMany({
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
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      skip,
      take,
      orderBy: { date: "desc" },
    });
    const total = await prisma.attendance.count({
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
    });
    return { items, total };
  },

  update: async (id: string, data: Prisma.AttendanceUpdateInput) =>
    prisma.attendance.update({ where: { id }, data }),

  delete: async (id: string) => prisma.attendance.delete({ where: { id } }),

  mark: async (
    employeeId: string,
    date: Date,
    status?: AttendanceStatus,
    clockIn?: Date,
    clockOut?: Date,
    extraData?: Prisma.AttendanceUpdateInput
  ) => {
    // Normalize date to start of day for consistent comparison
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const existing = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: normalizedDate,
          lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
      },
    });
    const data: any = { ...(extraData || {}) };
    if (status !== undefined) data.status = status;
    if (clockIn) data.clockIn = clockIn;
    if (clockOut) data.clockOut = clockOut;
    if (existing) {
      return prisma.attendance.update({ where: { id: existing.id }, data });
    }
    // Creation expects status to be present (service ensures this)
    return prisma.attendance.create({ data: { employeeId, date: normalizedDate, ...data } });
  },
});