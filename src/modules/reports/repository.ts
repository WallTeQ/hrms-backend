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
    const departmentCount = await prisma.department.count();
    return {
      total,
      ACTIVE: byStatus[0],
      INACTIVE: byStatus[1],
      SUSPENDED: byStatus[2],
      PROBATION: byStatus[3],
      departmentCount,
    };
  },

  getTotalEmployees: async () => {
    return prisma.employee.count();
  },

  getActiveEmployees: async () => {
    return prisma.employee.count({ where: { status: "ACTIVE" } });
  },

  getPendingLeaves: async () => {
    // This would need a leave requests table - for now return 0
    return 0;
  },

  getExpiringDocuments: async () => {
    // This would need document expiry tracking - for now return 0
    return 0;
  },

  getDepartmentCount: async () => {
    return prisma.department.count();
  },

  getNewHiresThisMonth: async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return prisma.employee.count({
      where: {
        hireDate: {
          gte: startOfMonth,
        },
      },
    });
  },
});