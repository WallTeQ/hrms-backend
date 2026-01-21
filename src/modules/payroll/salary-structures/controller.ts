import { Request, Response } from "express";
import { PayrollService } from "../service.js";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function createSalaryStructure(req: Request, res: Response) {
  const payload = req.body;
  const s = await PayrollService.createSalaryStructure(payload as any);

  // Invalidate caches asynchronously so we don't block the response on key deletions
  cacheDelByPrefix("payroll:salary-structures").catch(() => {});
  if ((payload as any).employeeId) cacheDelByPrefix(`payroll:salary-structures:employee=${(payload as any).employeeId}`).catch(() => {});

  return res.status(201).json({ status: "success", data: s });
}

export async function updateSalaryStructure(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PayrollService.updateSalaryStructure(id, payload as any);
  cacheDelByPrefix("payroll:salary-structures").catch(() => {});
  return res.json({ status: "success", data: updated });
}

export async function deleteSalaryStructure(req: Request, res: Response) {
  await PayrollService.deleteSalaryStructure(req.params.id);
  cacheDelByPrefix("payroll:salary-structures").catch(() => {});
  return res.status(204).send();
}

export async function listSalaryStructures(req: Request, res: Response) {
  // Prefer employeeId from route params when present; fall back to query param or body for backward compatibility
  const paramsEmployeeId = req.params.employeeId as string | undefined;
  const queryEmployeeId = req.query.employeeId as string | undefined;
  const bodyEmployeeId = (req.body && (req.body as any).employeeId) as string | undefined;
  const employeeId = paramsEmployeeId || queryEmployeeId || bodyEmployeeId;

  // If id was passed in both URL param and request body, ensure they match or reject to avoid redundancy
  if (paramsEmployeeId && bodyEmployeeId && paramsEmployeeId !== bodyEmployeeId) {
    return res.status(400).json({ error: "employeeId should be passed in the URL parameter only; remove it from the request body or ensure it matches the path parameter." });
  }

  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;

  if (employeeId) {
    const key = `payroll:salary-structures:employee=${employeeId}:skip=${skip}:take=${take}`;
    const result = await cacheWrap(key, 60, () => PayrollService.getSalaryStructuresForEmployee(employeeId, skip, take)) as { items: any[]; total: number };
    const { items, total } = result;
    const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
    return res.json({ status: "success", ...paginated });
  }

  // List all salary structures (paginated)
  const key = `payroll:salary-structures:all:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => PayrollService.listSalaryStructures(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}