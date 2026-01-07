import prismaDefault from "../../infra/database";
import type { Prisma } from "../../generated/prisma";

export const RecruitmentRepository = (prisma = prismaDefault) => ({
  // Vacancies
  createVacancy: async (data: Prisma.VacancyCreateInput) => prisma.vacancy.create({ data }),
  findVacancy: async (id: string) => prisma.vacancy.findUnique({ where: { id } }),
  updateVacancy: async (id: string, data: Prisma.VacancyUpdateInput) => prisma.vacancy.update({ where: { id }, data }),
  deleteVacancy: async (id: string) => prisma.vacancy.delete({ where: { id } }),
  listVacancies: async (skip = 0, take = 20) => prisma.vacancy.findMany({ skip, take }),

  // Applications
  createApplication: async (data: Prisma.ApplicationCreateInput) => prisma.application.create({ data }),
  findApplication: async (id: string) => prisma.application.findUnique({ where: { id }, include: { interviews: true, offer: true } }),
  updateApplication: async (id: string, data: Prisma.ApplicationUpdateInput) => prisma.application.update({ where: { id }, data }),
  deleteApplication: async (id: string) => prisma.application.delete({ where: { id } }),
  listApplicationsForVacancy: async (vacancyId: string, skip = 0, take = 50) =>
    prisma.application.findMany({ where: { vacancyId }, skip, take, orderBy: { createdAt: "desc" } }),

  // Interviews
  createInterview: async (data: Prisma.InterviewCreateInput) => prisma.interview.create({ data }),
  findInterview: async (id: string) => prisma.interview.findUnique({ where: { id } }),
  updateInterview: async (id: string, data: Prisma.InterviewUpdateInput) => prisma.interview.update({ where: { id }, data }),
  deleteInterview: async (id: string) => prisma.interview.delete({ where: { id } }),

  // Offers
  createOffer: async (data: Prisma.OfferCreateInput) => prisma.offer.create({ data }),
  findOffer: async (id: string) => prisma.offer.findUnique({ where: { id } }),
  updateOffer: async (id: string, data: Prisma.OfferUpdateInput) => prisma.offer.update({ where: { id }, data }),
  deleteOffer: async (id: string) => prisma.offer.delete({ where: { id } }),
  acceptOffer: async (offerId: string) => prisma.offer.update({ where: { id: offerId }, data: { accepted: true } }),
});