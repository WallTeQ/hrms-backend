import prismaDefault from "../../infra/database.js";
// Use types from the generated Prisma client
import type { Prisma } from '@prisma/client';

export type EmployeeFilters = {
  search?: string;
  status?: string;
  skip?: number;
  take?: number;
};

export const EmployeeRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.EmployeeCreateInput) =>
    prisma.employee.create({ data }),

  findById: async (id: string, user?: any) => {
    // Apply role-based access control
    if (user) {
      switch (user.role) {
        case 'EMPLOYEE':
          // EMPLOYEE can only see themselves
          if (!user.employeeId || user.employeeId !== id) {
            return null;
          }
          break;
        case 'SUPERVISOR':
          // SUPERVISOR can see all employees (TODO: restrict to direct reports)
          break;
        case 'HR_ADMIN':
          // HR_ADMIN can see all
          break;
        case 'BOARD':
          // BOARD cannot see individual employee records
          return null;
        default:
          return null;
      }
    }

    return prisma.employee.findUnique({ 
      where: { id },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        status: true,
        hireDate: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } },
        contracts: { 
          select: { id: true, title: true, startDate: true, endDate: true },
          orderBy: { startDate: "desc" },
          take: 1
        },
        salaryStructures: { 
          select: { id: true, baseSalary: true, effectiveFrom: true },
          orderBy: { effectiveFrom: "desc" },
          take: 1
        },
        leaveBalances: { 
          select: { id: true, year: true, balance: true },
          where: { year: new Date().getFullYear() }
        },
      }
    }).then((emp: any) => emp ? {
      ...emp,
      position: emp.contracts?.[0]?.title || null,
      currentSalary: emp.salaryStructures?.[0]?.baseSalary || null,
    } : null);
  },

  findByEmail: async (email: string) =>
    prisma.employee.findUnique({ where: { email } }),

  list: async (filters: EmployeeFilters = {}, user?: any, includes?: string[]) => {
    const { search, status, skip = 0, take = 20 } = filters;

    // Build base where clause
    let whereClause: any = {
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
    };

    // Apply role-based filtering
    if (user) {
      switch (user.role) {
        case 'EMPLOYEE':
          // EMPLOYEE can only see themselves
          if (user.employeeId) {
            whereClause.AND.push({ id: user.employeeId });
          } else {
            // No employee record, return empty
            return { items: [], total: 0 };
          }
          break;
        case 'SUPERVISOR':
          // SUPERVISOR can see all employees (since no supervisor relationship in schema yet)
          // TODO: Filter to direct reports when supervisor field is added
          break;
        case 'HR_ADMIN':
          // HR_ADMIN can see all
          break;
        case 'BOARD':
          // BOARD cannot see individual employee records, only aggregated data
          return { items: [], total: 0 };
        default:
          return { items: [], total: 0 };
      }
    }

    // Default select: only essential fields
    const selectObj: any = {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      status: true,
      hireDate: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } },
    };

    // Add includes only if explicitly requested
    if (includes?.includes('contracts')) {
      selectObj.contracts = { 
        select: { id: true, title: true, startDate: true, endDate: true },
        orderBy: { startDate: "desc" },
        take: 1 // Only latest contract for position
      };
    }
    if (includes?.includes('documents')) {
      selectObj.documents = { 
        select: { id: true, type: true, name: true, createdAt: true },
        take: 5 // Limit to recent documents
      };
    }
    if (includes?.includes('disciplinaryRecords')) {
      selectObj.disciplinaryRecords = { 
        select: { id: true, incident: true, action: true, date: true },
        take: 3 // Limit to recent records
      };
    }
    // Other includes remain optional and limited
    if (includes?.includes('salaryStructures')) {
      selectObj.salaryStructures = { 
        select: { id: true, baseSalary: true, effectiveFrom: true },
        orderBy: { effectiveFrom: "desc" },
        take: 1
      };
    }
    if (includes?.includes('trainings')) {
      selectObj.trainings = { 
        select: { id: true, completedAt: true, training: { select: { title: true } } },
        take: 5
      };
    }
    if (includes?.includes('attendances')) {
      selectObj.attendances = { 
        select: { id: true, date: true, status: true },
        orderBy: { date: "desc" },
        take: 10
      };
    }
    if (includes?.includes('leaveRequests')) {
      selectObj.leaveRequests = { 
        select: { id: true, type: true, startDate: true, endDate: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 5
      };
    }
    if (includes?.includes('leaveBalances')) {
      selectObj.leaveBalances = { 
        select: { id: true, year: true, balance: true },
        where: { year: new Date().getFullYear() }
      };
    }
    if (includes?.includes('evaluations')) {
      selectObj.evaluations = { 
        select: { id: true, score: true, period: true },
        orderBy: { createdAt: "desc" },
        take: 3
      };
    }
    if (includes?.includes('payslips')) {
      selectObj.payslips = { 
        select: { id: true, gross: true, net: true, generatedAt: true },
        orderBy: { generatedAt: "desc" },
        take: 3
      };
    }

    const [items, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        select: selectObj,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }).then((employees: any) =>
        employees.map((emp: any) => ({
          ...emp,
          position: emp.contracts?.[0]?.title || null,
        }))
      ),
      prisma.employee.count({ where: whereClause }),
    ]);

    return { items, total };
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