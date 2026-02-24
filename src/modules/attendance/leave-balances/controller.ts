import { Request, Response } from "express";
import { LeaveBalanceService } from "./service.js";
import type { LeaveBalanceDto } from "./schema.js";

export async function getLeaveBalance(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const year = Number(req.query.year || new Date().getFullYear());
  const balance = await LeaveBalanceService.getForEmployee(employeeId, year);
  return res.json({ status: "success", data: balance });
}

export async function listLeaveBalances(req: Request, res: Response) {
  const year = Number(req.query.year || new Date().getFullYear());
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 50);
  const items = await LeaveBalanceService.listForYear(year, skip, take);
  return res.json({ status: "success", data: items });
}

export async function upsertLeaveBalance(req: Request, res: Response) {
  const payload = req.body as LeaveBalanceDto;
  const result = await LeaveBalanceService.upsertBalance(payload.employeeId, payload.year, payload.balance);
  return res.status(201).json({ status: "success", data: result });
}

export async function deleteLeaveBalance(req: Request, res: Response) {
  const id = req.params.id;
  await LeaveBalanceService.deleteBalance(id);
  return res.status(204).send();
}
