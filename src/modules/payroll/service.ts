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
    try {
      await enqueuePayrollRunProcess(id);
      // Mark run as QUEUED so UI shows progress even before worker claims it
      try {
        await repo.updatePayrollRun(id, { status: 'QUEUED' } as any);
      } catch (e) {
        // tolerate cache/db write failures here, but log
        console.error('Failed to mark payroll run as QUEUED', e);
      }
      return { enqueued: true };
    } catch (err: any) {
      console.error('Failed to enqueue payroll run process', err);
      return { enqueued: false, reason: err?.message || String(err) };
    }
  },

  createPayslip: async (data: Prisma.PayslipCreateInput) => repo.createPayslip(data),
  getPayslip: async (id: string) => repo.getPayslip(id),
  updatePayslip: async (id: string, data: Prisma.PayslipUpdateInput) => repo.updatePayslip(id, data),
  deletePayslip: async (id: string) => repo.deletePayslip(id),
  listPayslipsForEmployee: async (employeeId: string, skip = 0, take = 20) => repo.listPayslipsForEmployee(employeeId, skip, take),
  // List all payslips (paginated)
  listPayslips: async (skip = 0, take = 20) => repo.listPayslips(skip, take),

  createStatutoryDeduction: async (data: Prisma.StatutoryDeductionCreateInput) => repo.createStatutoryDeduction(data),
  getStatutoryDeduction: async (id: string) => repo.findStatutoryDeduction(id),
  updateStatutoryDeduction: async (id: string, data: Prisma.StatutoryDeductionUpdateInput) => repo.updateStatutoryDeduction(id, data),
  deleteStatutoryDeduction: async (id: string) => repo.deleteStatutoryDeduction(id),
  listStatutoryDeductions: async () => repo.listStatutoryDeductions(),

  // Summary across given date range or period
  getPayrollSummary: async (opts: { start?: string; end?: string; period?: string }) => {
    let start: Date | undefined;
    let end: Date | undefined;
    if (opts.period) {
      const [y, m] = opts.period.split("-").map(Number);
      start = new Date(y, (m - 1), 1);
      end = new Date(y, (m - 1) + 1, 0, 23, 59, 59, 999);
    } else {
      if (opts.start) start = new Date(opts.start);
      if (opts.end) end = new Date(opts.end);
    }

    const payslips = await repo.listPayslipsInRange(start, end);

    // Monthly aggregation
    const monthly: Record<string, { gross: number; net: number; count: number }> = {};
    payslips.forEach((p: any) => {
      const d = new Date(p.generatedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = monthly[key] || { gross: 0, net: 0, count: 0 };
      monthly[key].gross += p.gross || 0;
      monthly[key].net += p.net || 0;
      monthly[key].count += 1;
    });

    const monthlyArr = Object.keys(monthly).sort().map((k) => ({ period: k, ...monthly[k] }));

    // Runs aggregation
    const runMap: Record<string, { runId: string; period?: string; gross: number; net: number; count: number }> = {};
    payslips.forEach((p: any) => {
      const rId = p.payrollRun?.id || (p.payrollRunId || '');
      runMap[rId] = runMap[rId] || { runId: rId, period: p.payrollRun?.period, gross: 0, net: 0, count: 0 };
      runMap[rId].gross += p.gross || 0;
      runMap[rId].net += p.net || 0;
      runMap[rId].count += 1;
    });
    const runs = Object.values(runMap).sort((a, b) => b.runId.localeCompare(a.runId));

    // Per-employee aggregation
    const empMap: Record<string, { employeeId: string; name: string; gross: number; net: number; count: number }> = {};
    payslips.forEach((p: any) => {
      const eId = p.employee?.id || p.employeeId;
      const name = p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : eId;
      empMap[eId] = empMap[eId] || { employeeId: eId, name, gross: 0, net: 0, count: 0 };
      empMap[eId].gross += p.gross || 0;
      empMap[eId].net += p.net || 0;
      empMap[eId].count += 1;
    });
    const employees = Object.values(empMap).sort((a, b) => b.net - a.net);

    return { monthly: monthlyArr, runs, employees };
  },

  exportPayrollCsv: async (period: string) => {
    const [y, m] = period.split("-").map(Number);
    if (!y || !m) throw new Error("Invalid period");
    const payslips = await repo.listPayslipsByPeriod(y, m);

    // Build CSV rows
    const header = ["payrollRunId", "period", "employeeId", "employeeName", "gross", "net", "generatedAt"];
    const rows = payslips.map((p: any) => [p.payrollRunId || (p.payrollRun?.id || ''), p.payrollRun?.period || '', p.employeeId, p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : '', (p.gross || 0).toFixed(2), (p.net || 0).toFixed(2), new Date(p.generatedAt).toISOString()]);
    const csv = [header, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    return Buffer.from(csv, "utf8");
  }
};