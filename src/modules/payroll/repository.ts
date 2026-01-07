import prismaDefault from "../../infra/database";
import type { Prisma } from "../../generated/prisma";

export const PayrollRepository = (prisma = prismaDefault) => ({
  // Salary structures
  createSalaryStructure: async (data: Prisma.SalaryStructureCreateInput) =>
    prisma.salaryStructure.create({ data }),
  updateSalaryStructure: async (id: string, data: Prisma.SalaryStructureUpdateInput) => prisma.salaryStructure.update({ where: { id }, data }),
  deleteSalaryStructure: async (id: string) => prisma.salaryStructure.delete({ where: { id } }),

  getSalaryStructuresForEmployee: async (employeeId: string) =>
    prisma.salaryStructure.findMany({ where: { employeeId }, orderBy: { effectiveFrom: "desc" } }),

  // Payroll runs
  createPayrollRun: async (data: Prisma.PayrollRunCreateInput) =>
    prisma.payrollRun.create({ data }),
  updatePayrollRun: async (id: string, data: Prisma.PayrollRunUpdateInput) => prisma.payrollRun.update({ where: { id }, data }),
  deletePayrollRun: async (id: string) => prisma.payrollRun.delete({ where: { id } }),

  findPayrollRun: async (id: string) =>
    prisma.payrollRun.findUnique({ where: { id }, include: { payslips: true } }),

  listPayrollRuns: async (skip = 0, take = 20) =>
    prisma.payrollRun.findMany({ skip, take, orderBy: { runAt: "desc" } }),

  // Payslips
  createPayslip: async (data: Prisma.PayslipCreateInput) => prisma.payslip.create({ data }),
  getPayslip: async (id: string) => prisma.payslip.findUnique({ where: { id } }),
  updatePayslip: async (id: string, data: Prisma.PayslipUpdateInput) => prisma.payslip.update({ where: { id }, data }),
  deletePayslip: async (id: string) => prisma.payslip.delete({ where: { id } }),
  listPayslipsForEmployee: async (employeeId: string, skip = 0, take = 20) =>
    prisma.payslip.findMany({ where: { employeeId }, skip, take, orderBy: { generatedAt: "desc" } }),

  // Statutory deductions
  createStatutoryDeduction: async (data: Prisma.StatutoryDeductionCreateInput) =>
    prisma.statutoryDeduction.create({ data }),
  findStatutoryDeduction: async (id: string) => prisma.statutoryDeduction.findUnique({ where: { id } }),
  updateStatutoryDeduction: async (id: string, data: Prisma.StatutoryDeductionUpdateInput) => prisma.statutoryDeduction.update({ where: { id }, data }),
  deleteStatutoryDeduction: async (id: string) => prisma.statutoryDeduction.delete({ where: { id } }),
  listStatutoryDeductions: async () => prisma.statutoryDeduction.findMany(),
});