import { Request, Response } from "express";
import { RecruitmentService } from "../service";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis";

export async function createOffer(req: Request, res: Response) {
  const payload = req.body;
  const o = await RecruitmentService.createOffer(payload as any);
  if ((payload as any).vacancyId) await cacheDelByPrefix(`recruitment:vacancy:${(payload as any).vacancyId}:offers`);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix("recruitment:offers");
  return res.status(201).json(o);
}

export async function getOffer(req: Request, res: Response) {
  const id = req.params.id;
  const key = `recruitment:offer:${id}`;
  const o = await cacheWrap(key, 60, () => RecruitmentService.getOffer(id));
  if (!o) return res.status(404).json({ error: "Not found" });
  return res.json(o);
}

export async function updateOffer(req: Request, res: Response) {
  const id = req.params.id;
  const updated = await RecruitmentService.updateOffer(id, req.body as any);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:offer:${id}`);
  return res.json(updated);
}

export async function deleteOffer(req: Request, res: Response) {
  await RecruitmentService.deleteOffer(req.params.id);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:offer:${req.params.id}`);
  return res.status(204).send();
}

export async function acceptOffer(req: Request, res: Response) {
  await RecruitmentService.acceptOffer(req.params.id);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:offer:${req.params.id}`);
  return res.json({ ok: true });
}
