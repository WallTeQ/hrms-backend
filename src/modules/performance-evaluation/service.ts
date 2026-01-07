import { PerformanceRepository } from "./repository";
import type { Prisma } from "../../generated/prisma";

const repo = PerformanceRepository();

export const PerformanceService = {
  createKpi: async (data: Prisma.KpiCreateInput) => repo.createKpi(data),
  getKpi: async (id: string) => repo.findKpi(id),
  updateKpi: async (id: string, data: Prisma.KpiUpdateInput) => repo.updateKpi(id, data),
  deleteKpi: async (id: string) => repo.deleteKpi(id),
  listKpis: async (skip = 0, take = 50) => repo.listKpis(skip, take),

  createEvaluation: async (data: Prisma.EvaluationCreateInput) => repo.createEvaluation(data),
  getEvaluation: async (id: string) => repo.findEvaluation(id),
  updateEvaluation: async (id: string, data: Prisma.EvaluationUpdateInput) => repo.updateEvaluation(id, data),
  deleteEvaluation: async (id: string) => repo.deleteEvaluation(id),
  listEvaluationsForEmployee: async (employeeId: string, skip = 0, take = 50) => repo.listEvaluationsForEmployee(employeeId, skip, take),
};