import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const UserRepository = (prisma = prismaDefault) => ({
  findById: async (id: string, user?: any) => {
    // Apply role-based access control
    if (user) {
      switch (user.role) {
        case 'EMPLOYEE':
        case 'SUPERVISOR':
        case 'BOARD':
          // These roles cannot see other users
          if (user.id !== id) return null;
          break;
        case 'HR_ADMIN':
          // HR_ADMIN can see all users
          break;
        default:
          return null;
      }
    }

    return prisma.user.findUnique({ 
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
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
  },

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

  list: async (skip = 0, take = 50, user?: any) => {
    // Apply role-based access control
    if (user) {
      switch (user.role) {
        case 'EMPLOYEE':
        case 'SUPERVISOR':
        case 'BOARD':
          // These roles cannot see other users
          return { items: [], total: 0 };
        case 'HR_ADMIN':
          // HR_ADMIN can see all users
          break;
        default:
          return { items: [], total: 0 };
      }
    }

    const items = await prisma.user.findMany({ 
      skip, 
      take, 
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
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