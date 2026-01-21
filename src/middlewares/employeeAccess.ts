import { Request, Response, NextFunction } from "express";

// Attach employeeId from route params to request body
export function attachEmployeeId(req: Request, res: Response, next: NextFunction) {
  if (!req.body) (req as any).body = {};
  (req as any).body.employeeId = req.params.employeeId;
  return next();
}

// Ensure EMPLOYEE role can only act on their own employeeId
export function ensureSelfOrPermission(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (user?.role === 'EMPLOYEE' && user.employeeId !== req.params.employeeId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}
