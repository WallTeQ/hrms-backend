import { Request, Response } from "express";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis.js";
import { DisciplinaryRecordsService } from "./service.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function createRecord(req: Request, res: Response) {
  const payload = req.body as any;
  // Ensure employeeId is set if coming from the route
  if (!payload.employeeId && req.params.employeeId) payload.employeeId = req.params.employeeId;

  const rec = await DisciplinaryRecordsService.create(payload as any);
  if ((payload as any).employeeId) await cacheDelByPrefix(`employees:disciplinary:${(payload as any).employeeId}`);
  return res.status(201).json({ status: "success", data: rec });
}

export async function listForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `employees:disciplinary:${employeeId}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => DisciplinaryRecordsService.listForEmployee(employeeId, skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getRecord(req: Request, res: Response) {
  const id = req.params.id;
  const rec = await DisciplinaryRecordsService.find(id);
  if (!rec) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: rec });
}

export async function updateRecord(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as any;

  const existing = await DisciplinaryRecordsService.find(id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  const updated = await DisciplinaryRecordsService.update(id, payload);

  // Clear cache for affected employees (old and new if changed)
  if (existing.employeeId) await cacheDelByPrefix(`employees:disciplinary:${existing.employeeId}`);
  if (payload.employeeId && payload.employeeId !== existing.employeeId) await cacheDelByPrefix(`employees:disciplinary:${payload.employeeId}`);

  return res.json({ status: "success", data: updated });
}

export async function deleteRecord(req: Request, res: Response) {
  const id = req.params.id;
  const existing = await DisciplinaryRecordsService.find(id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  await DisciplinaryRecordsService.delete(id);
  if ((existing as any).employeeId) await cacheDelByPrefix(`employees:disciplinary:${(existing as any).employeeId}`);
  return res.status(204).send();
}