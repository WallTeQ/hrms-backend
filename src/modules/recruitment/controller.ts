import { Request, Response } from "express";
import { RecruitmentService } from "./service";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis";

export async function listVacancies(req: Request, res: Response) {
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 20);
  const key = `recruitment:vacancies:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 60, () => RecruitmentService.listVacancies(skip, take));
  return res.json(items);
}

export async function createVacancy(req: Request, res: Response) {
  const payload = req.body;
  const v = await RecruitmentService.createVacancy(payload as any);
  await cacheDelByPrefix("recruitment:vacancies");
  return res.status(201).json(v);
}

export async function getVacancy(req: Request, res: Response) {
  const id = req.params.id;
  const key = `recruitment:vacancy:${id}`;
  const v = await cacheWrap(key, 60, () => RecruitmentService.getVacancy(id));
  if (!v) return res.status(404).json({ error: "Not found" });
  return res.json(v);
}