import { Request, Response } from "express";
import { PayrollService } from "../service";
import { cacheWrap, cacheDelByPrefix } from "../../../infra/redis";

export async function createSalaryStructure(req: Request, res: Response) {
  const payload = req.body;
  const s = await PayrollService.createSalaryStructure(payload as any);
  await cacheDelByPrefix("payroll:salary-structures");
  if ((payload as any).employeeId) await cacheDelByPrefix(`payroll:salary-structures:employee=${(payload as any).employeeId}`);
  return res.status(201).json(s);
}

export async function updateSalaryStructure(req: Request, res: Response) {
  const id = req.params.id;
  const payload = req.body;
  const updated = await PayrollService.updateSalaryStructure(id, payload as any);
  await cacheDelByPrefix("payroll:salary-structures");
  return res.json(updated);
}

export async function deleteSalaryStructure(req: Request, res: Response) {
  await PayrollService.deleteSalaryStructure(req.params.id);
  await cacheDelByPrefix("payroll:salary-structures");
  return res.status(204).send();
}

export async function listSalaryStructures(req: Request, res: Response) {
  const employeeId = req.query.employeeId as string | undefined;
  if (employeeId) {
    const key = `payroll:salary-structures:employee=${employeeId}`;
    const items = await cacheWrap(key, 60, () => PayrollService.getSalaryStructuresForEmployee(employeeId));
    return res.json(items);
  }
  return res.json([]);
}