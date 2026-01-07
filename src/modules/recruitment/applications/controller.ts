import { Request, Response } from "express";
import { RecruitmentService } from "../service";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis";
import { uploadBuffer } from "../../../infra/cloudinary";

export async function createApplication(req: Request, res: Response) {
  try {
    const payload = req.body as any;

    // handle optional file upload (resume)
    if ((req as any).file) {
      const file = (req as any).file;
      const filename = (file.originalname || `resume-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
      const result = await uploadBuffer(file.buffer, filename, { folder: `recruitment/vacancies/${payload.vacancyId}` });
      payload.resumeUrl = result?.secure_url;
      payload.publicId = result?.public_id;
      payload.mimeType = file.mimetype;
      payload.size = file.size;
    }

    const a = await RecruitmentService.createApplication(payload as any);
    // invalidate vacancy application list and general vacancy caches
    if ((payload as any).vacancyId) await cacheDelByPrefix(`recruitment:vacancy:${(payload as any).vacancyId}:applications`);
    await cacheDelByPrefix("recruitment:vacancies");
    return res.status(201).json(a);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Failed to create application" });
  }
}

export async function listApplicationsForVacancy(req: Request, res: Response) {
  const vacancyId = req.params.vacancyId;
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const key = `recruitment:vacancy:${vacancyId}:applications:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 30, () => RecruitmentService.listApplicationsForVacancy(vacancyId, skip, take));
  return res.json(items);
}

export async function getApplication(req: Request, res: Response) {
  const id = req.params.id;
  const key = `recruitment:application:${id}`;
  const a = await cacheWrap(key, 60, () => RecruitmentService.findApplication(id));
  if (!a) return res.status(404).json({ error: "Not found" });
  // redirect to resume if available
  if ((a as any).resumeUrl) return res.redirect((a as any).resumeUrl);
  return res.json(a);
}

export async function updateApplication(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await RecruitmentService.updateApplication(id, payload as any);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:application:${id}`);
  return res.json(updated);
}

export async function deleteApplication(req: Request, res: Response) {
  const id = req.params.id;
  await RecruitmentService.deleteApplication(id);
  await cacheDelByPrefix("recruitment:vacancies");
  await cacheDelByPrefix(`recruitment:application:${id}`);
  return res.status(204).send();
}