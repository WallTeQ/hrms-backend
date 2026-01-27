import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";

export const PayrollRepository = (prisma = prismaDefault) => ({
  // Salary structures
  createSalaryStructure: async (data: Prisma.SalaryStructureCreateInput) =>
    prisma.salaryStructure.create({ data }),
  updateSalaryStructure: async (id: string, data: Prisma.SalaryStructureUpdateInput) => prisma.salaryStructure.update({ where: { id }, data }),
  deleteSalaryStructure: async (id: string) => prisma.salaryStructure.delete({ where: { id } }),

  getSalaryStructuresForEmployee: async (employeeId: string, skip = 0, take = 50) => {
    const items = await prisma.salaryStructure.findMany({ where: { employeeId }, skip, take, orderBy: { effectiveFrom: "desc" } });
    const total = await prisma.salaryStructure.count({ where: { employeeId } });
    return { items, total };
  },

  listSalaryStructures: async (skip = 0, take = 50) => {
    const items = await prisma.salaryStructure.findMany({ skip, take, orderBy: { effectiveFrom: "desc" } });
    const total = await prisma.salaryStructure.count();
    return { items, total };
  },

  // Payroll runs
  createPayrollRun: async (data: Prisma.PayrollRunCreateInput) =>
    prisma.payrollRun.create({ data }),
  updatePayrollRun: async (id: string, data: Prisma.PayrollRunUpdateInput) => prisma.payrollRun.update({ where: { id }, data }),
  deletePayrollRun: async (id: string) => prisma.payrollRun.delete({ where: { id } }),

  findPayrollRun: async (id: string) =>
    prisma.payrollRun.findUnique({ where: { id }, include: { payslips: true } }),

  listPayrollRuns: async (skip = 0, take = 20) => {
    const items = await prisma.payrollRun.findMany({ skip, take, orderBy: { runAt: "desc" } });
    const total = await prisma.payrollRun.count();
    return { items, total };
  },

  findPayrollRunByPeriod: async (period: string) => prisma.payrollRun.findFirst({ where: { period } }),

  // Claim a pending payroll run and mark it PROCESSING (returns true if claimed)
  claimPayrollRun: async (id: string) => {
    const result = await prisma.payrollRun.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'PROCESSING' } as any });
    return result.count > 0;
  },

  // Payslips
  createPayslip: async (data: Prisma.PayslipCreateInput) => prisma.payslip.create({ data }),
  getPayslip: async (id: string) => prisma.payslip.findUnique({ where: { id } }),
  updatePayslip: async (id: string, data: Prisma.PayslipUpdateInput) => prisma.payslip.update({ where: { id }, data }),
  deletePayslip: async (id: string) => prisma.payslip.delete({ where: { id } }),
  listPayslipsForEmployee: async (employeeId: string, skip = 0, take = 20) => {
    // Run both queries in parallel to overlap round-trips and reduce latency
    const [items, total] = await Promise.all([
      prisma.payslip.findMany({
        where: { employeeId },
        skip,
        take,
        orderBy: { generatedAt: "desc" },
        // select only necessary fields to minimize payload
        select: {
          id: true,
          payrollRunId: true,
          employeeId: true,
          gross: true,
          net: true,
          month: true,
          year: true,
          fileUrl: true,
          publicId: true,
          mimeType: true,
          size: true,
          generatedAt: true,
        },
      }),
      prisma.payslip.count({ where: { employeeId } }),
    ]);
    return { items, total };
  },

  // Get payslips within a date range (inclusive)
  listPayslipsInRange: async (start?: Date, end?: Date) => {
    const where: any = {};
    if (start || end) where.generatedAt = {} as any;
    if (start) where.generatedAt.gte = start;
    if (end) where.generatedAt.lte = end;

    const items = await prisma.payslip.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      include: { payrollRun: { select: { id: true, period: true } }, employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    return items;
  },

  // Get payslips for a particular period (YYYY-MM)
  listPayslipsByPeriod: async (year: number, month: number) => {
    const items = await prisma.payslip.findMany({
      where: { year, month },
      orderBy: { generatedAt: "desc" },
      include: { payrollRun: { select: { id: true, period: true } }, employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    return items;
  },

  // List all payslips (paginated)
  listPayslips: async (skip = 0, take = 20) => {
    const [items, total] = await Promise.all([
      prisma.payslip.findMany({
        skip,
        take,
        orderBy: { generatedAt: "desc" },
        include: { payrollRun: { select: { id: true, period: true } }, employee: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.payslip.count(),
    ]);
    return { items, total };
  },

  // Statutory deductions
  createStatutoryDeduction: async (data: Prisma.StatutoryDeductionCreateInput) =>
    prisma.statutoryDeduction.create({ data }),
  findStatutoryDeduction: async (id: string) => prisma.statutoryDeduction.findUnique({ where: { id } }),
  updateStatutoryDeduction: async (id: string, data: Prisma.StatutoryDeductionUpdateInput) => prisma.statutoryDeduction.update({ where: { id }, data }),
  deleteStatutoryDeduction: async (id: string) => prisma.statutoryDeduction.delete({ where: { id } }),
  listStatutoryDeductions: async () => prisma.statutoryDeduction.findMany(),
});