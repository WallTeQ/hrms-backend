import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const TrainingsRepository = (prisma = prismaDefault) => ({
  createTraining: async (data: Prisma.TrainingCreateInput) => prisma.training.create({ data, include: { skill: { select: { id: true, name: true } } } }),
  findTraining: async (id: string) => prisma.training.findUnique({ where: { id }, include: { skill: { select: { id: true, name: true } } } }),
  updateTraining: async (id: string, data: Prisma.TrainingUpdateInput) => prisma.training.update({ where: { id }, data, include: { skill: { select: { id: true, name: true } } } }),
  deleteTraining: async (id: string) => prisma.training.delete({ where: { id } }),
  listTrainings: async (skip = 0, take = 50) => {
    const items = await prisma.training.findMany({ skip, take, include: { skill: { select: { id: true, name: true } } } });
    const total = await prisma.training.count();
    return { items, total };
  },

  // Skills
  createSkill: async (data: Prisma.SkillCreateInput) => prisma.skill.create({ data }),
  findSkill: async (id: string) => prisma.skill.findUnique({ where: { id } }),
  updateSkill: async (id: string, data: Prisma.SkillUpdateInput) => prisma.skill.update({ where: { id }, data }),
  deleteSkill: async (id: string) => prisma.skill.delete({ where: { id } }),
  listSkills: async (skip = 0, take = 50) => {
    const items = await prisma.skill.findMany({ skip, take, orderBy: { name: "asc" } });
    const total = await prisma.skill.count();
    return { items, total };
  },

  // employees that have a given skill (optimized + paginated)
  listEmployeesSkill: async (skillId: string, skip = 0, take = 50) => {
    // run count + page fetch in a single transaction to reduce roundtrips
    const [total, items] = await prisma.$transaction([
      prisma.employee.count({ where: { skills: { some: { id: skillId } } } }),
      prisma.employee.findMany({
        where: { skills: { some: { id: skillId } } },
        skip,
        take,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, email: true, departmentId: true, primarySkillId: true, status: true },
      }),
    ]);
    return { items, total };
  },

  // Training history
  addTrainingHistory: async (data: Prisma.TrainingHistoryCreateInput) => prisma.trainingHistory.create({ data }),
  findTrainingHistory: async (id: string) => prisma.trainingHistory.findUnique({ where: { id } }),
  updateTrainingHistory: async (id: string, data: Prisma.TrainingHistoryUpdateInput) => prisma.trainingHistory.update({ where: { id }, data }),
  deleteTrainingHistory: async (id: string) => prisma.trainingHistory.delete({ where: { id } }),
  listTrainingHistoryForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    prisma.trainingHistory.findMany({ where: { employeeId }, skip, take, orderBy: { completedAt: "desc" } }),

  // Training recommendations
  listTrainingRecommendations: async (filters: { employeeId?: string; status?: string; skip?: number; take?: number } = {}) => {
    const { employeeId, status, skip = 0, take = 50 } = filters;
    const where: Prisma.TrainingRecommendationWhereInput = {
      AND: [
        employeeId ? { employeeId } : {},
        status ? { status: status as any } : {},
      ],
    };
    const items = await prisma.trainingRecommendation.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { id: true, firstName: true, lastName: true } }, skill: { select: { id: true, name: true } }, training: { select: { id: true, title: true } } },
    });
    const total = await prisma.trainingRecommendation.count({ where });
    return { items, total };
  },
  updateTrainingRecommendation: async (id: string, data: Prisma.TrainingRecommendationUpdateInput) =>
    prisma.trainingRecommendation.update({ where: { id }, data }),
});