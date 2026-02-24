import { RecruitmentRepository } from "./repository.js";
import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";
import { uploadBuffer } from "../../infra/cloudinary.js";
import { serviceGuard } from "../../common/domain/service.js";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../../common/domain/errors.js";

const repo = RecruitmentRepository();

export const RecruitmentService = {
  createVacancy: async (data: Prisma.VacancyCreateInput, actor?: { role?: string }) =>
    serviceGuard(async () => {
      if (!actor?.role) throw new UnauthorizedError("Unauthorized");
      if (actor.role !== "HR_ADMIN" && actor.role !== "SUPER_ADMIN") {
        throw new ForbiddenError("Forbidden");
      }
      const payload: any = { ...data };
      if ((payload as any).skillId) {
        payload.skill = { connect: { id: (payload as any).skillId } };
        delete payload.skillId;
      }
      return repo.createVacancy(payload);
    }),
  getVacancy: async (id: string) => serviceGuard(async () => repo.findVacancy(id)),
  updateVacancy: async (id: string, data: Prisma.VacancyUpdateInput) => serviceGuard(async () => repo.updateVacancy(id, data)),
  deleteVacancy: async (id: string) => serviceGuard(async () => repo.deleteVacancy(id)),
  listVacancies: async (skip = 0, take = 20) => serviceGuard(async () => repo.listVacancies(skip, take)),

  createApplication: async (data: Prisma.ApplicationCreateInput) =>
    serviceGuard(async () => {
      const payload: any = { ...data };
      if ((payload as any).skillId) {
        payload.skill = { connect: { id: (payload as any).skillId } };
        delete payload.skillId;
      }
      if ((payload as any).vacancyId) {
        const vacancy = await repo.findVacancy((payload as any).vacancyId);
        const vacancySkillId = (vacancy as any)?.skillId || null;
        const applicantSkillId = (payload as any).skill?.connect?.id || (payload as any).skillId || null;
        if (vacancySkillId) {
          payload.score = vacancySkillId === applicantSkillId ? 100 : 0;
        }
      }
      return repo.createApplication(payload);
    }),
  createApplicationWithUpload: async (data: Prisma.ApplicationCreateInput, file?: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }) =>
    serviceGuard(async () => {
      const payload: any = { ...data };
      if (file) {
        const filename = (file.originalname || `resume-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
        const result = await uploadBuffer(file.buffer, filename, { folder: `recruitment/vacancies/${payload.vacancyId}` });
        payload.resumeUrl = result?.secure_url;
        payload.publicId = result?.public_id;
        payload.mimeType = file.mimetype;
        payload.size = file.size;
      }

      if (!payload.candidateName && payload.firstName && payload.lastName) {
        payload.candidateName = `${payload.firstName} ${payload.lastName}`.trim();
      }

      const dataToCreate: any = {
        vacancyId: payload.vacancyId,
        candidateName: payload.candidateName,
        email: payload.email,
        phone: payload.phone ?? null,
        resumeUrl: payload.resumeUrl ?? null,
        publicId: payload.publicId ?? null,
        mimeType: payload.mimeType ?? null,
        size: payload.size ?? null,
        skillId: payload.skillId,
      };

      if (!dataToCreate.vacancyId || !dataToCreate.candidateName || !dataToCreate.email) {
        throw new ValidationError("vacancyId, candidateName, and email are required");
      }

      return RecruitmentService.createApplication(dataToCreate as any);
    }),
  findApplication: async (id: string) => serviceGuard(async () => repo.findApplication(id)),
  updateApplication: async (id: string, data: Prisma.ApplicationUpdateInput) => serviceGuard(async () => repo.updateApplication(id, data)),
  deleteApplication: async (id: string) => serviceGuard(async () => repo.deleteApplication(id)),
  listApplicationsForVacancy: async (vacancyId: string, skip = 0, take = 50) =>
    serviceGuard(async () => repo.listApplicationsForVacancy(vacancyId, skip, take)),

  createInterview: async (data: Prisma.InterviewCreateInput) => serviceGuard(async () => repo.createInterview(data)),
  getInterview: async (id: string) => serviceGuard(async () => repo.findInterview(id)),
  updateInterview: async (id: string, data: Prisma.InterviewUpdateInput) => serviceGuard(async () => repo.updateInterview(id, data)),
  deleteInterview: async (id: string) => serviceGuard(async () => repo.deleteInterview(id)),

  createOffer: async (data: Prisma.OfferCreateInput) => serviceGuard(async () => repo.createOffer(data)),
  getOffer: async (id: string) => serviceGuard(async () => repo.findOffer(id)),
  updateOffer: async (id: string, data: Prisma.OfferUpdateInput) => serviceGuard(async () => repo.updateOffer(id, data)),
  deleteOffer: async (id: string) => serviceGuard(async () => repo.deleteOffer(id)),
  acceptOffer: async (offerId: string) => serviceGuard(async () => repo.acceptOffer(offerId)),

  getPlanningInsights: async (monthsAhead = 12) => serviceGuard(async () => {
    const now = new Date();
    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + monthsAhead);
    const retirementAge = Number(process.env.RETIREMENT_AGE || 60);

    type PlanningEmployee = Prisma.EmployeeGetPayload<{
      select: {
        id: true;
        firstName: true;
        lastName: true;
        dateOfBirth: true;
        departmentId: true;
        department: { select: { name: true } };
      };
    }>;

    const employees = await prismaDefault.employee.findMany({
      where: { dateOfBirth: { not: null }, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true, departmentId: true, department: { select: { name: true } } },
    });

    const retirements = employees
      .map((e: PlanningEmployee) => {
        if (!e.dateOfBirth) return null;
        const retirementDate = new Date(e.dateOfBirth);
        retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);
        const monthsLeft = (retirementDate.getFullYear() - now.getFullYear()) * 12 + (retirementDate.getMonth() - now.getMonth());
        return {
          employeeId: e.id,
          name: `${e.firstName} ${e.lastName}`,
          departmentName: e.department?.name || "Unassigned",
          retirementDate,
          monthsLeft,
        };
      })
      .filter((e: { retirementDate: Date } | null): e is NonNullable<typeof e> => !!e && e.retirementDate <= horizon);

    const vacancies = await prismaDefault.vacancy.findMany({ where: { status: "OPEN" } });

    const vacanciesByDepartment: Record<string, number> = {};
    const vacanciesBySkill: Record<string, number> = {};
    for (const v of vacancies) {
      const dept = v.department || "Unassigned";
      vacanciesByDepartment[dept] = (vacanciesByDepartment[dept] || 0) + 1;
      if (v.skillId) vacanciesBySkill[v.skillId] = (vacanciesBySkill[v.skillId] || 0) + 1;
    }

    const retirementsByDepartment: Record<string, number> = {};
    for (const r of retirements) {
      retirementsByDepartment[r.departmentName] = (retirementsByDepartment[r.departmentName] || 0) + 1;
    }

    const allDepartments = new Set([
      ...Object.keys(retirementsByDepartment),
      ...Object.keys(vacanciesByDepartment),
    ]);

    const gapsByDepartment = Array.from(allDepartments).map((name) => {
      const retireCount = retirementsByDepartment[name] || 0;
      const vacancyCount = vacanciesByDepartment[name] || 0;
      return {
        departmentName: name,
        retirements: retireCount,
        openVacancies: vacancyCount,
        projectedGap: Math.max(0, retireCount - vacancyCount),
      };
    });

      return {
        monthsAhead,
        retirements,
        vacanciesByDepartment,
        vacanciesBySkill,
        gapsByDepartment,
      };
    }),
};