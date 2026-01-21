import { RecruitmentRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";

const repo = RecruitmentRepository();

export const RecruitmentService = {
  createVacancy: async (data: Prisma.VacancyCreateInput) => repo.createVacancy(data),
  getVacancy: async (id: string) => repo.findVacancy(id),
  updateVacancy: async (id: string, data: Prisma.VacancyUpdateInput) => repo.updateVacancy(id, data),
  deleteVacancy: async (id: string) => repo.deleteVacancy(id),
  listVacancies: async (skip = 0, take = 20) => repo.listVacancies(skip, take),

  createApplication: async (data: Prisma.ApplicationCreateInput) => repo.createApplication(data),
  findApplication: async (id: string) => repo.findApplication(id),
  updateApplication: async (id: string, data: Prisma.ApplicationUpdateInput) => repo.updateApplication(id, data),
  deleteApplication: async (id: string) => repo.deleteApplication(id),
  listApplicationsForVacancy: async (vacancyId: string, skip = 0, take = 50) =>
    repo.listApplicationsForVacancy(vacancyId, skip, take),

  createInterview: async (data: Prisma.InterviewCreateInput) => repo.createInterview(data),
  getInterview: async (id: string) => repo.findInterview(id),
  updateInterview: async (id: string, data: Prisma.InterviewUpdateInput) => repo.updateInterview(id, data),
  deleteInterview: async (id: string) => repo.deleteInterview(id),

  createOffer: async (data: Prisma.OfferCreateInput) => repo.createOffer(data),
  getOffer: async (id: string) => repo.findOffer(id),
  updateOffer: async (id: string, data: Prisma.OfferUpdateInput) => repo.updateOffer(id, data),
  deleteOffer: async (id: string) => repo.deleteOffer(id),
  acceptOffer: async (offerId: string) => repo.acceptOffer(offerId),
};