import { Request, Response } from "express";
import { AttendanceService } from "./service.js";
import { cacheWrap } from "../../infra/redis.js";
import { validate } from "../../middlewares/validate.js";
import type { MarkAttendanceDto, CreateAttendanceDto } from "./schema.js";
import { CreateAttendanceSchema } from "./schema.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function markAttendance(req: Request, res: Response) {
  const payload = req.body as MarkAttendanceDto;
  const userId = (req as any).user?.id as string | undefined;

  const result = await AttendanceService.markAttendance({
    employeeId: payload.employeeId,
    date: payload.date,
    status: payload.status as any,
    clockIn: payload.clockIn as any,
    clockOut: payload.clockOut as any,
    entryMethod: payload.entryMethod as any,
    overtimeApproved: payload.overtimeApproved,
    notes: payload.notes ?? null,
    recordedByUserId: userId,
  });

  // Map response to use user-friendly field names and format times
  const responseData = {
    ...result,
    checkIn: (result as any).clockIn ? (result as any).clockIn.toTimeString().slice(0, 5) : null,
    checkOut: (result as any).clockOut ? (result as any).clockOut.toTimeString().slice(0, 5) : null,
  };
  delete (responseData as any).clockIn;
  delete (responseData as any).clockOut;

  return res.status(201).json({ status: "success", data: responseData });
}

export async function clockOut(req: Request, res: Response) {
  const { employeeId } = req.body;
  const result = await AttendanceService.clockOut(employeeId);

  // Map response to use user-friendly field names and format times
  const responseData = {
    ...result,
    checkIn: result.clockIn ? result.clockIn.toTimeString().slice(0, 5) : null,
    checkOut: result.clockOut ? result.clockOut.toTimeString().slice(0, 5) : null,
  };
  delete responseData.clockIn;
  delete responseData.clockOut;

  return res.json({ status: "success", data: responseData });
}

export async function createAttendance(req: Request, res: Response) {
  const payload = req.body as CreateAttendanceDto;
  const userId = (req as any).user?.id as string | undefined;
  const result = await AttendanceService.create(payload, { recordedByUserId: userId });

  // Map response to use user-friendly field names and format times
  const responseData = {
    ...result,
    checkIn: result.clockIn ? result.clockIn.toTimeString().slice(0, 5) : null,
    checkOut: result.clockOut ? result.clockOut.toTimeString().slice(0, 5) : null,
  };
  delete responseData.clockIn;
  delete responseData.clockOut;

  return res.status(201).json({ status: "success", data: responseData });
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
  const role = user?.role || "anonymous";
  const scopeEmployeeId = role === "EMPLOYEE" ? user?.employeeId || "self" : (employeeId as string | undefined) || "all";

  const key = `attendance:list:role=${role}:employeeId=${scopeEmployeeId}:startDate=${startDate || 'none'}:endDate=${endDate || 'none'}:skip=${skip}:take=${take}`;
  const result = await cacheWrap(key, 60, () => AttendanceService.list({
    employeeId: employeeId as string | undefined,
    startDate: startDate ? new Date(String(startDate)) : undefined,
    endDate: endDate ? new Date(String(endDate)) : undefined,
    skip,
    take,
  }, user)) as { items: any[]; total: number };
  
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