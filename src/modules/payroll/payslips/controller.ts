import { Request, Response } from "express";
import { PayrollService } from "../service.js";
import { cacheWrap, cacheSet, cacheDel, cacheDelByPrefix } from "../../../infra/redis.js";
import { uploadBuffer } from "../../../infra/cloudinary.js";
import { getPaginationOptions, createPaginationResult } from "../../../common/pagination.js";

export async function createPayslip(req: Request, res: Response) {
  try {
    const payload = req.body as any;
    if ((req as any).file) {
      const file = (req as any).file;
      const filename = (file.originalname || `payslip-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
      const result = await uploadBuffer(file.buffer, filename, { folder: `payroll/payslips/${payload.employeeId}` });
      payload.fileUrl = result?.secure_url;
      payload.publicId = result?.public_id;
      payload.mimeType = file.mimetype;
      payload.size = file.size;
    }
    // Resolve (or create) the payroll run using month+year provided by the client.
    // Ignore any incoming payrollRunId - clients must not supply it.
    const run = await PayrollService.getOrCreatePayrollRun(Number(payload.year), Number(payload.month));

    // Build a sanitized data object so only expected fields go to Prisma
    const data: any = {
      payrollRunId: run.id,
      employeeId: payload.employeeId,
      gross: payload.gross != null ? payload.gross : 0,
      net: payload.net != null ? payload.net : 0,
      month: Number(payload.month),
      year: Number(payload.year),
      fileUrl: payload.fileUrl,
      publicId: payload.publicId,
      mimeType: payload.mimeType,
      size: payload.size,
    };

    const p = await PayrollService.createPayslip(data);
    // Populate single payslip cache (short-lived) and invalidate lists asynchronously
    if (p?.id) cacheSet(`payroll:payslip:${p.id}`, p, 300).catch(() => {});
    if (data.employeeId) cacheDelByPrefix(`payroll:payslips:employee:${data.employeeId}`).catch(() => {});
    cacheDelByPrefix("reports:payroll").catch(() => {});
    return res.status(201).json({ status: "success", data: p });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Failed to create payslip" });
  }
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

export async function updatePayslip(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PayrollService.updatePayslip(id, payload as any);
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