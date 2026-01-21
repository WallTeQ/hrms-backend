import { Request, Response } from "express";
import { PerformanceService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function head(_req: Request, res: Response) {
  return res.json({ ok: true });
}

export async function listKpis(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `performance:kpis:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => PerformanceService.listKpis(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function createKpi(req: Request, res: Response) {
  const payload = req.body;
  const k = await PerformanceService.createKpi(payload as any);
  // invalidate kpi list cache
  await cacheDelByPrefix("performance:kpis");
  return res.status(201).json({ status: "success", data: k });
}

export async function listEvaluationsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `performance:evaluations:employee:${employeeId}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => PerformanceService.listEvaluationsForEmployee(employeeId, skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function createEvaluation(req: Request, res: Response) {
  // Ensure requester is authenticated as a defensive check even if middleware was bypassed
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const payload = req.body;
  try {
    const e = await PerformanceService.createEvaluation(payload as any);
    if ((payload as any).employeeId) await cacheDelByPrefix(`performance:evaluations:employee:${(payload as any).employeeId}`);
    return res.status(201).json({ status: "success", data: e });
  } catch (err: any) {
    // Map domain / Prisma errors to friendly 4xx responses when appropriate
    if (err?.message === "EMPLOYEE_NOT_FOUND") return res.status(400).json({ error: "Invalid employeeId" });
    if (err?.code === "P2003") return res.status(400).json({ error: "Invalid foreign key reference (maybe employeeId)" });
    throw err;
  }
}