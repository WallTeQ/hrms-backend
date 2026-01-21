import { Request, Response } from "express";
import { ContractsService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis.js";
import { uploadBuffer } from "../../../infra/cloudinary.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function createContract(req: Request, res: Response) {
  try {
    const payload = req.body as any;

    // Ensure employeeId
    payload.employeeId = req.params.employeeId;

    // If there's a file, create contract immediately then enqueue upload job
    if ((req as any).file) {
      const file = (req as any).file;
      // Remove any file metadata from payload before creating record
      const createPayload = { ...payload };
      delete createPayload.fileUrl;
      delete createPayload.publicId;
      delete createPayload.mimeType;
      delete createPayload.size;

      // mark as pending upload
      createPayload.uploadStatus = 'PENDING';

      const c = await ContractsService.create(createPayload as any);

      // enqueue background upload using BullMQ
      try {
        const { enqueueContractUpload } = await import("../../../queues/contractUploadQueue.js");
        const filename = (file.originalname || `contract-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
        await enqueueContractUpload({
          contractId: c.id,
          employeeId: createPayload.employeeId,
          fileBase64: file.buffer.toString('base64'),
          filename,
          mimeType: file.mimetype,
          size: file.size,
        });
      } catch (err) {
        console.error('Failed to enqueue contract upload', err);
      }

      // invalidate caches for creation
      if ((createPayload as any).employeeId) await cacheDelByPrefix(`employees:detail:${(createPayload as any).employeeId}`);
      await cacheDelByPrefix("employees");
      await cacheDelByPrefix("reports:headcount");

      return res.status(201).json({ status: "success", data: c, message: "Contract created, file upload queued" });
    }

    // No file: create synchronously
    const c = await ContractsService.create(payload as any);
    if ((payload as any).employeeId) await cacheDelByPrefix(`employees:detail:${(payload as any).employeeId}`);
    await cacheDelByPrefix("employees");
    await cacheDelByPrefix("reports:headcount");
    return res.status(201).json({ status: "success", data: c });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Upload failed" });
  }
}

export async function listContractsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `contracts:employee:${employeeId}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 30, () => ContractsService.listForEmployee(employeeId, skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function listFailedUploads(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const result = await ContractsService.listFailed(skip, take) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getContract(req: Request, res: Response) {
  const id = req.params.id;
  const c = await ContractsService.find(id);
  if (!c) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: c });
}

export async function updateContract(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await ContractsService.update(id, payload as any);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("reports:headcount");
  return res.json({ status: "success", data: updated });
}

export async function deleteContract(req: Request, res: Response) {
  const id = req.params.id;
  await ContractsService.delete(id);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("reports:headcount");
  return res.status(204).send();
}

export async function retryUpload(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "file is required to retry upload" });

    const c = await ContractsService.find(id);
    if (!c) return res.status(404).json({ error: "Not found" });

    // Ensure contract belongs to the same employee param
    const employeeId = req.params.employeeId;
    if (c.employeeId !== employeeId) return res.status(400).json({ error: "Mismatched employeeId" });

    // mark as pending and reset attempts
    await ContractsService.update(id, { uploadStatus: 'PENDING', uploadError: null, uploadAttempts: 0 } as any);

    // enqueue upload job with provided file
    const { enqueueContractUpload } = await import("../../../queues/contractUploadQueue.js");
    const filename = (file.originalname || `contract-retry-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
    await enqueueContractUpload({
      contractId: id,
      employeeId,
      fileBase64: file.buffer.toString('base64'),
      filename,
      mimeType: file.mimetype,
      size: file.size,
    });

    // invalidate caches
    await cacheDelByPrefix(`employees:detail:${employeeId}`);
    await cacheDelByPrefix("employees");
    await cacheDelByPrefix("reports:headcount");

    return res.status(202).json({ status: "success", message: "Retry enqueued" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Retry failed" });
  }
}