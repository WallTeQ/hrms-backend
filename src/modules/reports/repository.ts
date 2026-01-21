import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const ReportsRepository = (prisma = prismaDefault) => ({
  attendanceSummary: async (startDate: Date, endDate: Date) => {
    const statuses = ["PRESENT", "ABSENT", "LATE"] as const;
    const results = await Promise.all(
      statuses.map((status) =>
        prisma.attendance.count({ where: { date: { gte: startDate, lte: endDate }, status } })
      )
    );
    return statuses.reduce((acc, s, i) => ({ ...acc, [s]: results[i] }), {} as Record<string, number>);
  },

  payrollSummary: async (period: string) => {
    const totals = await prisma.payslip.aggregate({
      where: { payrollRun: { period } },
      _sum: { gross: true, net: true },
      _count: { id: true },
    });
    return totals;
  },

  headcount: async () => {
    const total = await prisma.employee.count();
    const byStatus = await Promise.all([
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.employee.count({ where: { status: "INACTIVE" } }),
      prisma.employee.count({ where: { status: "SUSPENDED" } }),
      prisma.employee.count({ where: { status: "PROBATION" } }),
    ]);
    return {
      total,
      ACTIVE: byStatus[0],
      INACTIVE: byStatus[1],
      SUSPENDED: byStatus[2],
      PROBATION: byStatus[3],
    };
  },
});