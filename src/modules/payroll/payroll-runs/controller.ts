import { Request, Response } from "express";
import { PayrollService } from "../service";

import { cacheDelByPrefix, cacheWrap } from "../../../infra/redis";

export async function createRun(req: Request, res: Response) {
  const payload = req.body;
  const run = await PayrollService.createPayrollRun(payload as any);
  // invalidate payroll runs and payroll summary caches
  await cacheDelByPrefix("payroll:runs");
  await cacheDelByPrefix("reports:payroll");
  return res.status(201).json(run);
}

export async function getRun(req: Request, res: Response) {
  const id = req.params.id;
  const run = await PayrollService.findPayrollRun(id);
  if (!run) return res.status(404).json({ error: "Not found" });
  return res.json(run);
}

export async function listRuns(req: Request, res: Response) {
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 20);
  const key = `payroll:runs:skip=${skip}:take=${take}`;
  const runs = await cacheWrap(key, 30, () => PayrollService.listPayrollRuns(skip, take));
  return res.json(runs);
}

export async function updateRun(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PayrollService.updatePayrollRun(id, payload as any);
  await cacheDelByPrefix("payroll:runs");
  await cacheDelByPrefix("reports:payroll");
  return res.json(updated);
}

export async function deleteRun(req: Request, res: Response) {
  await PayrollService.deletePayrollRun(req.params.id);
  await cacheDelByPrefix("payroll:runs");
  await cacheDelByPrefix("reports:payroll");
  return res.status(204).send();
}