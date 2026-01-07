import { Request, Response } from "express";
import { AttendanceService } from "./service";
import type { MarkAttendanceDto } from "./schema";

export async function markAttendance(req: Request, res: Response) {
  try {
    const payload = req.body as MarkAttendanceDto;
    const date = new Date(payload.date);
    const result = await AttendanceService.markAttendance(payload.employeeId, date, payload.status as any);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to mark attendance" });
  }
}

export async function createAttendance(req: Request, res: Response) {
  try {
    const payload = req.body;
    const result = await AttendanceService.create(payload as any);
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to create attendance" });
  }
}

export async function getAttendance(req: Request, res: Response) {
  const id = req.params.id;
  const rec = await AttendanceService.getById(id);
  if (!rec) return res.status(404).json({ error: "Not found" });
  return res.json(rec);
}

export async function updateAttendance(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const payload = req.body;
    const updated = await AttendanceService.update(id, payload as any);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to update" });
  }
}

export async function deleteAttendance(req: Request, res: Response) {
  const id = req.params.id;
  await AttendanceService.delete(id);
  return res.status(204).send();
}

export async function listAttendance(req: Request, res: Response) {
  const { employeeId, startDate, endDate } = req.query;
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 100);
  const results = await AttendanceService.list({
    employeeId: employeeId as string | undefined,
    startDate: startDate ? new Date(String(startDate)) : undefined,
    endDate: endDate ? new Date(String(endDate)) : undefined,
    skip,
    take,
  });
  return res.json(results);
}