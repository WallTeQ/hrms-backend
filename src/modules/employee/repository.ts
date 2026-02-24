import prismaDefault from "../../infra/database.js";
// Use types from the generated Prisma client
import type { Prisma } from '@prisma/client';

export type EmployeeFilters = {
  search?: string;
  status?: string;
  employeeId?: string;
  skip?: number;
  take?: number;
};

export const EmployeeRepository = (prisma = prismaDefault) => ({
  create: async (data: Prisma.EmployeeCreateInput) =>
    prisma.employee.create({ data }),

  findById: async (id: string) =>
    prisma.employee.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        contactNumbers: true,
        mobileMoneyNumber: true,
        photoUrl: true,
        complianceChecklist: true,
        dateOfBirth: true,
        status: true,
        hireDate: true,
        dateOfEmployment: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        shift: { select: { id: true, name: true, type: true, expectedHours: true, isFlexible: true, punctualityApplies: true } },
        primarySkillId: true,
        primarySkill: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } },
        contracts: { 
          select: { id: true, title: true, startDate: true, endDate: true },
          orderBy: { startDate: "desc" },
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
        skills: { select: { id: true, name: true } },
      },
    }).then((emp: any) => emp ? {
      ...emp,
      position: emp.contracts?.[0]?.title || null,
      currentSalary: emp.salaryStructures?.[0]?.baseSalary || null,
    } : null),

  findByEmail: async (email: string) =>
    prisma.employee.findUnique({ where: { email } }),

  list: async (filters: EmployeeFilters = {}, includes?: string[]) => {
    const { search, status, employeeId, skip = 0, take = 20 } = filters;

    // Build base where clause
    let whereClause: any = {
      AND: [
        status ? { status } : {},
        employeeId ? { id: employeeId } : {},
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

    // Default select: only essential fields
    const selectObj: any = {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      contactNumbers: true,
      mobileMoneyNumber: true,
      photoUrl: true,
      dateOfBirth: true,
      status: true,
      hireDate: true,
      dateOfEmployment: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
      shift: { select: { id: true, name: true, type: true, expectedHours: true, isFlexible: true, punctualityApplies: true } },
      primarySkillId: true,
      primarySkill: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, role: true, createdAt: true, updatedAt: true } },
      // contracts intentionally omitted from list to keep list queries fast
      // (contracts are returned by `findById` when fetching a single employee)
      
      skills: { select: { id: true, name: true } },
    };
    // documents are intentionally NOT returned in the employee *list* (table view)
    // — fetching documents should be done via the single-employee endpoint or a dedicated documents endpoint.
    // if (includes?.includes('documents')) {
    //   selectObj.documents = { 
    //     select: { id: true, type: true, name: true, createdAt: true },
    //     take: 5 // Limit to recent documents
    //   };
    // }
    // Large/nested relations (disciplinaryRecords, salaryStructures, trainings,
    // attendances, leaveRequests, leaveBalances, evaluations, payslips) are
    // intentionally NOT returned by the `list` endpoint (table view).  Fetch
    // any of these via the single-employee endpoint `GET /employees/:id` or the
    // dedicated resource endpoints (e.g. `/employees/:id/attendances`).

    // The `includes` parameter no longer enables these heavy relations for the
    // list endpoint; it is ignored here to keep list queries fast and predictable.


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

  createWithContract: async (employeeData: Prisma.EmployeeCreateInput, contractData: Prisma.ContractCreateInput) => {
    const employee = await prisma.employee.create({ data: employeeData });
    const contract = await prisma.contract.create({ data: contractData });
    return [employee, contract];
  },

  // any complex/aggregate queries can live here (reports, headcount, etc.)
});