import { Request, Response } from "express";
import { PerformanceService } from "../service.js";

export async function getEvaluation(req: Request, res: Response) {
  const id = req.params.id;
  const e = await PerformanceService.getEvaluation(id);
  if (!e) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: e });
}

export async function updateEvaluation(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PerformanceService.updateEvaluation(id, payload as any);
  return res.json({ status: "success", data: updated });
}

export async function deleteEvaluation(req: Request, res: Response) {
  await PerformanceService.deleteEvaluation(req.params.id);
  return res.status(204).send();
}