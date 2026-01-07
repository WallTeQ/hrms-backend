import { Request, Response } from "express";
import { PayrollService } from "./service";

export async function createSalaryStructure(req: Request, res: Response) {
  const payload = req.body;
  const s = await PayrollService.createSalaryStructure(payload as any);
  return res.status(201).json(s);
}

export async function listSalaryStructuresForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const items = await PayrollService.getSalaryStructuresForEmployee(employeeId);
  return res.json(items);
}

export async function processPayroll(req: Request, res: Response) {
  const payload = req.body;
  const run = await PayrollService.createPayrollRun(payload as any);
  return res.status(201).json(run);
}

export async function getPayrollRun(req: Request, res: Response) {
  const id = req.params.id;
  const run = await PayrollService.findPayrollRun(id);
  if (!run) return res.status(404).json({ error: "Not found" });
  return res.json(run);
}

export async function listPayrollRuns(req: Request, res: Response) {
  const skip = Number(req.query.skip || 0);
  const take = Number(req.query.take || 20);
  const runs = await PayrollService.listPayrollRuns(skip, take);
  return res.json(runs);
}