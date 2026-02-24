import { ReportsRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";
import { serviceGuard } from "../../common/domain/service.js";

const repo = ReportsRepository();

export const ReportsService = {
  attendanceSummary: async (startDate: Date, endDate: Date) => serviceGuard(async () => repo.attendanceSummary(startDate, endDate)),
  payrollSummary: async (period: string) => serviceGuard(async () => repo.payrollSummary(period)),
  headcount: async () => serviceGuard(async () => repo.headcount()),
  employeeStatsByDepartment: async () => serviceGuard(async () => repo.employeeStatsByDepartment()),
  employeeStatsBySkill: async () => serviceGuard(async () => repo.employeeStatsBySkill()),
  performanceReport: async (period?: string) => serviceGuard(async () => repo.performanceReport(period)),
  performanceByShift: async (period?: string) => serviceGuard(async () => repo.performanceByShift(period)),
  attendanceReport: async (startDate: Date, endDate: Date) => serviceGuard(async () => repo.attendanceReport(startDate, endDate)),
  attendanceByShift: async (startDate: Date, endDate: Date) => serviceGuard(async () => repo.attendanceByShift(startDate, endDate)),
  overtimeByShift: async (startDate: Date, endDate: Date) => serviceGuard(async () => repo.overtimeByShift(startDate, endDate)),
  departmentProductivity: async (period?: string) => serviceGuard(async () => repo.departmentProductivity(period)),
  productivityByShift: async (period?: string) => serviceGuard(async () => repo.productivityByShift(period)),
  retirementForecast: async (monthsAhead?: number) => serviceGuard(async () => repo.retirementForecast(monthsAhead)),
  leaveUtilization: async (startDate: Date, endDate: Date) => serviceGuard(async () => repo.leaveUtilization(startDate, endDate)),
  salaryCostProjection: async (monthsAhead?: number) => serviceGuard(async () => repo.salaryCostProjection(monthsAhead)),

  dashboardStats: async () =>
    serviceGuard(async () => {
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
    }),
};