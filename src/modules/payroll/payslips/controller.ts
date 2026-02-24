import { Request, Response } from "express";
import { PayrollService } from "../service.js";
import { cacheWrap, cacheSet, cacheDel, cacheDelByPrefix } from "../../../infra/redis.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function createPayslip(req: Request, res: Response) {
  const payload = req.body as any;
  const file = (req as any).file as Express.Multer.File | undefined;
  const p = await PayrollService.createPayslipWithUpload(payload, file);

  if (p?.id) cacheSet(`payroll:payslip:${p.id}`, p, 300).catch(() => {});
  if (payload.employeeId) cacheDelByPrefix(`payroll:payslips:employee:${payload.employeeId}`).catch(() => {});
  cacheDelByPrefix("reports:payroll").catch(() => {});
  return res.status(201).json({ status: "success", data: p });
}

export async function getPayslip(req: Request, res: Response) {
  const id = req.params.id;
  const key = `payroll:payslip:${id}`;
  const p = await cacheWrap(key, 300, () => PayrollService.getPayslip(id));
  if (!p) return res.status(404).json({ error: "Not found" });
  if ((p as any).fileUrl) return res.redirect((p as any).fileUrl);
  return res.json({ status: "success", data: p });
}

export async function listPayslipsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `payroll:payslips:employee:${employeeId}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 300, () => PayrollService.listPayslipsForEmployee(employeeId, skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function listPayslips(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const key = `payroll:payslips:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => PayrollService.listPayslips(skip, take)) as { items: any[]; total: number };
  const { items, total } = result;
  const paginated = createPaginationResult(items, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function updatePayslip(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PayrollService.updatePayslip(id, payload as any);
  await cacheSet(`payroll:payslip:${id}`, updated, 300).catch(() => {});
  await cacheDelByPrefix("payroll:payslips");
  await cacheDelByPrefix("reports:payroll");
  return res.json({ status: "success", data: updated });
}

export async function approvePayslip(req: Request, res: Response) {
  const id = req.params.id;
  const actorId = (req as any).user?.id as string | undefined;
  const updated = await PayrollService.approvePayslip(id, actorId || null);
  await cacheSet(`payroll:payslip:${id}`, updated, 300).catch(() => {});
  await cacheDelByPrefix("payroll:payslips");
  await cacheDelByPrefix("reports:payroll");
  return res.json({ status: "success", data: updated });
}

export async function deletePayslip(req: Request, res: Response) {
  await PayrollService.deletePayslip(req.params.id);
  await cacheDel(`payroll:payslip:${req.params.id}`).catch(() => {});
  await cacheDelByPrefix("payroll:payslips");
  await cacheDelByPrefix("reports:payroll");
  return res.status(204).send();
}