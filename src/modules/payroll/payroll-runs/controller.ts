import { Request, Response } from "express";
import { PayrollService } from "../service.js";

import { cacheDelByPrefix, cacheWrap } from "../../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";



export async function getRun(req: Request, res: Response) {
  const id = req.params.id;
  const run = await PayrollService.findPayrollRun(id);
  if (!run) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: run });
}

export async function listRuns(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `payroll:runs:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 30, () => PayrollService.listPayrollRuns(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function updateRun(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PayrollService.updatePayrollRun(id, payload as any);
  await cacheDelByPrefix("payroll:runs");
  await cacheDelByPrefix("reports:payroll");
  return res.json({ status: "success", data: updated });
}

export async function deleteRun(req: Request, res: Response) {
  await PayrollService.deletePayrollRun(req.params.id);
  await cacheDelByPrefix("payroll:runs");
  await cacheDelByPrefix("reports:payroll");
  return res.status(204).send();
}

export async function processRun(req: Request, res: Response) {
  const id = req.params.id;
  try {
    const result = await PayrollService.enqueueProcessPayrollRun(id);
    // invalidate caches
    await cacheDelByPrefix("payroll:runs");
    await cacheDelByPrefix("reports:payroll");
    return res.status(202).json({ status: "success", data: result });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Failed to enqueue payroll run processing" });
  }
}