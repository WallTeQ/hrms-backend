import { TrainingsRepository } from "./repository.js";
import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";
import { serviceGuard } from "../../common/domain/service.js";

const repo = TrainingsRepository();

export const TrainingsService = {
  createTraining: async (data: Prisma.TrainingCreateInput) =>
    serviceGuard(async () => {
      const payload: any = { ...data };
      if (payload.date && typeof payload.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
        payload.date = new Date(`${payload.date}T00:00:00Z`).toISOString();
      }
      return repo.createTraining(payload as Prisma.TrainingCreateInput);
    }),
  getTraining: async (id: string) => serviceGuard(async () => repo.findTraining(id)),
  updateTraining: async (id: string, data: Prisma.TrainingUpdateInput) =>
    serviceGuard(async () => {
      const payload: any = { ...data };
      if (payload.date && typeof payload.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
        payload.date = new Date(`${payload.date}T00:00:00Z`).toISOString();
      }
      return repo.updateTraining(id, payload as Prisma.TrainingUpdateInput);
    }),
  deleteTraining: async (id: string) => serviceGuard(async () => repo.deleteTraining(id)),
  listTrainings: async (skip = 0, take = 50) => serviceGuard(async () => repo.listTrainings(skip, take)),

  createSkill: async (data: Prisma.SkillCreateInput) => serviceGuard(async () => repo.createSkill(data)),
  getSkill: async (id: string) => serviceGuard(async () => repo.findSkill(id)),
  updateSkill: async (id: string, data: Prisma.SkillUpdateInput) => serviceGuard(async () => repo.updateSkill(id, data)),
  deleteSkill: async (id: string) => serviceGuard(async () => repo.deleteSkill(id)),
  listSkills: async (skip = 0, take = 50) => serviceGuard(async () => repo.listSkills(skip, take)),

  listEmployeesForSkill: async (skillId: string, skip = 0, take = 50) =>
    serviceGuard(async () => repo.listEmployeesSkill(skillId, skip, take)),

  addTrainingHistory: async (data: Prisma.TrainingHistoryCreateInput) =>
    serviceGuard(async () => {
      const payload: any = { ...data };
      if (payload.completedAt && typeof payload.completedAt === "string") {
        payload.completedAt = new Date(payload.completedAt);
      }
      if (payload.prePerformanceScore != null && payload.postPerformanceScore != null) {
        payload.impactScore = Number(payload.postPerformanceScore) - Number(payload.prePerformanceScore);
      }
      return repo.addTrainingHistory(payload as Prisma.TrainingHistoryCreateInput);
    }),
  getTrainingHistory: async (id: string) => serviceGuard(async () => repo.findTrainingHistory(id)),
  updateTrainingHistory: async (id: string, data: Prisma.TrainingHistoryUpdateInput) =>
    serviceGuard(async () => {
      const payload: any = { ...data };
      if (payload.completedAt && typeof payload.completedAt === "string") {
        payload.completedAt = new Date(payload.completedAt);
      }
      if (payload.prePerformanceScore != null && payload.postPerformanceScore != null) {
        payload.impactScore = Number(payload.postPerformanceScore) - Number(payload.prePerformanceScore);
      }
      return repo.updateTrainingHistory(id, payload as Prisma.TrainingHistoryUpdateInput);
    }),
  deleteTrainingHistory: async (id: string) => serviceGuard(async () => repo.deleteTrainingHistory(id)),
  listTrainingHistoryForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    serviceGuard(async () => repo.listTrainingHistoryForEmployee(employeeId, skip, take)),

  listTrainingRecommendations: async (filters: { employeeId?: string; status?: string; skip?: number; take?: number } = {}) =>
    serviceGuard(async () => repo.listTrainingRecommendations(filters)),
  updateTrainingRecommendation: async (id: string, data: Prisma.TrainingRecommendationUpdateInput) =>
    serviceGuard(async () => repo.updateTrainingRecommendation(id, data)),

  generateExpertiseGapRecommendations: async (employeeId?: string) =>
    serviceGuard(async () => {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const employees = await prismaDefault.employee.findMany({
      where: { status: "ACTIVE", ...(employeeId ? { id: employeeId } : {}) },
      include: { skills: { select: { id: true } }, primarySkill: { select: { id: true } } },
    });

    let created = 0;

    for (const emp of employees) {
      const skillIds = new Set<string>();
      if (emp.primarySkill?.id) skillIds.add(emp.primarySkill.id);
      for (const s of emp.skills) skillIds.add(s.id);

      const tasks = await prismaDefault.task.findMany({
        where: { employeeId: emp.id, skillId: { not: null } },
        select: { skillId: true },
      });

      const missingSkills = Array.from(new Set(tasks.map((t: { skillId: string | null }) => t.skillId).filter(Boolean) as string[]))
        .filter((id) => !skillIds.has(id));

      for (const skillId of missingSkills) {
        const existing = await prismaDefault.trainingRecommendation.findFirst({
          where: { employeeId: emp.id, skillId, period },
        });
        if (existing) continue;

        await prismaDefault.trainingRecommendation.create({
          data: {
            employeeId: emp.id,
            skillId,
            period,
            reason: "Expertise gap for assigned tasks",
          },
        });
        created += 1;
      }
    }

      return { created };
    }),
};