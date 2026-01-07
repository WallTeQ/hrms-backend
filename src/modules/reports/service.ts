import { ReportsRepository } from "./repository";
import type { Prisma } from "../../generated/prisma";

const repo = ReportsRepository();

export const ReportsService = {
  attendanceSummary: async (startDate: Date, endDate: Date) => repo.attendanceSummary(startDate, endDate),
  payrollSummary: async (period: string) => repo.payrollSummary(period),
  headcount: async () => repo.headcount(),
};