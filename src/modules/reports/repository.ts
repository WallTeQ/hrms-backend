import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const ReportsRepository = (prisma = prismaDefault) => ({
  attendanceSummary: async (startDate: Date, endDate: Date) => {
    const statuses = ["PRESENT", "ABSENT", "LATE"] as const;
    const results = await Promise.all(
      statuses.map((status) =>
        prisma.attendance.count({ where: { date: { gte: startDate, lte: endDate }, status } })
      )
    );
    return statuses.reduce((acc, s, i) => ({ ...acc, [s]: results[i] }), {} as Record<string, number>);
  },

  payrollSummary: async (period: string) => {
    const totals = await prisma.payslip.aggregate({
      where: { payrollRun: { period } },
      _sum: { gross: true, net: true },
      _count: { id: true },
    });
    return totals;
  },

  headcount: async () => {
    const total = await prisma.employee.count();
    const byStatus = await Promise.all([
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.employee.count({ where: { status: "INACTIVE" } }),
      prisma.employee.count({ where: { status: "SUSPENDED" } }),
      prisma.employee.count({ where: { status: "PROBATION" } }),
    ]);
    const departmentCount = await prisma.department.count();
    return {
      total,
      ACTIVE: byStatus[0],
      INACTIVE: byStatus[1],
      SUSPENDED: byStatus[2],
      PROBATION: byStatus[3],
      departmentCount,
    };
  },

  getTotalEmployees: async () => {
    return prisma.employee.count();
  },

  getActiveEmployees: async () => {
    return prisma.employee.count({ where: { status: "ACTIVE" } });
  },

  getPendingLeaves: async () => {
    return prisma.leaveRequest.count({ where: { status: { in: ["PENDING_SUPERVISOR", "PENDING_HR"] } } });
  },

  getExpiringDocuments: async () => {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return prisma.document.count({ where: { expiresAt: { gte: now, lte: soon } } });
  },

  getDepartmentCount: async () => {
    return prisma.department.count();
  },

  getNewHiresThisMonth: async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return prisma.employee.count({
      where: {
        hireDate: {
          gte: startOfMonth,
        },
      },
    });
  },

  employeeStatsByDepartment: async () => {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
    });
    return departments.map((d: { id: string; name: string; _count: { employees: number } }) => ({
      id: d.id,
      name: d.name,
      employeeCount: d._count.employees,
    }));
  },

  employeeStatsBySkill: async () => {
    const skills = await prisma.skill.findMany({
      include: { _count: { select: { employees: true, primaryEmployees: true } } },
    });
    return skills.map((s: { id: string; name: string; _count: { employees: number; primaryEmployees: number } }) => ({
      id: s.id,
      name: s.name,
      employeeCount: s._count.employees,
      primaryCount: s._count.primaryEmployees,
    }));
  },

  performanceReport: async (period?: string) => {
    const where: any = period ? { period } : {};
    const records = await prisma.performanceRecord.findMany({
      where,
      include: { employee: { select: { id: true, firstName: true, lastName: true, departmentId: true, department: { select: { id: true, name: true } } } } },
    });

    const byDept: Record<string, { departmentId: string; departmentName: string; avgScore: number; count: number }> = {};
    for (const rec of records) {
      const deptId = rec.employee?.departmentId || "unassigned";
      const name = rec.employee?.department?.name || "Unassigned";
      byDept[deptId] = byDept[deptId] || { departmentId: deptId, departmentName: name, avgScore: 0, count: 0 };
      byDept[deptId].avgScore += rec.totalScore || 0;
      byDept[deptId].count += 1;
    }

    return Object.values(byDept).map((d) => ({
      ...d,
      avgScore: d.count > 0 ? d.avgScore / d.count : 0,
    }));
  },

  performanceByShift: async (period?: string) => {
    const where: any = period ? { period } : {};
    const records = await prisma.performanceRecord.findMany({
      where,
      include: { employee: { select: { id: true, shift: { select: { id: true, name: true, type: true } } } } },
    });

    const byShift: Record<string, { shiftId: string | null; shiftName: string; shiftType: string; avgScore: number; count: number }> = {};
    for (const rec of records) {
      const shift = rec.employee?.shift;
      const shiftKey = shift?.id || "unassigned";
      byShift[shiftKey] = byShift[shiftKey] || {
        shiftId: shift?.id || null,
        shiftName: shift?.name || "Unassigned",
        shiftType: shift?.type || "UNASSIGNED",
        avgScore: 0,
        count: 0,
      };
      byShift[shiftKey].avgScore += rec.totalScore || 0;
      byShift[shiftKey].count += 1;
    }

    return Object.values(byShift).map((d) => ({
      ...d,
      avgScore: d.count > 0 ? d.avgScore / d.count : 0,
    }));
  },

  attendanceReport: async (startDate: Date, endDate: Date) => {
    const records = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { employee: { select: { id: true, departmentId: true, department: { select: { id: true, name: true } } } } },
    });

    const byDept: Record<string, any> = {};
    for (const rec of records) {
      const deptId = rec.employee?.departmentId || "unassigned";
      const name = rec.employee?.department?.name || "Unassigned";
      const bucket = byDept[deptId] || { departmentId: deptId, departmentName: name, PRESENT: 0, ABSENT: 0, LATE: 0, ON_LEAVE: 0 };
      bucket[rec.status] = (bucket[rec.status] || 0) + 1;
      byDept[deptId] = bucket;
    }
    return Object.values(byDept);
  },

  attendanceByShift: async (startDate: Date, endDate: Date) => {
    const records = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { employee: { select: { id: true, shift: { select: { id: true, name: true, type: true } } } } },
    });

    const byShift: Record<string, any> = {};
    for (const rec of records) {
      const shift = rec.employee?.shift;
      const shiftKey = shift?.id || "unassigned";
      const bucket = byShift[shiftKey] || {
        shiftId: shift?.id || null,
        shiftName: shift?.name || "Unassigned",
        shiftType: shift?.type || "UNASSIGNED",
        PRESENT: 0,
        ABSENT: 0,
        LATE: 0,
        ON_LEAVE: 0,
        total: 0,
      };
      bucket[rec.status] = (bucket[rec.status] || 0) + 1;
      bucket.total += 1;
      byShift[shiftKey] = bucket;
    }
    return Object.values(byShift);
  },

  overtimeByShift: async (startDate: Date, endDate: Date) => {
    const records = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { employee: { select: { id: true, shift: { select: { id: true, name: true, type: true } } } } },
    });

    const byShift: Record<string, any> = {};
    for (const rec of records) {
      const shift = rec.employee?.shift;
      const shiftKey = shift?.id || "unassigned";
      const overtimeMinutes = rec.overtimeMinutes || 0;
      const bucket = byShift[shiftKey] || {
        shiftId: shift?.id || null,
        shiftName: shift?.name || "Unassigned",
        shiftType: shift?.type || "UNASSIGNED",
        totalMinutes: 0,
        approvedMinutes: 0,
        entries: 0,
      };
      if (overtimeMinutes > 0) {
        bucket.totalMinutes += overtimeMinutes;
        if (rec.overtimeApproved) bucket.approvedMinutes += overtimeMinutes;
        bucket.entries += 1;
      }
      byShift[shiftKey] = bucket;
    }

    return Object.values(byShift);
  },

  leaveUtilization: async (startDate: Date, endDate: Date) => {
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: "APPROVED",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { employee: { select: { id: true, departmentId: true, department: { select: { id: true, name: true } } } } },
    });

    const byType: Record<string, number> = {};
    const byDepartment: Record<string, { departmentId: string; departmentName: string; totalDays: number }> = {};
    let paidDays = 0;
    let unpaidDays = 0;
    let totalDays = 0;

    for (const leave of leaves) {
      const days = overlapDays(leave.startDate as Date, leave.endDate as Date, startDate, endDate);
      if (days <= 0) continue;
      totalDays += days;

      const type = (leave.type as string) || "UNKNOWN";
      byType[type] = (byType[type] || 0) + days;

      if (leave.isPaid === false) unpaidDays += days;
      else paidDays += days;

      const deptId = leave.employee?.departmentId || "unassigned";
      const deptName = leave.employee?.department?.name || "Unassigned";
      const bucket = byDepartment[deptId] || { departmentId: deptId, departmentName: deptName, totalDays: 0 };
      bucket.totalDays += days;
      byDepartment[deptId] = bucket;
    }

    return {
      totalDays,
      paidDays,
      unpaidDays,
      byType,
      byDepartment: Object.values(byDepartment),
    };
  },

  salaryCostProjection: async (monthsAhead = 12) => {
    type SalaryEmployee = Prisma.EmployeeGetPayload<{
      include: { salaryStructures: true };
    }>;

    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
      include: {
        salaryStructures: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      },
    });

    const monthlyCost = (employees as SalaryEmployee[]).reduce((sum: number, e: SalaryEmployee) => {
      const s = e.salaryStructures?.[0];
      if (!s) return sum;
      const base = s.baseSalary || 0;
      const allowances = s.allowances || 0;
      return sum + base + allowances;
    }, 0);

    const projections: Array<{ period: string; projectedGross: number }> = [];
    const now = new Date();
    for (let i = 0; i < Math.max(1, monthsAhead); i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      projections.push({ period, projectedGross: monthlyCost });
    }

    return { monthlyCost, headcount: employees.length, projections };
  },

  departmentProductivity: async (period?: string) => {
    const where: any = {};
    if (period) {
      const [y, m] = period.split("-").map(Number);
      const start = new Date(y, (m || 1) - 1, 1);
      const end = new Date(y, (m || 1), 0, 23, 59, 59, 999);
      where.dueDate = { gte: start, lte: end };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
    });

    const byDept: Record<string, any> = {};
    for (const task of tasks) {
      const deptId = task.departmentId || "unassigned";
      const name = task.department?.name || "Unassigned";
      const bucket = byDept[deptId] || { departmentId: deptId, departmentName: name, total: 0, completed: 0 };
      bucket.total += 1;
      if (task.status === "COMPLETED") bucket.completed += 1;
      byDept[deptId] = bucket;
    }
    return Object.values(byDept).map((d: any) => ({
      ...d,
      completionRate: d.total > 0 ? (d.completed / d.total) * 100 : 0,
    }));
  },

  productivityByShift: async (period?: string) => {
    const where: any = {};
    if (period) {
      const [y, m] = period.split("-").map(Number);
      const start = new Date(y, (m || 1) - 1, 1);
      const end = new Date(y, (m || 1), 0, 23, 59, 59, 999);
      where.dueDate = { gte: start, lte: end };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: { employee: { select: { id: true, shift: { select: { id: true, name: true, type: true } } } } },
    });

    const byShift: Record<string, any> = {};
    for (const task of tasks) {
      const shift = task.employee?.shift;
      const shiftKey = shift?.id || "unassigned";
      const bucket = byShift[shiftKey] || {
        shiftId: shift?.id || null,
        shiftName: shift?.name || "Unassigned",
        shiftType: shift?.type || "UNASSIGNED",
        total: 0,
        completed: 0,
      };
      bucket.total += 1;
      if (task.status === "COMPLETED") bucket.completed += 1;
      byShift[shiftKey] = bucket;
    }

    return Object.values(byShift).map((d: any) => ({
      ...d,
      completionRate: d.total > 0 ? (d.completed / d.total) * 100 : 0,
    }));
  },

  retirementForecast: async (monthsAhead = 12) => {
    const now = new Date();
    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + monthsAhead);
    const retirementAge = Number(process.env.RETIREMENT_AGE || 60);

    const employees = await prisma.employee.findMany({
      where: { dateOfBirth: { not: null }, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true, departmentId: true },
    });

    return employees
      .map((e: { id: string; firstName: string; lastName: string; dateOfBirth?: Date | null; departmentId?: string | null }) => {
        const dob = e.dateOfBirth ? new Date(e.dateOfBirth) : null;
        if (!dob) return null;
        const retirementDate = new Date(dob);
        retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);
        const monthsLeft = (retirementDate.getFullYear() - now.getFullYear()) * 12 + (retirementDate.getMonth() - now.getMonth());
        return {
          employeeId: e.id,
          name: `${e.firstName} ${e.lastName}`,
          retirementDate,
          monthsLeft,
          departmentId: e.departmentId,
        };
      })
      .filter((e: any) => e && e.retirementDate <= horizon);
  },
});

function overlapDays(startA: Date, endA: Date, startB: Date, endB: Date) {
  const start = new Date(Math.max(startA.getTime(), startB.getTime()));
  const end = new Date(Math.min(endA.getTime(), endB.getTime()));
  if (end < start) return 0;
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.floor((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
  return diff + 1;
}