import { Request, Response } from "express";
import { PayrollService } from "./service.js";
import { cacheWrap } from "../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function createSalaryStructure(req: Request, res: Response) {
  const payload = req.body;
  const s = await PayrollService.createSalaryStructure(payload as any);
  return res.status(201).json({ status: "success", data: s });
}

export async function listSalaryStructuresForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const user = (req as any).user;
  const role = user?.role || 'anonymous';
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `payroll:salary-structures:employee=${employeeId}:role=${role}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 300, () => PayrollService.getSalaryStructuresForEmployee(employeeId, skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function processPayroll(req: Request, res: Response) {
  const payload = req.body;
  const run = await PayrollService.createPayrollRun(payload as any);
  return res.status(201).json({ status: "success", data: run });
}

export async function getPayrollRun(req: Request, res: Response) {
  const id = req.params.id;
  const run = await PayrollService.findPayrollRun(id);
  if (!run) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: run });
}

export async function listPayrollRuns(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const user = (req as any).user;
  const role = user?.role || 'anonymous';
  const key = `payroll:runs:role=${role}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => PayrollService.listPayrollRuns(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getPayrollSummary(req: Request, res: Response) {
  const q = ((req as any).validatedQuery || req.query) as any;
  const summary = await PayrollService.getPayrollSummary(q);
  return res.json({ status: "success", data: summary });
}

export async function exportPayroll(req: Request, res: Response) {
  const q = ((req as any).validatedQuery || req.query) as any;
  if (!q.period) return res.status(400).json({ error: "period is required" });
  const buf = await PayrollService.exportPayrollCsv(q.period);
  const fileName = `payroll_${q.period}.csv`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  return res.send(buf);
}