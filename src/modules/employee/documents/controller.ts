import { Request, Response } from "express";
import { DocumentsService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function uploadDocument(req: Request, res: Response) {
  const payload = req.body as any;
  payload.employeeId = req.params.employeeId;
  const file = (req as any).file as Express.Multer.File | undefined;

  const doc = await DocumentsService.createWithUpload(payload as any, file);
  if ((payload as any).employeeId) await cacheDelByPrefix(`employees:detail:${(payload as any).employeeId}`);
  await cacheDelByPrefix("employees");
  return res.status(201).json({ status: "success", data: doc });
}

export async function listDocumentsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `documents:employee:${employeeId}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 30, () => DocumentsService.listForEmployee(employeeId, skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getDocument(req: Request, res: Response) {
  const id = req.params.id;
  const doc = await DocumentsService.find(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  // If fileUrl points to Cloudinary, redirect to CDN URL so the client fetches it directly
  if ((doc as any).fileUrl) return res.redirect((doc as any).fileUrl);
  return res.json({ status: "success", data: doc });
}

export async function deleteDocument(req: Request, res: Response) {
  const id = req.params.id;
  await DocumentsService.delete(id);
  await cacheDelByPrefix("employees");
  return res.status(204).send();
}

export async function listExpiring(req: Request, res: Response) {
  const withinDays = Number(req.query.withinDays || 30);
  const key = `documents:expiring:within=${withinDays}`;
  const items = await cacheWrap(key, 60, () => DocumentsService.listExpiring(withinDays));
  return res.json({ status: "success", length: items.length, data: items });
}