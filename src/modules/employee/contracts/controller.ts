import { Request, Response } from "express";
import { ContractsService } from "./service";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis";
import { uploadBuffer } from "../../../infra/cloudinary";

export async function createContract(req: Request, res: Response) {
  try {
    const payload = req.body as any;

    // Handle optional file upload
    if ((req as any).file) {
      const file = (req as any).file;
      const filename = (file.originalname || `contract-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
      const result = await uploadBuffer(file.buffer, filename, { folder: `employees/${req.params.employeeId}/contracts` });
      payload.fileUrl = result?.secure_url;
      payload.publicId = result?.public_id;
      payload.mimeType = file.mimetype;
      payload.size = file.size;
    }

    // Ensure employeeId
    payload.employeeId = req.params.employeeId;

    const c = await ContractsService.create(payload as any);
    // Invalidate employee caches as contract affects employee data
    if ((payload as any).employeeId) await cacheDelByPrefix(`employees:detail:${(payload as any).employeeId}`);
    await cacheDelByPrefix("employees");
    await cacheDelByPrefix("reports:headcount");
    return res.status(201).json(c);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Upload failed" });
  }
}

export async function listContractsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const key = `contracts:employee:${employeeId}:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 30, () => ContractsService.listForEmployee(employeeId, skip, take));
  return res.json(items);
}

export async function getContract(req: Request, res: Response) {
  const id = req.params.id;
  const c = await ContractsService.find(id);
  if (!c) return res.status(404).json({ error: "Not found" });
  return res.json(c);
}

export async function updateContract(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await ContractsService.update(id, payload as any);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("reports:headcount");
  return res.json(updated);
}

export async function deleteContract(req: Request, res: Response) {
  const id = req.params.id;
  await ContractsService.delete(id);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("reports:headcount");
  return res.status(204).send();
}