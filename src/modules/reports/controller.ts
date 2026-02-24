import { Request, Response } from "express";
import { ReportsService } from "./service.js";

import { cacheWrap } from "../../infra/redis.js";

export async function attendanceSummary(req: Request, res: Response) {
  const startDate = new Date(String(req.query.startDate));
  const endDate = new Date(String(req.query.endDate));
  const key = `reports:attendance:${startDate.toISOString()}:${endDate.toISOString()}`;
  const report = await cacheWrap(key, 60, () => ReportsService.attendanceSummary(startDate, endDate));
  return res.json({ status: "success", data: report });
}

export async function payrollSummary(req: Request, res: Response) {
  const period = String(req.query.period || req.body.period);
  const key = `reports:payroll:${period}`;
  const report = await cacheWrap(key, 60, () => ReportsService.payrollSummary(period));
  return res.json({ status: "success", data: report });
}

export async function headcount(_req: Request, res: Response) {
  const key = `reports:headcount`;
  const stats = await cacheWrap(key, 60, () => ReportsService.headcount());
  return res.json({ status: "success", data: stats });
}

export async function dashboardStats(_req: Request, res: Response) {
  const key = `reports:dashboard`;
  const stats = await cacheWrap(key, 300, () => ReportsService.dashboardStats());
  return res.json({ status: "success", data: stats });
}

export async function departmentStats(_req: Request, res: Response) {
  const key = `reports:departments`;
  const stats = await cacheWrap(key, 300, () => ReportsService.employeeStatsByDepartment());
  return res.json({ status: "success", data: stats });
}

export async function skillStats(_req: Request, res: Response) {
  const key = `reports:skills`;
  const stats = await cacheWrap(key, 300, () => ReportsService.employeeStatsBySkill());
  return res.json({ status: "success", data: stats });
}

export async function performanceReport(req: Request, res: Response) {
  const period = req.query.period ? String(req.query.period) : undefined;
  const key = `reports:performance:${period || "all"}`;
  const report = await cacheWrap(key, 300, () => ReportsService.performanceReport(period));
  return res.json({ status: "success", data: report });
}

export async function performanceByShift(req: Request, res: Response) {
  const period = req.query.period ? String(req.query.period) : undefined;
  const key = `reports:performance:shift:${period || "all"}`;
  const report = await cacheWrap(key, 300, () => ReportsService.performanceByShift(period));
  return res.json({ status: "success", data: report });
}

export async function attendanceByDepartment(req: Request, res: Response) {
  const startDate = new Date(String(req.query.startDate));
  const endDate = new Date(String(req.query.endDate));
  const key = `reports:attendance:department:${startDate.toISOString()}:${endDate.toISOString()}`;
  const report = await cacheWrap(key, 300, () => ReportsService.attendanceReport(startDate, endDate));
  return res.json({ status: "success", data: report });
}

export async function attendanceByShift(req: Request, res: Response) {
  const startDate = new Date(String(req.query.startDate));
  const endDate = new Date(String(req.query.endDate));
  const key = `reports:attendance:shift:${startDate.toISOString()}:${endDate.toISOString()}`;
  const report = await cacheWrap(key, 300, () => ReportsService.attendanceByShift(startDate, endDate));
  return res.json({ status: "success", data: report });
}

export async function overtimeByShift(req: Request, res: Response) {
  const startDate = new Date(String(req.query.startDate));
  const endDate = new Date(String(req.query.endDate));
  const key = `reports:overtime:shift:${startDate.toISOString()}:${endDate.toISOString()}`;
  const report = await cacheWrap(key, 300, () => ReportsService.overtimeByShift(startDate, endDate));
  return res.json({ status: "success", data: report });
}

export async function departmentProductivity(req: Request, res: Response) {
  const period = req.query.period ? String(req.query.period) : undefined;
  const key = `reports:productivity:${period || "all"}`;
  const report = await cacheWrap(key, 300, () => ReportsService.departmentProductivity(period));
  return res.json({ status: "success", data: report });
}

export async function productivityByShift(req: Request, res: Response) {
  const period = req.query.period ? String(req.query.period) : undefined;
  const key = `reports:productivity:shift:${period || "all"}`;
  const report = await cacheWrap(key, 300, () => ReportsService.productivityByShift(period));
  return res.json({ status: "success", data: report });
}

export async function retirementForecast(req: Request, res: Response) {
  const monthsAhead = req.query.monthsAhead ? Number(req.query.monthsAhead) : 12;
  const key = `reports:retirement:${monthsAhead}`;
  const report = await cacheWrap(key, 300, () => ReportsService.retirementForecast(monthsAhead));
  return res.json({ status: "success", data: report });
}

export async function leaveUtilization(req: Request, res: Response) {
  const startDate = new Date(String(req.query.startDate));
  const endDate = new Date(String(req.query.endDate));
  const key = `reports:leave:${startDate.toISOString()}:${endDate.toISOString()}`;
  const report = await cacheWrap(key, 300, () => ReportsService.leaveUtilization(startDate, endDate));
  return res.json({ status: "success", data: report });
}

export async function salaryProjection(req: Request, res: Response) {
  const monthsAhead = req.query.monthsAhead ? Number(req.query.monthsAhead) : 12;
  const key = `reports:salary:${monthsAhead}`;
  const report = await cacheWrap(key, 300, () => ReportsService.salaryCostProjection(monthsAhead));
  return res.json({ status: "success", data: report });
}