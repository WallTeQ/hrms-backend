import { RecruitmentRepository } from "../repository.js";
import type { Prisma } from '.prisma/client';
import { serviceGuard } from "../../../common/domain/service.js";

const repo = RecruitmentRepository();

export const VacanciesService = {
  create: async (data: Prisma.VacancyCreateInput) => serviceGuard(async () => repo.createVacancy(data)),
  get: async (id: string) => serviceGuard(async () => repo.findVacancy(id)),
  update: async (id: string, data: Prisma.VacancyUpdateInput) => serviceGuard(async () => repo.updateVacancy(id, data)),
  delete: async (id: string) => serviceGuard(async () => repo.deleteVacancy(id)),
  list: async (skip = 0, take = 20) => serviceGuard(async () => repo.listVacancies(skip, take)),
};