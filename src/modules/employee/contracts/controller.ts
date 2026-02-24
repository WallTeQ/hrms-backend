import { Request, Response } from "express";
import { ContractsService } from "./service.js";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis.js";
import { uploadBuffer } from "../../../infra/cloudinary.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function createContract(req: Request, res: Response) {
  const payload = req.body as any;

  // Ensure employeeId
  payload.employeeId = req.params.employeeId;

  const file = (req as any).file as Express.Multer.File | undefined;
  const { contract, uploadQueued } = await ContractsService.createWithUpload(payload as any, file);

  if ((payload as any).employeeId) await cacheDelByPrefix(`employees:detail:${(payload as any).employeeId}`);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("reports:headcount");

  const message = uploadQueued ? "Contract created, file upload queued" : undefined;
  return res.status(201).json({ status: "success", data: contract, ...(message ? { message } : {}) });
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
  const id = req.params.id;
  const file = (req as any).file as Express.Multer.File | undefined;
  const employeeId = req.params.employeeId;

  await ContractsService.retryUpload(id, employeeId, file as any);

  await cacheDelByPrefix(`employees:detail:${employeeId}`);
  await cacheDelByPrefix("employees");
  await cacheDelByPrefix("reports:headcount");

  return res.status(202).json({ status: "success", message: "Retry enqueued" });
}