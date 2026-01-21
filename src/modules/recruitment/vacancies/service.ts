import { RecruitmentRepository } from "../repository.js";
import type { Prisma } from '.prisma/client';

const repo = RecruitmentRepository();

export const VacanciesService = {
  create: async (data: Prisma.VacancyCreateInput) => repo.createVacancy(data),
  get: async (id: string) => repo.findVacancy(id),
  update: async (id: string, data: Prisma.VacancyUpdateInput) => repo.updateVacancy(id, data),
  delete: async (id: string) => repo.deleteVacancy(id),
  list: async (skip = 0, take = 20) => repo.listVacancies(skip, take),
};