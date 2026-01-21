import { Request, Response } from "express";
import { AttendanceService } from "./service.js";
import { cacheWrap } from "../../infra/redis.js";
import { validate } from "../../middlewares/validate.js";
import type { MarkAttendanceDto, CreateAttendanceDto } from "./schema.js";
import { CreateAttendanceSchema } from "./schema.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function markAttendance(req: Request, res: Response) {
  try {
    const payload = req.body as MarkAttendanceDto;
    const date = new Date(payload.date);

    // If client provided times but not status, default to PRESENT
    let status = payload.status as any | undefined;
    if (!status && (payload.clockIn || payload.clockOut)) {
      status = "PRESENT";
    }

    const clockInDate = payload.clockIn ? new Date(`${payload.date}T${payload.clockIn}:00`) : undefined;
    const clockOutDate = payload.clockOut ? new Date(`${payload.date}T${payload.clockOut}:00`) : undefined;

    const result = await AttendanceService.markAttendance(payload.employeeId, date, status as any, clockInDate, clockOutDate);

    // Map response to use user-friendly field names and format times
    const responseData = {
      ...result,
      checkIn: (result as any).clockIn ? (result as any).clockIn.toTimeString().slice(0, 5) : null,
      checkOut: (result as any).clockOut ? (result as any).clockOut.toTimeString().slice(0, 5) : null,
    };
    delete (responseData as any).clockIn;
    delete (responseData as any).clockOut;

    return res.status(201).json({ status: "success", data: responseData });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to mark attendance" });
  }
}

export async function createAttendance(req: Request, res: Response) {
  try {
    const payload = req.body as CreateAttendanceDto;
    const result = await AttendanceService.create(payload);
    
    // Map response to use user-friendly field names and format times
    const responseData = {
      ...result,
      checkIn: result.clockIn ? result.clockIn.toTimeString().slice(0, 5) : null,
      checkOut: result.clockOut ? result.clockOut.toTimeString().slice(0, 5) : null,
    };
    delete responseData.clockIn;
    delete responseData.clockOut;
    
    return res.status(201).json({ status: "success", data: responseData });
  } catch (err: any) {
    return res.status(400).json({ error: err?.message ?? "Failed to create attendance" });
  }
}

export async function getAttendance(req: Request, res: Response) {
  const id = req.params.id;
  const rec = await AttendanceService.getById(id);
  if (!rec) return res.status(404).json({ error: "Not found" });
  
  // Map response to use user-friendly field names and format times
  const responseData = {
    ...rec,
    checkIn: rec.clockIn ? rec.clockIn.toTimeString().slice(0, 5) : null,
    checkOut: rec.clockOut ? rec.clockOut.toTimeString().slice(0, 5) : null,
  };
  delete responseData.clockIn;
  delete responseData.clockOut;
  
  return res.json({ status: "success", data: responseData });
}

export async function updateAttendance(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const payload = req.body;
    const updated = await AttendanceService.update(id, payload as any);
    
    // Map response to use user-friendly field names
    const responseData = {
      ...updated,
      checkIn: updated.clockIn,
      checkOut: updated.clockOut,
    };
    delete responseData.clockIn;
    delete responseData.clockOut;
    
    return res.json({ status: "success", data: responseData });
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
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const user = (req as any).user;
  const role = user?.role || 'anonymous';
  const key = `attendance:list:role=${role}:employeeId=${employeeId || 'all'}:startDate=${startDate || 'none'}:endDate=${endDate || 'none'}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => AttendanceService.list({
    employeeId: employeeId as string | undefined,
    startDate: startDate ? new Date(String(startDate)) : undefined,
    endDate: endDate ? new Date(String(endDate)) : undefined,
    skip,
    take,
  })) as { items: any[]; total: number };
  
  const { items, total } = result;
  // Map response to use user-friendly field names
  const mappedResults = items.map((item: any) => ({
    ...item,
    checkIn: item.clockIn,
    checkOut: item.clockOut,
  }));
  delete (mappedResults as any).clockIn;
  delete (mappedResults as any).clockOut;
  
  const paginated = createPaginationResult(mappedResults, total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}