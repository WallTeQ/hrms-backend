import prismaDefault from "../../infra/database";
import type { Prisma } from "../../generated/prisma";

export const AuthRepository = (prisma = prismaDefault) => ({
  createUser: async (data: Prisma.UserCreateInput) =>
    prisma.user.create({ data }),

  findById: async (id: string) => prisma.user.findUnique({ where: { id } }),

  findByEmail: async (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  updatePassword: async (id: string, hashedPassword: string) =>
    prisma.user.update({ where: { id }, data: { password: hashedPassword } }),

  setEmployeeLink: async (userId: string, employeeId: string) =>
    prisma.user.update({ where: { id: userId }, data: { employeeId } }),

  update: async (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data }),

  list: async (skip = 0, take = 50) =>
    prisma.user.findMany({ skip, take, orderBy: { createdAt: "desc" } }),

  delete: async (id: string) => prisma.user.delete({ where: { id } }),
});