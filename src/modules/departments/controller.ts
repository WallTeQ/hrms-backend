import { Request, Response } from "express";
import { DepartmentsService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function createDepartment(req: Request, res: Response) {
  const payload = req.body;
  const d = await DepartmentsService.create(payload as any);
  await cacheDelByPrefix("departments");
  return res.status(201).json({ status: "success", data: d });
}

export async function listDepartments(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `departments:list:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 300, () => DepartmentsService.list(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getDepartment(req: Request, res: Response) {
  const id = req.params.id;
  const d = await DepartmentsService.find(id);
  if (!d) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: d });
}

export async function updateDepartment(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await DepartmentsService.update(id, payload as any);
  await cacheDelByPrefix("departments");
  await cacheDelByPrefix("employees");
  return res.json({ status: "success", data: updated });
}

export async function deleteDepartment(req: Request, res: Response) {
  await DepartmentsService.delete(req.params.id);
  await cacheDelByPrefix("departments");
  await cacheDelByPrefix("employees");
  return res.status(204).send();
}

export async function listEmployeesInDepartment(req: Request, res: Response) {
  const id = req.params.id;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `departments:employees:${id}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => DepartmentsService.listEmployees(id, skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}
export async function getDepartmentStats(req: Request, res: Response) {
  const key = `departments:stats`;
  const stats = await cacheWrap(key, 300, () => DepartmentsService.getDepartmentStats());
  return res.json({ status: "success", data: stats });
}