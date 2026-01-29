import { AttendanceRepository } from "./repository.js";
import type { AttendanceStatus, Prisma } from ".prisma/client";
import type { CreateAttendanceDto } from "./schema.js";
import prismaDefault from "../../infra/database.js";

const repo = AttendanceRepository();

export const AttendanceService = {
  markAttendance: async (employeeId: string, date: Date, status?: AttendanceStatus, clockIn?: Date, clockOut?: Date) => {
    if (date > new Date()) {
      throw new Error("Cannot mark attendance for a future date");
    }

    // Validate that employee exists
    const employee = await prismaDefault.employee.findUnique({
      where: { id: employeeId },
      select: { id: true }
    });

    if (!employee) {
      throw new Error("Invalid employee ID provided");
    }

    if (!status && !clockIn && !clockOut) {
      throw new Error("Either status or clockIn/clockOut must be provided");
    }

    if (!status && (clockIn || clockOut)) {
      status = "PRESENT" as AttendanceStatus;
    }

    return repo.mark(employeeId, date, status, clockIn, clockOut);
  },

  create: async (data: CreateAttendanceDto) => {
    const attendanceDate = new Date(data.date);
    
    // Validate date is not in the future
    if (attendanceDate > new Date()) {
      throw new Error("Cannot create attendance record for a future date");
    }

    // Validate that employee exists
    const employee = await prismaDefault.employee.findUnique({
      where: { id: data.employeeId },
      select: { id: true }
    });
    
    if (!employee) {
      throw new Error("Invalid employee ID provided");
    }

    // Check for existing attendance record for this employee on this date
    const existingAttendance = await prismaDefault.attendance.findFirst({
      where: { 
        employeeId: data.employeeId, 
        date: attendanceDate 
      },
      select: { id: true }
    });

    if (existingAttendance) {
      throw new Error("Attendance record already exists for this employee on the specified date");
    }

    const createData: Prisma.AttendanceCreateInput = {
      employee: { connect: { id: data.employeeId } },
      date: attendanceDate,
      status: data.status,
      clockIn: data.clockIn ? new Date(`${data.date}T${data.clockIn}:00`) : undefined,
      clockOut: data.clockOut ? new Date(`${data.date}T${data.clockOut}:00`) : undefined,
    };
    return repo.create(createData);
  },

  getById: async (id: string) => repo.findById(id),

  update: async (id: string, data: Prisma.AttendanceUpdateInput) => repo.update(id, data),

  delete: async (id: string) => repo.delete(id),

  list: async (filters: { employeeId?: string; startDate?: Date; endDate?: Date; skip?: number; take?: number } = {}) => {
    const { employeeId, startDate, endDate, skip, take } = filters;
    return repo.list({ employeeId, startDate, endDate, skip, take });
  },

  clockOut: async (employeeId: string) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Find today's attendance record for the employee
    const existingRecord = await prismaDefault.attendance.findFirst({
      where: {
        employeeId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!existingRecord) {
      throw new Error("No check-in record found for today");
    }

    if (existingRecord.clockOut) {
      throw new Error("Already checked out for today");
    }

    const clockOutTime = new Date();

    return repo.update(existingRecord.id, {
      clockOut: clockOutTime,
    });
  },
};
