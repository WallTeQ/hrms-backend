import { Request, Response } from "express";
import { PayrollService } from "../service";
import { cacheDelByPrefix } from "../../../infra/redis";

export async function createStatutoryDeduction(req: Request, res: Response) {
  try {
    const payload = req.body as any;
    const s = await PayrollService.createStatutoryDeduction(payload);
    await cacheDelByPrefix("reports:payroll");
    return res.status(201).json(s);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to create" });
  }
}

export async function listStatutoryDeductions(req: Request, res: Response) {
  const items = await PayrollService.listStatutoryDeductions();
  return res.json(items);
}

export async function getStatutoryDeduction(req: Request, res: Response) {
  const id = req.params.id;
  const s = await PayrollService.getStatutoryDeduction(id);
  if (!s) return res.status(404).json({ error: "Not found" });
  return res.json(s);
}

export async function updateStatutoryDeduction(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const payload = req.body as any;
    const existing = await PayrollService.getStatutoryDeduction(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = await PayrollService.updateStatutoryDeduction(id, payload);
    await cacheDelByPrefix("reports:payroll");
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to update" });
  }
}

export async function deleteStatutoryDeduction(req: Request, res: Response) {
  const id = req.params.id;
  await PayrollService.deleteStatutoryDeduction(id);
  await cacheDelByPrefix("reports:payroll");
  return res.status(204).send();
}
