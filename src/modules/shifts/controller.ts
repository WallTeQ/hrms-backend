import { Request, Response } from "express";
import { ShiftsService } from "./service.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function createShift(req: Request, res: Response) {
  const payload = req.body as any;
  const created = await ShiftsService.create(payload as any);
  return res.status(201).json({ status: "success", data: created });
}

export async function listShifts(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const result = await ShiftsService.list(skip, take) as { items: any[]; total: number };
  const paginated = createPaginationResult(result.items, result.total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getShift(req: Request, res: Response) {
  const shift = await ShiftsService.getById(req.params.id);
  if (!shift) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: shift });
}

export async function updateShift(req: Request, res: Response) {
  const updated = await ShiftsService.update(req.params.id, req.body as any);
  return res.json({ status: "success", data: updated });
}

export async function deleteShift(req: Request, res: Response) {
  await ShiftsService.delete(req.params.id);
  return res.status(204).send();
}
