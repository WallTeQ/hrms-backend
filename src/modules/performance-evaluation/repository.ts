import prismaDefault from "../../infra/database";
import type { Prisma } from "../../generated/prisma";

export const PerformanceRepository = (prisma = prismaDefault) => ({
  // KPIs
  createKpi: async (data: Prisma.KpiCreateInput) => prisma.kpi.create({ data }),
  findKpi: async (id: string) => prisma.kpi.findUnique({ where: { id } }),
  updateKpi: async (id: string, data: Prisma.KpiUpdateInput) => prisma.kpi.update({ where: { id }, data }),
  deleteKpi: async (id: string) => prisma.kpi.delete({ where: { id } }),
  listKpis: async (skip = 0, take = 50) => prisma.kpi.findMany({ skip, take }),

  // Evaluations
  createEvaluation: async (data: Prisma.EvaluationCreateInput) => prisma.evaluation.create({ data }),
  findEvaluation: async (id: string) => prisma.evaluation.findUnique({ where: { id } }),
  updateEvaluation: async (id: string, data: Prisma.EvaluationUpdateInput) => prisma.evaluation.update({ where: { id }, data }),
  deleteEvaluation: async (id: string) => prisma.evaluation.delete({ where: { id } }),
  listEvaluationsForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    prisma.evaluation.findMany({ where: { employeeId }, skip, take, orderBy: { createdAt: "desc" } }),

  // Promotions & probation (simple CRUD placeholders)
  // Add domain-specific queries as needed
});