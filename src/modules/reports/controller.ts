import { Request, Response } from "express";
import { ReportsService } from "./service";

import { cacheWrap, cacheDel } from "../../infra/redis";

export async function attendanceSummary(req: Request, res: Response) {
  const startDate = new Date(String(req.query.startDate));
  const endDate = new Date(String(req.query.endDate));
  const key = `reports:attendance:${startDate.toISOString()}:${endDate.toISOString()}`;
  const report = await cacheWrap(key, 60, () => ReportsService.attendanceSummary(startDate, endDate));
  return res.json(report);
}

export async function payrollSummary(req: Request, res: Response) {
  const period = String(req.query.period || req.body.period);
  const key = `reports:payroll:${period}`;
  const report = await cacheWrap(key, 60, () => ReportsService.payrollSummary(period));
  return res.json(report);
}

export async function headcount(req: Request, res: Response) {
  const key = `reports:headcount`;
  const stats = await cacheWrap(key, 60, () => ReportsService.headcount());
  return res.json(stats);
}