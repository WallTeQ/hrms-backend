import { Request, Response } from "express";
import { EmployeeService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis.js";
import type { CreateEmployeeDto, UpdateEmployeeDto } from "./schema.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function createEmployee(req: Request, res: Response) {
  const payload = req.body as CreateEmployeeDto;
  const e = await EmployeeService.create(payload as any);
  // invalidate employee list/detail + headcount reports
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("departments");
  await cacheDelByPrefix("reports:headcount");
  return res.status(201).json({ status: "success", data: e });
}

export async function listEmployees(req: Request, res: Response) {
  const search = (req.query.search as string) || "";
  const status = (req.query.status as string) || "";
  const includes = (req.query.include as string)?.split(',') || [];
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const user = (req as any).user;
  
  // Optimize cache key: group by role instead of individual user ID
  const role = user?.role || 'anonymous';
  const key = `employees:list:role=${role}:search=${search}:status=${status}:skip=${skip}:take=${take}:includes=${includes.sort().join(',')}`;
  
  const result = await cacheWrap(key, 300, () => EmployeeService.list({ search, status, skip, take, includes }, user)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getEmployee(req: Request, res: Response) {
  const id = req.params.id;
  const user = (req as any).user;
  const role = user?.role || 'anonymous';
  const key = `employees:detail:${id}:role=${role}`;
  const e = await cacheWrap(key, 300, () => EmployeeService.getById(id, user));
  if (!e) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: e });
}

export async function updateEmployee(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as UpdateEmployeeDto;
  const u = await EmployeeService.update(id, payload as any);
  console.log('Updated employee:', u); // Debug log
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix(`employees:detail:${id}`);
  await cacheDelByPrefix("departments");
  await cacheDelByPrefix("reports:headcount");
  return res.json({ status: "success", data: u });
}

export async function deleteEmployee(req: Request, res: Response) {
  const id = req.params.id;
  await EmployeeService.delete(id);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix(`employees:detail:${id}`);
  await cacheDelByPrefix("departments");
  await cacheDelByPrefix("reports:headcount");
  return res.status(204).send();
}