import { PerformanceRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";
import prismaDefault from "../../infra/database.js";
import { AttendancePolicy, PerformancePolicy } from "../../common/policies.js";
import { serviceGuard } from "../../common/domain/service.js";
import { NotFoundError, ValidationError } from "../../common/domain/errors.js";

const repo = PerformanceRepository();

export const PerformanceService = {
  createKpi: async (data: Prisma.KpiCreateInput) => serviceGuard(async () => repo.createKpi(data)),
  getKpi: async (id: string) => serviceGuard(async () => repo.findKpi(id)),
  updateKpi: async (id: string, data: Prisma.KpiUpdateInput) => serviceGuard(async () => repo.updateKpi(id, data)),
  deleteKpi: async (id: string) => serviceGuard(async () => repo.deleteKpi(id)),
  listKpis: async (skip = 0, take = 50) => serviceGuard(async () => repo.listKpis(skip, take)),

  createEvaluation: async (data: Prisma.EvaluationCreateInput) =>
    serviceGuard(async () => {
      const employeeId = (data as any).employeeId;
      if (employeeId) {
        const employee = await repo.findEmployee(employeeId as string);
        if (!employee) {
          throw new NotFoundError("Employee not found", { employeeId });
        }
      }
      const payload: Prisma.EvaluationCreateInput = {
        ...data,
        category: (data as any).category || "SUPERVISOR",
      } as any;
      return repo.createEvaluation(payload);
    }),
  getEvaluation: async (id: string) => serviceGuard(async () => repo.findEvaluation(id)),
  updateEvaluation: async (id: string, data: Prisma.EvaluationUpdateInput) => serviceGuard(async () => repo.updateEvaluation(id, data)),
  deleteEvaluation: async (id: string) => serviceGuard(async () => repo.deleteEvaluation(id)),
  listEvaluationsForEmployee: async (employeeId: string, skip = 0, take = 50) => serviceGuard(async () => repo.listEvaluationsForEmployee(employeeId, skip, take)),

  startReview: async (employeeId: string) =>
    serviceGuard(async () => {
      const employee = await repo.findEmployee(employeeId);
      if (!employee) {
        throw new NotFoundError("Employee not found", { employeeId });
      }
      return repo.createEvaluation({
        employee: { connect: { id: employeeId } },
        period: "Annual",
        score: 0,
        notes: "Review initiated",
      });
    }),

  generateMonthlyPerformance: async (period: string) =>
    serviceGuard(async () => {
    const employees = await prismaDefault.employee.findMany({ where: { status: "ACTIVE" } });
    const results: any[] = [];

    for (const emp of employees) {
      // employee.shift used inside computePerformanceScores; skip if not present
      if (!emp.shift) {
        console.warn(`Skipping employee ${emp.id} during performance generation: no shift data`);
        continue;
      }

      const scores = await computePerformanceScores(emp.id, period);
      const rating = resolveRating(scores.totalScore);
      const flags = await resolveFlags(emp.id, period, rating, scores.totalScore);

      const record = await prismaDefault.performanceRecord.upsert({
        where: { employeeId_period: { employeeId: emp.id, period } },
        update: {
          ...scores,
          rating: rating as any,
          ...flags,
        } as any,
        create: {
          employeeId: emp.id,
          period,
          ...scores,
          rating: rating as any,
          ...flags,
        } as any,
      });

      if (flags.flagTrainingRecommendation) {
        const existing = await prismaDefault.trainingRecommendation.findFirst({ where: { employeeId: emp.id, period } });
        if (!existing) {
          await prismaDefault.trainingRecommendation.create({
            data: {
              employeeId: emp.id,
              period,
              reason: `Performance below ${PerformancePolicy.trainingThreshold}%`,
            },
          });
        }
      }

      results.push(record);
    }

      return { period, count: results.length };
    }),

  listPerformanceRecords: async (filters: { employeeId?: string; period?: string; skip?: number; take?: number } = {}) =>
    serviceGuard(async () => {
      const { employeeId, period, skip = 0, take = 50 } = filters;
      const where: Prisma.PerformanceRecordWhereInput = {
        AND: [
          employeeId ? { employeeId } : {},
          period ? { period } : {},
        ],
      };
      const items = await prismaDefault.performanceRecord.findMany({ where, skip, take, orderBy: { createdAt: "desc" } });
      const total = await prismaDefault.performanceRecord.count({ where });
      return { items, total };
    }),

  updatePerformanceRecord: async (id: string, data: Prisma.PerformanceRecordUpdateInput) =>
    serviceGuard(async () => prismaDefault.performanceRecord.update({ where: { id }, data })),
};

async function computePerformanceScores(employeeId: string, period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, (month || 1) - 1, 1);
  const end = new Date(year, (month || 1), 0, 23, 59, 59, 999);

  const employee = await prismaDefault.employee.findUnique({
    where: { id: employeeId },
    select: { shift: true },
  });
  if (!employee?.shift) {
    throw new ValidationError("Employee shift is required for performance scoring");
  }

  const tasks = await prismaDefault.task.findMany({
    where: { employeeId, dueDate: { gte: start, lte: end } },
  });
  const completedTasks = tasks.filter((t: { status: string }) => t.status === "COMPLETED");
  const taskScore = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 100;

  const attendance = await prismaDefault.attendance.findMany({
    where: { employeeId, date: { gte: start, lte: end } },
    include: { leaveRequest: true },
  });
  const paidAttendanceDays = attendance.filter((rec: { status: string; leaveRequest?: { isPaid?: boolean | null } }) => {
    if (rec.status === "ON_LEAVE") {
      return rec.leaveRequest?.isPaid !== false;
    }
    return rec.status === "PRESENT" || rec.status === "LATE";
  }).length;
  const attendanceScore = resolveAttendanceScore(attendance, employee.shift);

  const lateCount = attendance.filter((rec: { status: string; lateMinutes?: number | null }) => rec.status === "LATE" || (rec.lateMinutes || 0) > 0).length;
  const punctualityScore = resolvePunctualityScore(lateCount, employee.shift);

  const supervisorEvaluations = await prismaDefault.evaluation.findMany({
    where: { employeeId, period },
  });

  // Use KPI definitions (weights) to compute weighted averages for evaluation categories.
  // Falls back to simple averaging for evaluations without a `kpiId` or when KPI weight is missing.
  const kpis = await prismaDefault.kpi.findMany();
  const kpiMap: Map<string, number> = new Map(
    (kpis as any[]).map((k) => [String(k.id), Number(k.weight ?? 1)]) as [string, number][]
  );

  const supervisorScore = weightedAverageByCategory(supervisorEvaluations, "SUPERVISOR", kpiMap);
  const teamworkScore = weightedAverageByCategory(supervisorEvaluations, "TEAMWORK", kpiMap);

  const weights = resolveWeightsForShift(employee.shift);

  const totalScore =
    taskScore * weights.taskCompletion +
    attendanceScore * weights.attendanceConsistency +
    punctualityScore * weights.punctuality +
    supervisorScore * weights.supervisorEvaluation +
    teamworkScore * weights.teamworkConduct;

  return {
    taskScore,
    attendanceScore,
    punctualityScore,
    supervisorScore,
    teamworkScore,
    totalScore,
  };
}

function resolveRating(score: number) {
  for (const r of PerformancePolicy.ratings) {
    if (score >= r.min) return r.label;
  }
  return "UNSATISFACTORY";
}

async function resolveFlags(employeeId: string, period: string, rating: string, totalScore: number) {
  const previous = await prismaDefault.performanceRecord.findMany({
    where: { employeeId, period: { not: period } },
    orderBy: { createdAt: "desc" },
    take: Math.max(PerformancePolicy.consecutiveExcellentForPromotion, PerformancePolicy.consecutiveUnsatisfactoryForCorrective) - 1,
  });

  const recentRatings = [rating, ...previous.map((p: { rating: string }) => p.rating)];
  const excellentStreak = hasConsecutive(recentRatings, "EXCELLENT", PerformancePolicy.consecutiveExcellentForPromotion);
  const unsatisfactoryStreak = hasConsecutive(recentRatings, "UNSATISFACTORY", PerformancePolicy.consecutiveUnsatisfactoryForCorrective);

  return {
    flagPromotionReview: excellentStreak,
    flagCorrectiveAction: unsatisfactoryStreak,
    flagTrainingRecommendation: totalScore < PerformancePolicy.trainingThreshold,
  };
}

function hasConsecutive(items: string[], target: string, count: number) {
  let streak = 0;
  for (const item of items) {
    if (item === target) {
      streak += 1;
      if (streak >= count) return true;
    } else {
      break;
    }
  }
  return false;
}

function averageScore(items: Array<{ score?: number | null }>) {
  if (!items.length) return 0;
  const total = items.reduce((sum, e) => sum + (e.score || 0), 0);
  return total / items.length;
}

/**
 * Compute a (KPI-)weighted average for evaluations of a given category.
 * - KPI-linked evaluations are weighted by `Kpi.weight` (fallback 1).
 * - Evaluations without `kpiId` are counted with weight 1.
 * - For the SUPERVISOR category, evaluations with no category (legacy) are treated as SUPERVISOR.
 */
function weightedAverageByCategory(
  items: Array<{ score?: number | null; kpiId?: string | null; category?: string | null }>,
  category: string,
  kpiMap: Map<string, number>
) {
  const filtered = items.filter((e) => (!e.category && category === "SUPERVISOR") || e.category === category);
  if (!filtered.length) return 0;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const e of filtered) {
    const score = e.score || 0;
    if (e.kpiId) {
      const w = kpiMap.get(e.kpiId) ?? 1;
      weightedSum += score * w;
      weightTotal += w;
    } else {
      weightedSum += score;
      weightTotal += 1;
    }
  }

  return weightTotal === 0 ? 0 : weightedSum / weightTotal;
} 

function resolveWeightsForShift(shift: any) {
  const base = { ...PerformancePolicy.weights };
  const punctualityApplies = shift?.punctualityApplies !== false && shift?.isFlexible !== true;
  if (punctualityApplies) return base;

  const { punctuality, ...rest } = base;
  const sum = Object.values(rest).reduce((acc, v) => acc + v, 0) || 1;
  return {
    taskCompletion: rest.taskCompletion / sum,
    attendanceConsistency: rest.attendanceConsistency / sum,
    punctuality: 0,
    supervisorEvaluation: rest.supervisorEvaluation / sum,
    teamworkConduct: rest.teamworkConduct / sum,
  };
}

function resolveAttendanceScore(attendance: Array<{ status: string; workMinutes?: number | null; leaveRequest?: { isPaid?: boolean | null } }>, shift: any) {
  const isFlexible = shift?.isFlexible === true || shift?.punctualityApplies === false;
  if (isFlexible) {
    const expectedHours = Number(shift?.expectedHours || AttendancePolicy.hoursPerDay);
    const expectedMinutes = AttendancePolicy.workdaysPerMonth * expectedHours * 60;
    const workedMinutes = attendance.reduce((sum, rec) => sum + (rec.workMinutes || 0), 0);
    if (expectedMinutes <= 0) return 0;
    return Math.min(100, (workedMinutes / expectedMinutes) * 100);
  }

  const paidAttendanceDays = attendance.filter((rec) => {
    if (rec.status === "ON_LEAVE") {
      return rec.leaveRequest?.isPaid !== false;
    }
    return rec.status === "PRESENT" || rec.status === "LATE";
  }).length;

  return AttendancePolicy.workdaysPerMonth > 0
    ? (paidAttendanceDays / AttendancePolicy.workdaysPerMonth) * 100
    : 0;
}

function resolvePunctualityScore(lateCount: number, shift: any) {
  const punctualityApplies = shift?.punctualityApplies !== false && shift?.isFlexible !== true;
  if (!punctualityApplies) return 0;
  return AttendancePolicy.workdaysPerMonth > 0
    ? Math.max(0, 100 - (lateCount / AttendancePolicy.workdaysPerMonth) * 100)
    : 0;
}