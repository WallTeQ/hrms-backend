import { Request, Response } from "express";
import { EmployeeService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis.js";
import type { CreateEmployeeDto, UpdateEmployeeDto, ComplianceChecklistDto } from "./schema.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function createEmployee(req: Request, res: Response) {
  const payload = req.body as CreateEmployeeDto;
  const file = (req as any).file as Express.Multer.File | undefined;
  const e = await EmployeeService.create(payload as any, file);
  // invalidate employee list/detail + headcount reports
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("departments");
  await cacheDelByPrefix("reports:headcount");
  // invalidate per-skill employee caches if skills were assigned on create
  try {
    const skillIds = Array.isArray((payload as any).skillIds) ? (payload as any).skillIds : [];
    for (const sid of skillIds) {
      if (sid) await cacheDelByPrefix(`trainings:skill:${sid}:employees`);
    }
  } catch (err) {
    // non-blocking cache invalidation
  }
  return res.status(201).json({ status: "success", data: e });
}

export async function listEmployees(req: Request, res: Response) {
  const search = (req.query.search as string) || "";
  const status = (req.query.status as string) || "";
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const user = (req as any).user;

  // Optimize cache key: group by role instead of individual user ID. Do NOT
  // include `include` query param in the cache key — list endpoint does not
  // return heavy relations.
  const role = user?.role || 'anonymous';
  const key = `employees:list:role=${role}:search=${search}:status=${status}:skip=${skip}:take=${take}`;

  const result = await cacheWrap(key, 300, () => EmployeeService.list({ search, status, skip, take }, user)) as { items: any[]; total: number };
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
  return res.json({ status: "success", data: e });
}

export async function updateEmployee(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as UpdateEmployeeDto;
  const file = (req as any).file as Express.Multer.File | undefined;

  // fetch previous skills for targeted cache invalidation
  let previousSkillIds: string[] = [];
  try {
    const prev = await EmployeeService.getById(id, (req as any).user);
    previousSkillIds = Array.isArray(prev?.skills) ? prev.skills.map((s: any) => s.id) : [];
  } catch (e) {
    previousSkillIds = [];
  }

  const u = await EmployeeService.update(id, payload as any, file);

  await cacheDelByPrefix("employees");
  await cacheDelByPrefix(`employees:detail:${id}`);
  await cacheDelByPrefix("departments");
  await cacheDelByPrefix("reports:headcount");

  // invalidate caches for any affected skills (union of previous & new)
  try {
    const newSkillIds = Array.isArray((payload as any).skillIds) ? (payload as any).skillIds : [];
    const union = new Set<string>([...previousSkillIds, ...newSkillIds]);
    for (const sid of union) {
      if (sid) await cacheDelByPrefix(`trainings:skill:${sid}:employees`);
    }
  } catch (err) {
    // non-blocking
  }

  return res.json({ status: "success", data: u });
}

export async function uploadEmployeePhoto(req: Request, res: Response) {
  const id = req.params.id;
  if (!(req as any).file) return res.status(400).json({ error: "file is required" });
  const updated = await EmployeeService.uploadPhoto(id, (req as any).file);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix(`employees:detail:${id}`);
  return res.json({ status: "success", data: updated });
}

export async function deleteEmployee(req: Request, res: Response) {
  const id = req.params.id;

  // fetch employee skills before soft-delete so we can invalidate per-skill caches
  try {
    const existing = await EmployeeService.getById(id, (req as any).user);
    const skillIds = Array.isArray(existing?.skills) ? existing.skills.map((s: any) => s.id) : [];
    for (const sid of skillIds) {
      if (sid) await cacheDelByPrefix(`trainings:skill:${sid}:employees`);
    }
  } catch (e) {
    // continue even if fetch fails
  }

  await EmployeeService.delete(id);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix(`employees:detail:${id}`);
  await cacheDelByPrefix("departments");
  await cacheDelByPrefix("reports:headcount");
  return res.status(204).send();
}

export async function updateComplianceChecklist(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as ComplianceChecklistDto;
  const updated = await EmployeeService.updateComplianceChecklist(id, payload);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix(`employees:detail:${id}`);
  return res.json({ status: "success", data: updated });
}