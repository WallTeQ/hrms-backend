import { PayrollRepository } from "./repository.js";
import prismaDefault from "../../infra/database.js";
import type { Prisma } from ".prisma/client";
import { uploadBuffer } from "../../infra/cloudinary.js";
import { serviceGuard } from "../../common/domain/service.js";
import { ConflictError, NotFoundError, ValidationError } from "../../common/domain/errors.js";

const repo = PayrollRepository();

function toDateIfString(val: any) {
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return val;
}

export const PayrollService = {
  createSalaryStructure: async (data: Prisma.SalaryStructureCreateInput) =>
    serviceGuard(async () => {
      const payload = { ...(data as any) };
      if (payload.effectiveFrom) payload.effectiveFrom = toDateIfString(payload.effectiveFrom);
      return repo.createSalaryStructure(payload);
    }),
  updateSalaryStructure: async (id: string, data: Prisma.SalaryStructureUpdateInput) =>
    serviceGuard(async () => {
      const payload = { ...(data as any) };
      if (payload.effectiveFrom) payload.effectiveFrom = toDateIfString(payload.effectiveFrom);
      return repo.updateSalaryStructure(id, payload);
    }),
  deleteSalaryStructure: async (id: string) => serviceGuard(async () => repo.deleteSalaryStructure(id)),
  getSalaryStructuresForEmployee: async (employeeId: string, skip = 0, take = 50) =>
    serviceGuard(async () => repo.getSalaryStructuresForEmployee(employeeId, skip, take)),
  listSalaryStructures: async (skip = 0, take = 50) => serviceGuard(async () => repo.listSalaryStructures(skip, take)),

  createPayrollRun: async (data: Prisma.PayrollRunCreateInput) => serviceGuard(async () => repo.createPayrollRun(data)),
  updatePayrollRun: async (id: string, data: Prisma.PayrollRunUpdateInput) => serviceGuard(async () => repo.updatePayrollRun(id, data)),
  deletePayrollRun: async (id: string) => serviceGuard(async () => repo.deletePayrollRun(id)),
  findPayrollRun: async (id: string) => serviceGuard(async () => repo.findPayrollRun(id)),
  listPayrollRuns: async (skip = 0, take = 20) => serviceGuard(async () => repo.listPayrollRuns(skip, take)),

  getOrCreatePayrollRun: async (year: number, month: number) =>
    serviceGuard(async () => {
      const period = `${year}-${String(month).padStart(2, "0")}`;
      let run = await repo.findPayrollRunByPeriod(period);
      if (run) return run;
      try {
        return await repo.createPayrollRun({ period, status: "PENDING" } as any);
      } catch (err: any) {
        if (err?.code === "P2002") {
          const existing = await repo.findPayrollRunByPeriod(period);
          if (existing) return existing;
          throw new ConflictError("Payroll run already exists", { period });
        }
        throw err;
      }
    }),

  // Enqueue a background process for this run. Only enqueues when the run is in PENDING state.
  enqueueProcessPayrollRun: async (id: string, actorId?: string | null) =>
    serviceGuard(async () => {
      const run = await repo.findPayrollRun(id);
      if (!run) throw new NotFoundError("Payroll run not found", { payrollRunId: id });
      if (run.status !== "PENDING") return { enqueued: false, reason: `status=${run.status}` };
      const { enqueuePayrollRunProcess } = await import("../../queues/payrollRunQueue.js");
      try {
        await enqueuePayrollRunProcess(id);
        try {
          await repo.updatePayrollRun(id, { status: "QUEUED" } as any);
        } catch (e) {
          console.error("Failed to mark payroll run as QUEUED", e);
        }

        if (actorId) {
          try {
            await prismaDefault.auditLog.create({
              data: {
                actorId,
                action: "PAYROLL_RUN_QUEUED",
                entity: "PayrollRun",
                entityId: id,
                details: { period: run.period } as any,
              },
            });
          } catch (e) {
            console.error("Failed to log payroll run queued audit event", e);
          }
        }
        return { enqueued: true };
      } catch (err: any) {
        console.error("Failed to enqueue payroll run process", err);
        return { enqueued: false, reason: err?.message || String(err) };
      }
    }),

  createPayslip: async (data: Prisma.PayslipCreateInput) => serviceGuard(async () => repo.createPayslip(data)),
  createPayslipWithUpload: async (payload: any, file?: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }) =>
    serviceGuard(async () => {
      const data: any = { ...payload };
      if (file) {
        const filename = (file.originalname || `payslip-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
        const result = await uploadBuffer(file.buffer, filename, { folder: `payroll/payslips/${payload.employeeId}` });
        data.fileUrl = result?.secure_url;
        data.publicId = result?.public_id;
        data.mimeType = file.mimetype;
        data.size = file.size;
      }

      const run = await PayrollService.getOrCreatePayrollRun(Number(data.year), Number(data.month));
      const createData: any = {
        payrollRunId: run.id,
        employeeId: data.employeeId,
        gross: data.gross != null ? data.gross : 0,
        net: data.net != null ? data.net : 0,
        month: Number(data.month),
        year: Number(data.year),
        fileUrl: data.fileUrl,
        publicId: data.publicId,
        mimeType: data.mimeType,
        size: data.size,
      };
      return repo.createPayslip(createData as Prisma.PayslipCreateInput);
    }),
  getPayslip: async (id: string) => serviceGuard(async () => repo.getPayslip(id)),
  updatePayslip: async (id: string, data: Prisma.PayslipUpdateInput) => serviceGuard(async () => repo.updatePayslip(id, data)),
  approvePayslip: async (id: string, actorId?: string | null) => serviceGuard(async () => {
    const updated = await repo.updatePayslip(id, {
      approvedAt: new Date(),
      approvedByUser: actorId ? { connect: { id: actorId } } : undefined,
    } as any);

    if (actorId) {
      try {
        await prismaDefault.auditLog.create({
          data: {
            actorId,
            action: "PAYSLIP_APPROVED",
            entity: "Payslip",
            entityId: id,
            details: { approvedAt: (updated as any)?.approvedAt } as any,
          },
        });
      } catch (e) {
        console.error("Failed to log payslip approval", e);
      }
    }

    return updated;
  }),
  deletePayslip: async (id: string) => serviceGuard(async () => repo.deletePayslip(id)),
  listPayslipsForEmployee: async (employeeId: string, skip = 0, take = 20) => serviceGuard(async () => repo.listPayslipsForEmployee(employeeId, skip, take)),
  listPayslips: async (skip = 0, take = 20) => serviceGuard(async () => repo.listPayslips(skip, take)),

  createStatutoryDeduction: async (data: Prisma.StatutoryDeductionCreateInput) => serviceGuard(async () => repo.createStatutoryDeduction(data)),
  getStatutoryDeduction: async (id: string) => serviceGuard(async () => repo.findStatutoryDeduction(id)),
  updateStatutoryDeduction: async (id: string, data: Prisma.StatutoryDeductionUpdateInput) => serviceGuard(async () => repo.updateStatutoryDeduction(id, data)),
  deleteStatutoryDeduction: async (id: string) => serviceGuard(async () => repo.deleteStatutoryDeduction(id)),
  listStatutoryDeductions: async () => serviceGuard(async () => repo.listStatutoryDeductions()),

  // Summary across given date range or period
  getPayrollSummary: async (opts: { start?: string; end?: string; period?: string }) => serviceGuard(async () => {
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
  }),

  exportPayrollCsv: async (period: string) => serviceGuard(async () => {
    const [y, m] = period.split("-").map(Number);
    if (!y || !m) throw new ValidationError("Invalid period");
    const payslips = await repo.listPayslipsByPeriod(y, m);

    // Build CSV rows
    const header = ["payrollRunId", "period", "employeeId", "employeeName", "gross", "net", "generatedAt"];
    const rows = payslips.map((p: any) => [p.payrollRunId || (p.payrollRun?.id || ''), p.payrollRun?.period || '', p.employeeId, p.employee ? `${p.employee.firstName} ${p.employee.lastName}` : '', (p.gross || 0).toFixed(2), (p.net || 0).toFixed(2), new Date(p.generatedAt).toISOString()]);
    const csv = [header, ...rows].map((r) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    return Buffer.from(csv, "utf8");
  })
};