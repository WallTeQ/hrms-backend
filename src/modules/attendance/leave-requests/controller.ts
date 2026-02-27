import { Request, Response } from "express";
import { LeaveRequestService } from "./service.js";
import type { CreateLeaveRequestDto, UpdateLeaveStatusDto, UpdateLeaveRequestDto } from "./schema.js";

export async function createLeaveRequest(req: Request, res: Response) {
  const payload = req.body as CreateLeaveRequestDto;
  const leave = await LeaveRequestService.create(payload as any);
  return res.status(201).json({ status: "success", data: leave });
}

export async function listLeaveRequestsForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const items = await LeaveRequestService.listForEmployee(employeeId, skip, take);
  return res.json({ status: "success", data: items });
}

export async function listLeaveRequests(req: Request, res: Response) {
  const user = (req as any).user;
  const role = user?.role;
  const { status, employeeId } = req.query;
  let filters: any = {};
  if (status) filters.status = status as string;
  if (role !== "SUPER_ADMIN") {
    if (!employeeId) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }
    filters.employeeId = employeeId as string;
  } else {
    if (employeeId) filters.employeeId = employeeId as string;
  }
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const items = await LeaveRequestService.list(filters, skip, take);
  return res.json({ status: "success", data: items });
}

export async function getLeaveRequest(req: Request, res: Response) {
  const id = req.params.id;
  const leave = await LeaveRequestService.find(id);
  if (!leave) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: leave });
}

export async function updateLeaveRequest(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as UpdateLeaveRequestDto;
  const leave = await LeaveRequestService.update(id, payload as any);
  return res.json({ status: "success", data: leave });
}

export async function updateLeaveStatus(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body as UpdateLeaveStatusDto;
  const actorId = (req as any).user?.id as string | undefined;
  const leave = await LeaveRequestService.updateStatus(id, payload.status, actorId);
  return res.json({ status: "success", data: leave });
}

export async function deleteLeaveRequest(req: Request, res: Response) {
  const id = req.params.id;
  await LeaveRequestService.delete(id);
  return res.status(204).send();
}
