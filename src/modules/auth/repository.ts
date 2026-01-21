import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const AuthRepository = (prisma = prismaDefault) => ({
  createUser: async (data: Prisma.UserCreateInput) =>
    prisma.user.create({ data }),

  findById: async (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  findByEmail: async (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  updatePassword: async (id: string, hashedPassword: string) =>
    prisma.user.update({ where: { id }, data: { password: hashedPassword } }),

  setEmployeeLink: async (userId: string, employeeId: string) =>
    prisma.user.update({ where: { id: userId }, data: { employeeId } }),
});