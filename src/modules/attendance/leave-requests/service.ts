import { prisma as defaultPrisma } from "../../../infra/database.js";
import type { Prisma } from ".prisma/client";
import { LeavePolicy } from "../../../common/policies.js";
import { serviceGuard } from "../../../common/domain/service.js";
import { NotFoundError, ValidationError } from "../../../common/domain/errors.js";

const prisma = defaultPrisma as any;

export const LeaveRequestService = {
  create: async (data: Prisma.LeaveRequestCreateInput) =>
    serviceGuard(async () => {
      const start = new Date((data as any).startDate);
      const end = new Date((data as any).endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw new ValidationError("Invalid date range");
      }

    const requestedDays = calculateDaysInclusive(start, end);
    const type = (data as any).type as string;
    const specialApproval = Boolean((data as any).specialApproval);
    const medicalCertificateUrl = (data as any).medicalCertificateUrl as string | undefined;

      if (type === "ANNUAL" && requestedDays > LeavePolicy.annualMaxConsecutiveWithoutApproval && !specialApproval) {
        throw new ValidationError("ANNUAL leave exceeds max consecutive days without special approval");
      }

      if (type === "SICK" && requestedDays > LeavePolicy.sickMedicalCertificateAfterDays && !medicalCertificateUrl) {
        throw new ValidationError("Medical certificate required for extended sick leave");
      }

    const isPaid = (data as any).isPaid ?? LeavePolicy.paidLeaveTypes.includes(type as any);

    const payload: Prisma.LeaveRequestCreateInput = {
      ...data,
      isPaid,
      status: "PENDING_SUPERVISOR" as any,
    } as any;

    if ((data as any).employeeId) {
      // For annual leave ensure balance exists, apply carry-forward, and check availability
      if (type === "ANNUAL") {
        const employeeId = (data as any).employeeId as string;
        const available = await getAnnualLeaveAvailable(employeeId, start);
        if (requestedDays > available) {
          throw new ValidationError("Insufficient annual leave balance");
        }
      }
    }

      return prisma.leaveRequest.create({ data: payload });
    }),
  find: async (id: string) => serviceGuard(async () => prisma.leaveRequest.findUnique({ where: { id } })),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    serviceGuard(async () => prisma.leaveRequest.findMany({ where: { employeeId }, skip, take, orderBy: { createdAt: "desc" } })),
  updateStatus: async (id: string, status: string, actorId?: string) =>
    serviceGuard(async () => {
      const existing = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!existing) throw new NotFoundError("Leave request not found", { leaveRequestId: id });

    const updates: Prisma.LeaveRequestUpdateInput = { status } as any;
    const now = new Date();

    if (status === "PENDING_HR") {
      updates.supervisorApprovedAt = now;
      if (actorId) {
        updates.supervisorApprovedByUser = { connect: { id: actorId } } as any;
      }
    }

    if (status === "APPROVED") {
      updates.finalApprovedAt = now;
      if (actorId) {
        updates.finalApprovedByUser = { connect: { id: actorId } } as any;
      }

      // If not already marked by HR, set HR approval too
      if (!existing.hrApprovedAt) {
        updates.hrApprovedAt = now;
        if (actorId) {
          updates.hrApprovedByUser = { connect: { id: actorId } } as any;
        }
      }
    }

    const updated = await prisma.leaveRequest.update({ where: { id }, data: updates });

    if (status === "APPROVED") {
      await applyLeaveToAttendance(updated);
      if (updated.type === "ANNUAL") {
        await decrementAnnualLeaveBalance(updated);
      }
    }

      return updated;
    }),
  update: async (id: string, data: Prisma.LeaveRequestUpdateInput) => serviceGuard(async () => prisma.leaveRequest.update({ where: { id }, data })),
  delete: async (id: string) => serviceGuard(async () => prisma.leaveRequest.delete({ where: { id } })),
};

function calculateDaysInclusive(start: Date, end: Date) {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.floor((endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000));
  return diff + 1;
}

async function getAnnualLeaveAvailable(employeeId: string, startDate: Date) {
  const year = startDate.getFullYear();
  const existing = await prisma.leaveBalance.findFirst({ where: { employeeId, year } });
  if (existing) return existing.balance;

  // Carry-forward from previous year, capped and expiring after configured months
  const prev = await prisma.leaveBalance.findFirst({ where: { employeeId, year: year - 1 } });
  let carryForward = Math.min(prev?.balance ?? 0, LeavePolicy.annualCarryForwardDays);

  const carryExpiry = new Date(year, LeavePolicy.annualCarryForwardExpiresMonths, 1);
  if (startDate >= carryExpiry) {
    carryForward = 0;
  }

  const initialBalance = LeavePolicy.annualDaysPerYear + carryForward;
  await prisma.leaveBalance.upsert({
    where: { employeeId_year: { employeeId, year } } as any,
    update: { balance: initialBalance },
    create: { employeeId, year, balance: initialBalance },
  });

  return initialBalance;
}

async function applyLeaveToAttendance(leave: any) {
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  const days = calculateDaysInclusive(start, end);

  for (let i = 0; i < days; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const existing = await prisma.attendance.findFirst({
      where: { employeeId: leave.employeeId, date: normalized },
    });

    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status: "ON_LEAVE", entryMethod: "SYSTEM", leaveRequestId: leave.id } as any,
      });
      continue;
    }

    await prisma.attendance.create({
      data: {
        employeeId: leave.employeeId,
        date: normalized,
        status: "ON_LEAVE",
        entryMethod: "SYSTEM",
        leaveRequestId: leave.id,
      } as any,
    });
  }
}

async function decrementAnnualLeaveBalance(leave: any) {
  const start = new Date(leave.startDate);
  const days = calculateDaysInclusive(start, new Date(leave.endDate));
  const year = start.getFullYear();
  const balance = await prisma.leaveBalance.findFirst({ where: { employeeId: leave.employeeId, year } });
  const available = balance?.balance ?? LeavePolicy.annualDaysPerYear;
  const updated = Math.max(0, available - days);
  await prisma.leaveBalance.upsert({
    where: { employeeId_year: { employeeId: leave.employeeId, year } } as any,
    update: { balance: updated },
    create: { employeeId: leave.employeeId, year, balance: updated },
  });
}
