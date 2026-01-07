import prismaDefault from "../../infra/database";
// Use types from the generated Prisma client
import type { Prisma } from "../../generated/prisma";

export type EmployeeFilters = {
  search?: string;
  status?: string;
  skip?: number;
  take?: number;
};

export const EmployeeRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.EmployeeCreateInput) =>
    prisma.employee.create({ data }),

  findById: async (id: string) =>
    prisma.employee.findUnique({ where: { id } }),

  findByEmail: async (email: string) =>
    prisma.employee.findUnique({ where: { email } }),

  list: async (filters: EmployeeFilters = {}) => {
    const { search, status, skip = 0, take = 20 } = filters;
    return prisma.employee.findMany({
      where: {
        AND: [
          status ? { status } : {},
          search
            ? {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" } },
                  { lastName: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  },

  update: async (id: string, data: Prisma.EmployeeUpdateInput) =>
    prisma.employee.update({ where: { id }, data }),

  softDelete: async (id: string) =>
    prisma.employee.update({ where: { id }, data: { status: "INACTIVE" } }),

  createWithContract: async (employeeData: Prisma.EmployeeCreateInput, contractData: Prisma.ContractCreateInput) =>
    prisma.$transaction([
      prisma.employee.create({ data: employeeData }),
      prisma.contract.create({ data: contractData }),
    ]),

  // any complex/aggregate queries can live here (reports, headcount, etc.)
});