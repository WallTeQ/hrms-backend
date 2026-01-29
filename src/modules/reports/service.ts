import { ReportsRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";

const repo = ReportsRepository();

export const ReportsService = {
  attendanceSummary: async (startDate: Date, endDate: Date) => repo.attendanceSummary(startDate, endDate),
  payrollSummary: async (period: string) => repo.payrollSummary(period),
  headcount: async () => repo.headcount(),

  dashboardStats: async () => {
    const [
      totalEmployees,
      activeEmployees,
      pendingLeaves,
      expiringDocuments,
      departmentCount,
      newHiresThisMonth,
    ] = await Promise.all([
      repo.getTotalEmployees(),
      repo.getActiveEmployees(),
      repo.getPendingLeaves(),
      repo.getExpiringDocuments(),
      repo.getDepartmentCount(),
      repo.getNewHiresThisMonth(),
    ]);

    return {
      totalEmployees,
      activeEmployees,
      pendingLeaves,
      expiringDocuments,
      departmentCount,
      newHiresThisMonth,
    };
  },
};