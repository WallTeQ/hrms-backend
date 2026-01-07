import { Request, Response } from "express";
import { RecruitmentService } from "../service";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis";

export async function schedule(req: Request, res: Response) {
  const payload = req.body;
  const i = await RecruitmentService.createInterview(payload as any);
  if ((payload as any).vacancyId) await cacheDelByPrefix(`recruitment:vacancy:${(payload as any).vacancyId}:interviews`);
  await cacheDelByPrefix("recruitment:vacancies");
  return res.status(201).json(i);
}

export async function getInterview(req: Request, res: Response) {
  const id = req.params.id;
  const key = `recruitment:interview:${id}`;
  const i = await cacheWrap(key, 60, () => RecruitmentService.getInterview(id));
  if (!i) return res.status(404).json({ error: "Not found" });
  return res.json(i);
}

export async function updateInterview(req: Request, res: Response) {
  const id = req.params.id;
  const updated = await RecruitmentService.updateInterview(id, req.body as any);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:interview:${id}`);
  return res.json(updated);
}

export async function deleteInterview(req: Request, res: Response) {
  await RecruitmentService.deleteInterview(req.params.id);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:interview:${req.params.id}`);
  return res.status(204).send();
}