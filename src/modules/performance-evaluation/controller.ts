import { Request, Response } from "express";
import { PerformanceService } from "./service";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis";

export async function head(req: Request, res: Response) {
  return res.json({ ok: true });
}

export async function listKpis(req: Request, res: Response) {
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const key = `performance:kpis:skip=${skip}:take=${take}`;
  const kpis = await cacheWrap(key, 60, () => PerformanceService.listKpis(skip, take));
  return res.json(kpis);
}

export async function createKpi(req: Request, res: Response) {
  const payload = req.body;
  const k = await PerformanceService.createKpi(payload as any);
  // invalidate kpi list cache
  await cacheDelByPrefix("performance:kpis");
  return res.status(201).json(k);
}

export async function listEvaluationsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const key = `performance:evaluations:employee:${employeeId}:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 60, () => PerformanceService.listEvaluationsForEmployee(employeeId, skip, take));
  return res.json(items);
}

export async function createEvaluation(req: Request, res: Response) {
  const payload = req.body;
  const e = await PerformanceService.createEvaluation(payload as any);
  if ((payload as any).employeeId) await cacheDelByPrefix(`performance:evaluations:employee:${(payload as any).employeeId}`);
  return res.status(201).json(e);
}