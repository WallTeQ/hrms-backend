import { Request, Response } from "express";
import { DocumentsService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis.js";
import { uploadBuffer } from "../../../infra/cloudinary.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function uploadDocument(req: Request, res: Response) {
  try {
    const payload = req.body as any;

    // Handle file upload if present
    if ((req as any).file) {
      const file = (req as any).file;
      const filename = (file.originalname || `file-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
      const result = await uploadBuffer(file.buffer, filename, { folder: `employees/${req.params.employeeId}` });
      payload.fileUrl = result?.secure_url;
      payload.publicId = result?.public_id;
      payload.mimeType = file.mimetype;
      payload.size = file.size;
    }

    // Ensure employeeId is set
    payload.employeeId = req.params.employeeId;

    // Ensure a file was uploaded or a fileUrl provided
    if (!payload.fileUrl) {
      return res.status(400).json({ error: "file or fileUrl is required" });
    }

    const doc = await DocumentsService.create(payload as any);
    if ((payload as any).employeeId) await cacheDelByPrefix(`employees:detail:${(payload as any).employeeId}`);
    await cacheDelByPrefix("employees");
    return res.status(201).json({ status: "success", data: doc });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Upload failed" });
  }
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