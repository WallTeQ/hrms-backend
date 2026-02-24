import { Request, Response } from "express";
import { RecruitmentService } from "../service.js";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function createApplication(req: Request, res: Response) {
  const payload = req.body as any;
  const file = (req as any).file as Express.Multer.File | undefined;

  const a = await RecruitmentService.createApplicationWithUpload(payload as any, file);
  if ((payload as any).vacancyId) await cacheDelByPrefix(`recruitment:vacancy:${(payload as any).vacancyId}:applications`);
  await cacheDelByPrefix("recruitment:vacancies");
  return res.status(201).json({ status: "success", data: a });
}

export async function listApplicationsForVacancy(req: Request, res: Response) {
  const vacancyId = req.params.vacancyId;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `recruitment:vacancy:${vacancyId}:applications:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 30, () => RecruitmentService.listApplicationsForVacancy(vacancyId, skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getApplication(req: Request, res: Response) {
  const id = req.params.id;
  const key = `recruitment:application:${id}`;
  const a = await cacheWrap(key, 60, () => RecruitmentService.findApplication(id));
  if (!a) return res.status(404).json({ error: "Not found" });
  // redirect to resume if available
  if ((a as any).resumeUrl) return res.redirect((a as any).resumeUrl);
  return res.json({ status: "success", data: a });
}

export async function updateApplication(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await RecruitmentService.updateApplication(id, payload as any);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:application:${id}`);
  return res.json({ status: "success", data: updated });
}

export async function deleteApplication(req: Request, res: Response) {
  const id = req.params.id;
  await RecruitmentService.deleteApplication(id);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:application:${id}`);
  return res.status(204).send();
}