import { Request, Response } from "express";
import { RecruitmentService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function listVacancies(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `recruitment:vacancies:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => RecruitmentService.listVacancies(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function createVacancy(req: Request, res: Response) {
  // Defensive: ensure only authenticated HR_ADMIN can create vacancies
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  if (req.user.role !== "HR_ADMIN") return res.status(403).json({ error: "Forbidden" });

  const payload = req.body;
  const v = await RecruitmentService.createVacancy(payload as any);
  await cacheDelByPrefix("recruitment:vacancies");
  return res.status(201).json({ status: "success", data: v });
}

export async function getVacancy(req: Request, res: Response) {
  const id = req.params.id;
  const key = `recruitment:vacancy:${id}`;
  const v = await cacheWrap(key, 60, () => RecruitmentService.getVacancy(id));
  if (!v) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: v });
}