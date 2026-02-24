import { AttendanceRepository } from "./repository.js";
import type { AttendanceEntryMethod, AttendanceStatus, Prisma } from ".prisma/client";
import type { CreateAttendanceDto } from "./schema.js";
import prismaDefault from "../../infra/database.js";
import { AttendancePolicy } from "../../common/policies.js";
import { serviceGuard } from "../../common/domain/service.js";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../common/domain/errors.js";

const repo = AttendanceRepository();

export const AttendanceService = {
  markAttendance: async (input: {
    employeeId: string;
    date: string | Date;
    status?: AttendanceStatus;
    clockIn?: string | Date;
    clockOut?: string | Date;
    entryMethod?: AttendanceEntryMethod;
    recordedByUserId?: string;
    overtimeApproved?: boolean;
    notes?: string | null;
  }) =>
    serviceGuard(async () => {
      const dateStr = typeof input.date === "string" ? input.date : input.date.toISOString().slice(0, 10);
      const date = typeof input.date === "string" ? new Date(input.date) : input.date;
      const clockIn =
        input.clockIn instanceof Date
          ? input.clockIn
          : input.clockIn
          ? new Date(`${dateStr}T${input.clockIn}:00`)
          : undefined;
      const clockOut =
        input.clockOut instanceof Date
          ? input.clockOut
          : input.clockOut
          ? new Date(`${dateStr}T${input.clockOut}:00`)
          : undefined;

      if (date > new Date()) {
        throw new ValidationError("Cannot mark attendance for a future date");
      }

      const employee = await prismaDefault.employee.findUnique({
        where: { id: input.employeeId },
        select: { id: true, shift: true, shiftId: true },
      });

      if (!employee) {
        throw new NotFoundError("Employee not found", { employeeId: input.employeeId });
      }

      if (!input.status && !clockIn && !clockOut) {
        throw new ValidationError("Either status or clockIn/clockOut must be provided");
      }

      const shift = ensureShift(employee);
      const computed = computeAttendanceMetrics(date, clockIn, clockOut, shift);
      let status = input.status;

      if (!status && (clockIn || clockOut)) {
        if (computed.lateMinutes && computed.lateMinutes > 0 && shift.punctualityApplies) {
          status = "LATE" as AttendanceStatus;
        } else {
          status = "PRESENT" as AttendanceStatus;
        }
      }

      const payload: Prisma.AttendanceUpdateInput = {
        status,
        clockIn,
        clockOut,
        entryMethod: input.entryMethod || "SYSTEM",
        recordedByUserId: input.recordedByUserId || undefined,
        overtimeApproved: input.overtimeApproved ?? undefined,
        notes: input.notes ?? undefined,
        workMinutes: computed.workMinutes ?? undefined,
        overtimeMinutes: computed.overtimeMinutes ?? undefined,
        lateMinutes: computed.lateMinutes ?? undefined,
        earlyDepartureMinutes: computed.earlyDepartureMinutes ?? undefined,
      } as any;

      const result = await prismaDefault.$transaction(async (tx: Prisma.TransactionClient) => {
        const txRepo = AttendanceRepository(tx as any);
        const updated = await txRepo.mark(input.employeeId, date, status, clockIn, clockOut, payload as any);
        if (status === "ABSENT") {
          await maybeTriggerAbsenceAlert(input.employeeId, date, tx as any);
        }
        return updated;
      });

      return result;
    }),

  create: async (data: CreateAttendanceDto, opts?: { recordedByUserId?: string }) =>
    serviceGuard(async () => {
      const attendanceDate = new Date(data.date);

      if (attendanceDate > new Date()) {
        throw new ValidationError("Cannot create attendance record for a future date");
      }

      const employee = await prismaDefault.employee.findUnique({
        where: { id: data.employeeId },
        select: { id: true, shift: true, shiftId: true },
      });

      if (!employee) {
        throw new NotFoundError("Employee not found", { employeeId: data.employeeId });
      }

      return prismaDefault.$transaction(async (tx: Prisma.TransactionClient) => {
        const existingAttendance = await tx.attendance.findFirst({
          where: {
            employeeId: data.employeeId,
            date: attendanceDate,
          },
          select: { id: true },
        });

        if (existingAttendance) {
          throw new ValidationError("Attendance record already exists for this employee on the specified date");
        }

        const clockIn = data.clockIn ? new Date(`${data.date}T${data.clockIn}:00`) : undefined;
        const clockOut = data.clockOut ? new Date(`${data.date}T${data.clockOut}:00`) : undefined;
        const shift = ensureShift(employee);
        const computed = computeAttendanceMetrics(attendanceDate, clockIn, clockOut, shift);

        const createData: Prisma.AttendanceCreateInput = {
          employee: { connect: { id: data.employeeId } },
          date: attendanceDate,
          status: data.status,
          clockIn,
          clockOut,
          entryMethod: data.entryMethod || "SYSTEM",
          recordedByUser: opts?.recordedByUserId ? { connect: { id: opts.recordedByUserId } } : undefined,
          overtimeApproved: data.overtimeApproved ?? false,
          notes: data.notes ?? undefined,
          workMinutes: computed.workMinutes ?? undefined,
          overtimeMinutes: computed.overtimeMinutes ?? undefined,
          lateMinutes: computed.lateMinutes ?? undefined,
          earlyDepartureMinutes: computed.earlyDepartureMinutes ?? undefined,
        };

        const txRepo = AttendanceRepository(tx as any);
        const created = await txRepo.create(createData);
        if (data.status === "ABSENT") {
          await maybeTriggerAbsenceAlert(data.employeeId, attendanceDate, tx as any);
        }
        return created;
      });
    }),

  getById: async (id: string) => serviceGuard(async () => repo.findById(id)),

  update: async (id: string, data: Prisma.AttendanceUpdateInput) => serviceGuard(async () => repo.update(id, data)),

  delete: async (id: string) => serviceGuard(async () => repo.delete(id)),

  list: async (filters: { employeeId?: string; startDate?: Date; endDate?: Date; skip?: number; take?: number } = {}, actor?: { role?: string; employeeId?: string }) =>
    serviceGuard(async () => {
      const { employeeId, startDate, endDate, skip, take } = filters;
      const role = actor?.role || "anonymous";
      let filterEmployeeId = employeeId;

      if (!actor?.role) {
        throw new UnauthorizedError("Authentication required");
      }

      switch (role) {
        case "EMPLOYEE":
          filterEmployeeId = actor.employeeId;
          break;
        case "DEPARTMENT_HEAD":
        case "PAYROLL_OFFICER":
        case "HR_ADMIN":
        case "SUPER_ADMIN":
          break;
        default:
          throw new ForbiddenError("Access denied");
      }

      return repo.list({ employeeId: filterEmployeeId, startDate, endDate, skip, take });
    }),

  clockOut: async (employeeId: string) =>
    serviceGuard(async () => {
      if (!employeeId) {
        throw new ValidationError("Employee ID is required");
      }
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      return prismaDefault.$transaction(async (tx: Prisma.TransactionClient) => {
        const existingRecord = await tx.attendance.findFirst({
          where: {
            employeeId,
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (!existingRecord) {
          throw new NotFoundError("No check-in record found for today", { employeeId });
        }

        if (existingRecord.clockOut) {
          throw new ValidationError("Already checked out for today", { employeeId });
        }

        const clockOutTime = new Date();
        const txRepo = AttendanceRepository(tx as any);
        return txRepo.update(existingRecord.id, {
          clockOut: clockOutTime,
        });
      });
    }),
};

async function maybeTriggerAbsenceAlert(employeeId: string, date: Date, prisma: Prisma.TransactionClient | typeof prismaDefault = prismaDefault) {
  const latest = await prisma.attendance.findMany({
    where: { employeeId, date: { lte: date } },
    orderBy: { date: "desc" },
    take: AttendancePolicy.maxUnapprovedAbsencesAlert,
  });

  if (latest.length < AttendancePolicy.maxUnapprovedAbsencesAlert) return;

  const absences = latest.every((rec: { status: string }) => rec.status === "ABSENT");
  if (!absences) return;

  // Ensure consecutive dates
  for (let i = 0; i < latest.length - 1; i++) {
    const current = new Date(latest[i].date);
    const next = new Date(latest[i + 1].date);
    const diffDays = Math.round((current.getTime() - next.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays !== 1) return;
  }

  await prisma.notification.create({
    data: {
      employeeId,
      type: "ABSENCE_ALERT",
      channel: "SYSTEM",
      payload: { message: "3 consecutive unapproved absences" } as any,
    },
  });
}

function computeAttendanceMetrics(date: Date, clockIn?: Date, clockOut?: Date, shift?: ShiftConfig) {
  if (!clockIn || !clockOut || !shift) {
    return { workMinutes: null, overtimeMinutes: null, lateMinutes: null, earlyDepartureMinutes: null };
  }

  const baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const workMinutes = Math.max(0, Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000));

  if (shift.isFlexible || !shift.punctualityApplies) {
    const expectedMinutes = Math.max(0, Math.round(shift.expectedHours * 60));
    const overtimeMinutes = Math.max(0, workMinutes - expectedMinutes);
    return { workMinutes, overtimeMinutes, lateMinutes: 0, earlyDepartureMinutes: 0 };
  }

  const workStart = withTime(baseDate, shift.startTime || AttendancePolicy.workdayStart);
  const workEnd = withTime(baseDate, shift.endTime || AttendancePolicy.workdayEnd);
  const lateAfter = addMinutes(workStart, shift.graceMinutes ?? AttendancePolicy.graceMinutes);
  const earlyBefore = addMinutes(workEnd, -(shift.earlyDepartureMinutes ?? 0));

  const overtimeMinutes = Math.max(0, Math.floor((clockOut.getTime() - workEnd.getTime()) / 60000));
  const lateMinutes = Math.max(0, Math.floor((clockIn.getTime() - lateAfter.getTime()) / 60000));
  const earlyDepartureMinutes = Math.max(0, Math.floor((earlyBefore.getTime() - clockOut.getTime()) / 60000));

  return { workMinutes, overtimeMinutes, lateMinutes, earlyDepartureMinutes };
}

function withTime(baseDate: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(hours || 0, minutes || 0, 0, 0);
  return d;
}

function addMinutes(date: Date, minutes: number) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

type ShiftConfig = {
  startTime?: string | null;
  endTime?: string | null;
  expectedHours: number;
  graceMinutes?: number | null;
  earlyDepartureMinutes?: number | null;
  punctualityApplies: boolean;
  isFlexible: boolean;
};

function ensureShift(employee: { shift?: any; shiftId?: string | null }) {
  if (!employee?.shift) {
    throw new ValidationError("Employee shift assignment is required for attendance");
  }
  return {
    startTime: employee.shift.startTime,
    endTime: employee.shift.endTime,
    expectedHours: employee.shift.expectedHours || AttendancePolicy.hoursPerDay,
    graceMinutes: employee.shift.graceMinutes ?? AttendancePolicy.graceMinutes,
    earlyDepartureMinutes: employee.shift.earlyDepartureMinutes ?? 0,
    punctualityApplies: employee.shift.punctualityApplies !== false,
    isFlexible: employee.shift.isFlexible === true,
  } as ShiftConfig;
}
