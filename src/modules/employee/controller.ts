import { Request, Response } from "express";
import { EmployeeService } from "./service";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis";
import type { CreateEmployeeDto, UpdateEmployeeDto } from "./schema";

export async function createEmployee(req: Request, res: Response) {
  const payload = req.body as CreateEmployeeDto;
  const e = await EmployeeService.create(payload as any);
  // invalidate employee list/detail + headcount reports
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("reports:headcount");
  return res.status(201).json(e);
}

export async function listEmployees(req: Request, res: Response) {
  const search = (req.query.search as string) || "";
  const status = (req.query.status as string) || "";
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const key = `employees:list:search=${search}:status=${status}:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 60, () => EmployeeService.list({ search, status, skip, take }));
  return res.json(items);
}

export async function getEmployee(req: Request, res: Response) {
  const id = req.params.id;
  const key = `employees:detail:${id}`;
  const e = await cacheWrap(key, 60, () => EmployeeService.getById(id));
  if (!e) return res.status(404).json({ error: "Not found" });
  return res.json(e);
}

export async function updateEmployee(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as UpdateEmployeeDto;
  const u = await EmployeeService.update(id, payload as any);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix(`employees:detail:${id}`);
  await cacheDelByPrefix("reports:headcount");
  return res.json(u);
}

export async function deleteEmployee(req: Request, res: Response) {
  const id = req.params.id;
  await EmployeeService.delete(id);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix(`employees:detail:${id}`);
  await cacheDelByPrefix("reports:headcount");
  return res.status(204).send();
}