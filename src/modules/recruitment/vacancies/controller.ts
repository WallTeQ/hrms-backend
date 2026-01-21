import { Request, Response } from "express";
import { VacanciesService } from "./service.js";
import { cacheWrap, cacheDel } from "../../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function createVacancy(req: Request, res: Response) {
  const payload = req.body;
  const v = await VacanciesService.create(payload as any);
  // invalidate list caches
  const keys = [`recruitment:vacancies:list:skip=0:take=20`];
  await Promise.all(keys.map((k) => cacheDel(k)));
  return res.status(201).json({ status: "success", data: v });
}

export async function listVacancies(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `recruitment:vacancies:list:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 30, () => VacanciesService.list(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getVacancy(req: Request, res: Response) {
  const id = req.params.id;
  const v = await VacanciesService.get(id);
  if (!v) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: v });
}



export async function updateVacancy(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await VacanciesService.update(id, payload as any);
  await cacheDel(`recruitment:vacancies:list:skip=0:take=20`);
  return res.json({ status: "success", data: updated });
}

export async function deleteVacancy(req: Request, res: Response) {
  await VacanciesService.delete(req.params.id);
  await cacheDel(`recruitment:vacancies:list:skip=0:take=20`);
  return res.status(204).send();
}