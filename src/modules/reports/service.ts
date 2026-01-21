import { ReportsRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";

const repo = ReportsRepository();

export const ReportsService = {
  attendanceSummary: async (startDate: Date, endDate: Date) => repo.attendanceSummary(startDate, endDate),
  payrollSummary: async (period: string) => repo.payrollSummary(period),
  headcount: async () => repo.headcount(),
};