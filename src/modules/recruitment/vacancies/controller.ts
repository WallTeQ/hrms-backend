import { Request, Response } from "express";
import { VacanciesService } from "./service";
import { cacheWrap, cacheDel } from "../../../infra/redis";

export async function createVacancy(req: Request, res: Response) {
  const payload = req.body;
  const v = await VacanciesService.create(payload as any);
  // invalidate list caches
  const keys = [`recruitment:vacancies:list:skip=0:take=20`];
  await Promise.all(keys.map((k) => cacheDel(k)));
  return res.status(201).json(v);
}

export async function listVacancies(req: Request, res: Response) {
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 20);
  const key = `recruitment:vacancies:list:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 30, () => VacanciesService.list(skip, take));
  return res.json(items);
}

export async function getVacancy(req: Request, res: Response) {
  const id = req.params.id;
  const v = await VacanciesService.get(id);
  if (!v) return res.status(404).json({ error: "Not found" });
  return res.json(v);
}



export async function updateVacancy(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await VacanciesService.update(id, payload as any);
  await cacheDel(`recruitment:vacancies:list:skip=0:take=20`);
  return res.json(updated);
}

export async function deleteVacancy(req: Request, res: Response) {
  await VacanciesService.delete(req.params.id);
  await cacheDel(`recruitment:vacancies:list:skip=0:take=20`);
  return res.status(204).send();
}