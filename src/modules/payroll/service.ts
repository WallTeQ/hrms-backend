import { PayrollRepository } from "./repository";
import type { Prisma } from "../../generated/prisma";

const repo = PayrollRepository();

export const PayrollService = {
  createSalaryStructure: async (data: Prisma.SalaryStructureCreateInput) => repo.createSalaryStructure(data),
  updateSalaryStructure: async (id: string, data: Prisma.SalaryStructureUpdateInput) => repo.updateSalaryStructure(id, data),
  deleteSalaryStructure: async (id: string) => repo.deleteSalaryStructure(id),
  getSalaryStructuresForEmployee: async (employeeId: string) => repo.getSalaryStructuresForEmployee(employeeId),

  createPayrollRun: async (data: Prisma.PayrollRunCreateInput) => repo.createPayrollRun(data),
  updatePayrollRun: async (id: string, data: Prisma.PayrollRunUpdateInput) => repo.updatePayrollRun(id, data),
  deletePayrollRun: async (id: string) => repo.deletePayrollRun(id),
  findPayrollRun: async (id: string) => repo.findPayrollRun(id),
  listPayrollRuns: async (skip = 0, take = 20) => repo.listPayrollRuns(skip, take),

  createPayslip: async (data: Prisma.PayslipCreateInput) => repo.createPayslip(data),
  getPayslip: async (id: string) => repo.getPayslip(id),
  updatePayslip: async (id: string, data: Prisma.PayslipUpdateInput) => repo.updatePayslip(id, data),
  deletePayslip: async (id: string) => repo.deletePayslip(id),
  listPayslipsForEmployee: async (employeeId: string, skip = 0, take = 20) => repo.listPayslipsForEmployee(employeeId, skip, take),

  createStatutoryDeduction: async (data: Prisma.StatutoryDeductionCreateInput) => repo.createStatutoryDeduction(data),
  getStatutoryDeduction: async (id: string) => repo.findStatutoryDeduction(id),
  updateStatutoryDeduction: async (id: string, data: Prisma.StatutoryDeductionUpdateInput) => repo.updateStatutoryDeduction(id, data),
  deleteStatutoryDeduction: async (id: string) => repo.deleteStatutoryDeduction(id),
  listStatutoryDeductions: async () => repo.listStatutoryDeductions(),
};