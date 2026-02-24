import { Request, Response } from "express";
import { TrainingsService } from "./service.js";
import { cacheWrap, cacheDelByPrefix, cacheSet, cacheGet } from "../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";
import { createHash } from "crypto";

export async function createTraining(req: Request, res: Response) {
  const payload = req.body as any;
  const t = await TrainingsService.createTraining(payload as any);
  // invalidate training list cache
  await cacheDelByPrefix("trainings:list");
  try { await cacheSet("trainings:version", Date.now().toString()); } catch (e) {}
  try {
    const ver = await cacheGet("trainings:version");
    if (ver) {
      res.setHeader("ETag", `"${ver}"`);
      res.setHeader("X-Trainings-Version", ver);
    }
  } catch (e) {}
  return res.status(201).json({ status: "success", data: t });
}

export async function listTrainings(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `trainings:list:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 30, () => TrainingsService.listTrainings(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });

  // ETag / version handling
  try {
    const ver = await cacheGet("trainings:version");
    let currentVer = ver as string | null;
    if (!currentVer) {
      try {
        const hash = createHash("sha1").update(JSON.stringify(paginated)).digest("hex");
        currentVer = hash;
        try { await cacheSet("trainings:version", currentVer); } catch (e) {}
      } catch (e) {}
    }
    const etag = currentVer ? `"${currentVer}"` : undefined;
    if (etag) {
      res.setHeader("ETag", etag);
      res.setHeader("X-Trainings-Version", currentVer as string);
      const clientTag = (req.headers["if-none-match"] as string | undefined) || undefined;
      if (clientTag && clientTag === etag) {
        res.setHeader("Cache-Control", "no-cache");
        return res.status(304).send();
      }
    }
  } catch (e) {}

  res.setHeader("Cache-Control", "no-cache");
  return res.json({ status: "success", ...paginated });
}

export async function getTraining(req: Request, res: Response) {
  const id = req.params.id;
  const t = await TrainingsService.getTraining(id);
  if (!t) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: t });
}

export async function updateTraining(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as any;
  const updated = await TrainingsService.updateTraining(id, payload as any);
  await cacheDelByPrefix("trainings:list");
  try { await cacheSet("trainings:version", Date.now().toString()); } catch (e) {}
  try {
    const ver = await cacheGet("trainings:version");
    if (ver) {
      res.setHeader("ETag", `"${ver}"`);
      res.setHeader("X-Trainings-Version", ver);
    }
  } catch (e) {}
  return res.json({ status: "success", data: updated });
}

export async function deleteTraining(req: Request, res: Response) {
  const id = req.params.id;
  await TrainingsService.deleteTraining(id);
  await cacheDelByPrefix("trainings:list");
  try { await cacheSet("trainings:version", Date.now().toString()); } catch (e) {}
  return res.status(204).send();
}

export async function createSkill(req: Request, res: Response) {
  const payload = req.body;
  const s = await TrainingsService.createSkill(payload as any);
  // invalidate skills and trainings so clients re-fetch fresh data
  await cacheDelByPrefix("trainings:skills");
  await cacheDelByPrefix("trainings:list");
  // invalidate per-skill employee caches (safe to clear all skill employee prefixes)
  await cacheDelByPrefix("trainings:skill:");
  try { await cacheSet("trainings:skills:version", Date.now().toString()); } catch (e) {}
  try { await cacheSet("trainings:version", Date.now().toString()); } catch (e) {}
  try {
    const ver = await cacheGet("trainings:skills:version");
    if (ver) {
      res.setHeader("ETag", `"${ver}"`);
      res.setHeader("X-Trainings-Skills-Version", ver);
    }
  } catch (e) {}
  try {
    const tver = await cacheGet("trainings:version");
    if (tver) res.setHeader("X-Trainings-Version", tver as string);
  } catch (e) {}
  return res.status(201).json({ status: "success", data: s });
}

export async function getSkill(req: Request, res: Response) {
  const id = req.params.id;
  const s = await TrainingsService.getSkill(id);
  if (!s) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: s });
}

export async function updateSkill(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await TrainingsService.updateSkill(id, payload as any);
  // invalidate skills and trainings caches so clients see updated names
  await cacheDelByPrefix("trainings:skills");
  await cacheDelByPrefix("trainings:list");
  // invalidate per-skill employee caches for consistency
  await cacheDelByPrefix("trainings:skill:");
  try { await cacheSet("trainings:skills:version", Date.now().toString()); } catch (e) {}
  try { await cacheSet("trainings:version", Date.now().toString()); } catch (e) {}
  try {
    const ver = await cacheGet("trainings:skills:version");
    if (ver) {
      res.setHeader("ETag", `"${ver}"`);
      res.setHeader("X-Trainings-Skills-Version", ver);
    }
  } catch (e) {}
  return res.json({ status: "success", data: updated });
}

export async function deleteSkill(req: Request, res: Response) {
  const id = req.params.id;
  await TrainingsService.deleteSkill(id);

  // invalidate skills and trainings caches so clients get fresh data
  await cacheDelByPrefix("trainings:skills");
  await cacheDelByPrefix("trainings:list");
  // invalidate any per-skill employee caches that may reference the deleted skill
  await cacheDelByPrefix("trainings:skill:");
  try { await cacheSet("trainings:skills:version", Date.now().toString()); } catch (e) {}
  try { await cacheSet("trainings:version", Date.now().toString()); } catch (e) {}
  return res.status(204).send();
}

export async function listSkills(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `trainings:skills:list:skip=${skip}:take=${take}`;
  console.debug("listSkills called", { path: req.path, user: (req as any).user?.id, role: (req as any).user?.role, skip, take });
  const result = await cacheWrap(key, 60, () => TrainingsService.listSkills(skip, take)) as { items: any[]; total: number };

  const paginated = createPaginationResult(result.items, result.total, { ...pagination, page: page || 1 });

  // ETag / version handling for skills (per-page)
  try {
    let ver = await cacheGet("trainings:skills:version");
    if (!ver) {
      try {
        const hash = createHash("sha1").update(JSON.stringify(paginated)).digest("hex");
        ver = hash;
        try { await cacheSet("trainings:skills:version", ver); } catch (e) {}
      } catch (e) {}
    }
    const etag = ver ? `"${ver}"` : undefined;
    if (etag) {
      res.setHeader("ETag", etag);
      res.setHeader("X-Trainings-Skills-Version", ver as string);
      const clientTag = (req.headers["if-none-match"] as string | undefined) || undefined;
      if (clientTag && clientTag === etag) {
        res.setHeader("Cache-Control", "no-cache");
        return res.status(304).send();
      }
    }
  } catch (e) {}

  res.setHeader("Cache-Control", "no-cache");
  return res.json({ status: "success", ...paginated });
}

export async function listEmployeesForSkill(req: Request, res: Response) {
  const skillId = req.params.id;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `trainings:skill:${skillId}:employees:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => TrainingsService.listEmployeesForSkill(skillId, skip, take)) as { items: any[]; total: number };
  const paginated = createPaginationResult(result.items, result.total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function listTrainingRecommendations(req: Request, res: Response) {
  const { employeeId, status, skip, take } = req.query as any;
  const result = await TrainingsService.listTrainingRecommendations({
    employeeId,
    status,
    skip: Number(skip || 0),
    take: Number(take || 50),
  }) as { items: any[]; total: number };
  return res.json({ status: "success", ...result });
}

export async function updateTrainingRecommendation(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as any;
  const updated = await TrainingsService.updateTrainingRecommendation(id, payload as any);
  return res.json({ status: "success", data: updated });
}

export async function generateExpertiseGapRecommendations(req: Request, res: Response) {
  const employeeId = req.query.employeeId ? String(req.query.employeeId) : undefined;
  const result = await TrainingsService.generateExpertiseGapRecommendations(employeeId);
  return res.json({ status: "success", data: result });
}

export async function addTrainingHistory(req: Request, res: Response) {
  const payload = req.body as any;
  const created = await TrainingsService.addTrainingHistory(payload);
  return res.status(201).json({ status: "success", data: created });
}

export async function listTrainingHistoryForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const items = await TrainingsService.listTrainingHistoryForEmployee(employeeId, skip, take) as any[];
  const total = items.length;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function updateTrainingHistory(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as any;
  const updated = await TrainingsService.updateTrainingHistory(id, payload);
  return res.json({ status: "success", data: updated });
}

export async function deleteTrainingHistory(req: Request, res: Response) {
  await TrainingsService.deleteTrainingHistory(req.params.id);
  return res.status(204).send();
}