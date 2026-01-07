import { Request, Response } from "express";
import { TrainingsService } from "./service";

import { cacheWrap, cacheDelByPrefix } from "../..//infra/redis";

export async function createTraining(req: Request, res: Response) {
  const payload = req.body;
  const t = await TrainingsService.createTraining(payload as any);
  // invalidate training list cache
  await cacheDelByPrefix("trainings:list");
  return res.status(201).json(t);
}

export async function listTrainings(req: Request, res: Response) {
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const key = `trainings:list:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 30, () => TrainingsService.listTrainings(skip, take));
  return res.json(items);
}

export async function getTraining(req: Request, res: Response) {
  const id = req.params.id;
  const t = await TrainingsService.getTraining(id);
  if (!t) return res.status(404).json({ error: "Not found" });
  return res.json(t);
}

export async function updateTraining(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await TrainingsService.updateTraining(id, payload as any);
  await cacheDelByPrefix("trainings:list");
  return res.json(updated);
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
  return res.status(201).json(s);
}

export async function getSkill(req: Request, res: Response) {
  const id = req.params.id;
  const s = await TrainingsService.getSkill(id);
  if (!s) return res.status(404).json({ error: "Not found" });
  return res.json(s);
}

export async function updateSkill(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await TrainingsService.updateSkill(id, payload as any);
  await cacheDelByPrefix("trainings:skills");
  return res.json(updated);
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
  return res.json(items);
}