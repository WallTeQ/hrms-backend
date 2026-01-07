import { AttendanceRepository } from "./repository";
import type { Prisma } from "../../generated/prisma";

const repo = AttendanceRepository();

export const AttendanceService = {
  markAttendance: async (employeeId: string, date: Date, status: Prisma.AttendanceStatus) => {
    if (date > new Date()) {
      throw new Error("Cannot mark attendance for a future date");
    }
    return repo.mark(employeeId, date, status);
  },

  create: async (data: Prisma.AttendanceCreateInput) => repo.create(data),

  getById: async (id: string) => repo.findById(id),

  update: async (id: string, data: Prisma.AttendanceUpdateInput) => repo.update(id, data),

  delete: async (id: string) => repo.delete(id),

  list: async (filters: { employeeId?: string; startDate?: Date; endDate?: Date; skip?: number; take?: number } = {}) => {
    const { employeeId, startDate, endDate, skip, take } = filters;
    return repo.list({ employeeId, startDate, endDate, skip, take });
  },

};
