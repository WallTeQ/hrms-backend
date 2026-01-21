import { Request, Response } from "express";
import { PerformanceService } from "../service.js";

export async function getKpi(req: Request, res: Response) {
  const id = req.params.id;
  const k = await PerformanceService.getKpi(id);
  if (!k) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: k });
}

export async function updateKpi(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PerformanceService.updateKpi(id, payload as any);
  return res.json({ status: "success", data: updated });
}

export async function deleteKpi(req: Request, res: Response) {
  await PerformanceService.deleteKpi(req.params.id);
  return res.status(204).send();
}