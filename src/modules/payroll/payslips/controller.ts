import { Request, Response } from "express";
import { PayrollService } from "../service";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis";
import { uploadBuffer } from "../../../infra/cloudinary";

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
    const p = await PayrollService.createPayslip(payload as any);
    if ((payload as any).employeeId) await cacheDelByPrefix(`payroll:payslips:employee:${(payload as any).employeeId}`);
    await cacheDelByPrefix("reports:payroll");
    return res.status(201).json(p);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "Failed to create payslip" });
  }
}

export async function getPayslip(req: Request, res: Response) {
  const id = req.params.id;
  const key = `payroll:payslip:${id}`;
  const p = await cacheWrap(key, 60, () => PayrollService.getPayslip(id));
  if (!p) return res.status(404).json({ error: "Not found" });
  if ((p as any).fileUrl) return res.redirect((p as any).fileUrl);
  return res.json(p);
}

export async function listPayslipsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 20);
  const key = `payroll:payslips:employee:${employeeId}:skip=${skip}:take=${take}`;
  const items = await cacheWrap(key, 60, () => PayrollService.listPayslipsForEmployee(employeeId, skip, take));
  return res.json(items);
}

export async function updatePayslip(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PayrollService.updatePayslip(id, payload as any);
  await cacheDelByPrefix("payroll:payslips");
  await cacheDelByPrefix("reports:payroll");
  return res.json(updated);
}

export async function deletePayslip(req: Request, res: Response) {
  await PayrollService.deletePayslip(req.params.id);
  await cacheDelByPrefix("payroll:payslips");
  await cacheDelByPrefix("reports:payroll");
  return res.status(204).send();
}