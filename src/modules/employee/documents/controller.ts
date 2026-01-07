import { Request, Response } from "express";
import { DocumentsService } from "./service";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis";
import { uploadBuffer } from "../../../infra/cloudinary";

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

    const doc = await DocumentsService.create(payload as any);
    if ((payload as any).employeeId) await cacheDelByPrefix(`employees:detail:${(payload as any).employeeId}`);
    await cacheDelByPrefix("employees");
    return res.status(201).json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Upload failed" });
  }
}

export async function listDocumentsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const key = `documents:employee:${employeeId}:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 30, () => DocumentsService.listForEmployee(employeeId, skip, take));
  return res.json(items);
}

export async function getDocument(req: Request, res: Response) {
  const id = req.params.id;
  const doc = await DocumentsService.find(id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  // If fileUrl points to Cloudinary, redirect to CDN URL so the client fetches it directly
  if ((doc as any).fileUrl) return res.redirect((doc as any).fileUrl);
  return res.json(doc);
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
  return res.json(items);
}