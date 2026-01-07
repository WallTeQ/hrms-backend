import { TrainingsRepository } from "./repository";
import type { Prisma } from "../../generated/prisma";

const repo = TrainingsRepository();

export const TrainingsService = {
  createTraining: async (data: Prisma.TrainingCreateInput) => repo.createTraining(data),
  getTraining: async (id: string) => repo.findTraining(id),
  updateTraining: async (id: string, data: Prisma.TrainingUpdateInput) => repo.updateTraining(id, data),
  deleteTraining: async (id: string) => repo.deleteTraining(id),
  listTrainings: async (skip = 0, take = 50) => repo.listTrainings(skip, take),

  createSkill: async (data: Prisma.SkillCreateInput) => repo.createSkill(data),
  getSkill: async (id: string) => repo.findSkill(id),
  updateSkill: async (id: string, data: Prisma.SkillUpdateInput) => repo.updateSkill(id, data),
  deleteSkill: async (id: string) => repo.deleteSkill(id),
  listSkills: async () => repo.listSkills(),

  addTrainingHistory: async (data: Prisma.TrainingHistoryCreateInput) => repo.addTrainingHistory(data),
  getTrainingHistory: async (id: string) => repo.findTrainingHistory(id),
  updateTrainingHistory: async (id: string, data: Prisma.TrainingHistoryUpdateInput) => repo.updateTrainingHistory(id, data),
  deleteTrainingHistory: async (id: string) => repo.deleteTrainingHistory(id),
  listTrainingHistoryForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    repo.listTrainingHistoryForEmployee(employeeId, skip, take),
};