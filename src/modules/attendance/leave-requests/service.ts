import { prisma as defaultPrisma } from "../../../infra/database.js";
import type { LeaveRequest, Prisma } from ".prisma/client";

const prisma = defaultPrisma as any;

export const LeaveRequestService = {
  create: async (data: Prisma.LeaveRequestCreateInput) => prisma.leaveRequest.create({ data }),
  find: async (id: string) => prisma.leaveRequest.findUnique({ where: { id } }),
  listForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    prisma.leaveRequest.findMany({ where: { employeeId }, skip, take, orderBy: { createdAt: "desc" } }),
  updateStatus: async (id: string, status: string) => prisma.leaveRequest.update({ where: { id }, data: { status } }),
  update: async (id: string, data: Prisma.LeaveRequestUpdateInput) => prisma.leaveRequest.update({ where: { id }, data }),
  delete: async (id: string) => prisma.leaveRequest.delete({ where: { id } }),
};
