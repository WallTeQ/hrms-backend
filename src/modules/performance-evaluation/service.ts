import { PerformanceRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";

const repo = PerformanceRepository();

export const PerformanceService = {
  createKpi: async (data: Prisma.KpiCreateInput) => repo.createKpi(data),
  getKpi: async (id: string) => repo.findKpi(id),
  updateKpi: async (id: string, data: Prisma.KpiUpdateInput) => repo.updateKpi(id, data),
  deleteKpi: async (id: string) => repo.deleteKpi(id),
  listKpis: async (skip = 0, take = 50) => repo.listKpis(skip, take),

  createEvaluation: async (data: Prisma.EvaluationCreateInput) => {
    // Defensive validation: ensure referenced employee exists before creating an evaluation
    const employeeId = (data as any).employeeId;
    if (employeeId) {
      const employee = await repo.findEmployee(employeeId as string);
      if (!employee) {
        const err = new Error("EMPLOYEE_NOT_FOUND");
        (err as any).status = 400;
        throw err;
      }
    }
    return repo.createEvaluation(data);
  },
  getEvaluation: async (id: string) => repo.findEvaluation(id),
  updateEvaluation: async (id: string, data: Prisma.EvaluationUpdateInput) => repo.updateEvaluation(id, data),
  deleteEvaluation: async (id: string) => repo.deleteEvaluation(id),
  listEvaluationsForEmployee: async (employeeId: string, skip = 0, take = 50) => repo.listEvaluationsForEmployee(employeeId, skip, take),
};