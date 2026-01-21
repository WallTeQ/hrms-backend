import { PayrollRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";

const repo = PayrollRepository();

function toDateIfString(val: any) {
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return val;
}

export const PayrollService = {
  createSalaryStructure: async (data: Prisma.SalaryStructureCreateInput) => {
    const payload = { ...(data as any) };
    if (payload.effectiveFrom) payload.effectiveFrom = toDateIfString(payload.effectiveFrom);
    return repo.createSalaryStructure(payload);
  },
  updateSalaryStructure: async (id: string, data: Prisma.SalaryStructureUpdateInput) => {
    const payload = { ...(data as any) };
    if (payload.effectiveFrom) payload.effectiveFrom = toDateIfString(payload.effectiveFrom);
    return repo.updateSalaryStructure(id, payload);
  },
  deleteSalaryStructure: async (id: string) => repo.deleteSalaryStructure(id),
  getSalaryStructuresForEmployee: async (employeeId: string, skip = 0, take = 50) => repo.getSalaryStructuresForEmployee(employeeId, skip, take),
  listSalaryStructures: async (skip = 0, take = 50) => repo.listSalaryStructures(skip, take),

  createPayrollRun: async (data: Prisma.PayrollRunCreateInput) => repo.createPayrollRun(data),
  updatePayrollRun: async (id: string, data: Prisma.PayrollRunUpdateInput) => repo.updatePayrollRun(id, data),
  deletePayrollRun: async (id: string) => repo.deletePayrollRun(id),
  findPayrollRun: async (id: string) => repo.findPayrollRun(id),
  listPayrollRuns: async (skip = 0, take = 20) => repo.listPayrollRuns(skip, take),

  getOrCreatePayrollRun: async (year: number, month: number) => {
    const period = `${year}-${String(month).padStart(2, "0")}`;
    let run = await repo.findPayrollRunByPeriod(period);
    if (run) return run;
    // try to create; handle unique constraint races
    try {
      return await repo.createPayrollRun({ period, status: "PENDING" } as any);
    } catch (err: any) {
      // Prisma unique-constraint error code
      if (err?.code === 'P2002') {
        const existing = await repo.findPayrollRunByPeriod(period);
        if (existing) return existing;
      }
      throw err;
    }
  },

  // Enqueue a background process for this run. Only enqueues when the run is in PENDING state.
  enqueueProcessPayrollRun: async (id: string) => {
    const run = await repo.findPayrollRun(id);
    if (!run) throw new Error('Not found');
    if (run.status !== 'PENDING') return { enqueued: false, reason: `status=${run.status}` };
    // import lazily to avoid startup circulars if any
    const { enqueuePayrollRunProcess } = await import('../../queues/payrollRunQueue.js');
    await enqueuePayrollRunProcess(id);
    return { enqueued: true };
  },

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