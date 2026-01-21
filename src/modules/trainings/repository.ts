import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const TrainingsRepository = (prisma = prismaDefault) => ({
  createTraining: async (data: Prisma.TrainingCreateInput) => prisma.training.create({ data }),
  findTraining: async (id: string) => prisma.training.findUnique({ where: { id } }),
  updateTraining: async (id: string, data: Prisma.TrainingUpdateInput) => prisma.training.update({ where: { id }, data }),
  deleteTraining: async (id: string) => prisma.training.delete({ where: { id } }),
  listTrainings: async (skip = 0, take = 50) => {
    const items = await prisma.training.findMany({ skip, take });
    const total = await prisma.training.count();
    return { items, total };
  },

  // Skills
  createSkill: async (data: Prisma.SkillCreateInput) => prisma.skill.create({ data }),
  findSkill: async (id: string) => prisma.skill.findUnique({ where: { id } }),
  updateSkill: async (id: string, data: Prisma.SkillUpdateInput) => prisma.skill.update({ where: { id }, data }),
  deleteSkill: async (id: string) => prisma.skill.delete({ where: { id } }),
  listSkills: async () => prisma.skill.findMany(),

  // Training history
  addTrainingHistory: async (data: Prisma.TrainingHistoryCreateInput) => prisma.trainingHistory.create({ data }),
  findTrainingHistory: async (id: string) => prisma.trainingHistory.findUnique({ where: { id } }),
  updateTrainingHistory: async (id: string, data: Prisma.TrainingHistoryUpdateInput) => prisma.trainingHistory.update({ where: { id }, data }),
  deleteTrainingHistory: async (id: string) => prisma.trainingHistory.delete({ where: { id } }),
  listTrainingHistoryForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    prisma.trainingHistory.findMany({ where: { employeeId }, skip, take, orderBy: { completedAt: "desc" } }),
});