import { Request, Response } from "express";
import { TrainingsService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function createTraining(req: Request, res: Response) {
  const payload = req.body;
  const t = await TrainingsService.createTraining(payload as any);
  // invalidate training list cache
  await cacheDelByPrefix("trainings:list");
  return res.status(201).json({ status: "success", data: t });
}

export async function listTrainings(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `trainings:list:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 30, () => TrainingsService.listTrainings(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
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
  const payload = req.body;
  const updated = await TrainingsService.updateTraining(id, payload as any);
  await cacheDelByPrefix("trainings:list");
  return res.json({ status: "success", data: updated });
}

export async function deleteTraining(req: Request, res: Response) {
  const id = req.params.id;
  await TrainingsService.deleteTraining(id);
  await cacheDelByPrefix("trainings:list");
  return res.status(204).send();
}

export async function createSkill(req: Request, res: Response) {
  const payload = req.body;
  const s = await TrainingsService.createSkill(payload as any);
  await cacheDelByPrefix("trainings:skills");
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
  await cacheDelByPrefix("trainings:skills");
  return res.json({ status: "success", data: updated });
}

export async function deleteSkill(req: Request, res: Response) {
  const id = req.params.id;
  await TrainingsService.deleteSkill(id);
  await cacheDelByPrefix("trainings:skills");
  return res.status(204).send();
}

export async function listSkills(req: Request, res: Response) {
  const key = `trainings:skills:list`;
  const items = await cacheWrap(key, 60, () => TrainingsService.listSkills());
  return res.json({ status: "success", length: items.length, data: items });
}