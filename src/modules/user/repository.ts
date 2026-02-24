import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const UserRepository = (prisma = prismaDefault) => ({
  findById: async (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true
          }
        }
      },
    }),

  create: async (data: Prisma.UserCreateInput) =>
    prisma.user.create({
      data,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    }),

  update: async (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data }),

  list: async (skip = 0, take = 50) => {
    const items = await prisma.user.findMany({
      skip, 
      take, 
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true
          }
        }
      }
    });

    const total = await prisma.user.count();
    return { items, total };
  },

  delete: async (id: string) => prisma.user.delete({ where: { id } }),
});