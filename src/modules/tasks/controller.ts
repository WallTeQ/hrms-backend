import { Request, Response } from "express";
import prisma from "../../infra/database.js";
import { TasksService } from "./service.js";
import type { CreateTaskDto, UpdateTaskDto } from "./schema.js";
import { getPaginationOptions, createPaginationResult } from "../../common/pagination.js";

export async function createTask(req: Request, res: Response) {
  const payload = req.body as CreateTaskDto;
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // DEPARTMENT_HEAD may only assign tasks to employees within their department
  if (user.role === "DEPARTMENT_HEAD") {
    if (!user.employeeId) return res.status(403).json({ error: "Employee account missing employeeId" });
    const target = await prisma.employee.findUnique({ where: { id: payload.employeeId }, select: { departmentId: true } });
    const head = await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { departmentId: true } });
    const deptManaged = await prisma.department.findFirst({ where: { managerId: user.employeeId }, select: { id: true } });
    const targetDept = target?.departmentId || null;
    const headDept = head?.departmentId || null;
    const managedDeptId = deptManaged?.id || null;
    if (targetDept !== headDept && targetDept !== managedDeptId) {
      return res.status(403).json({ error: "Forbidden: cannot assign tasks to employees outside your department" });
    }
  }

  const userId = user.id as string | undefined;
  const task = await TasksService.create(payload as any, userId);
  return res.status(201).json({ status: "success", data: task });
}

export async function listTasks(req: Request, res: Response) {
  const { employeeId, departmentId, status } = req.query as any;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const user = (req as any).user;
  const result = await TasksService.list({ employeeId, departmentId, status, skip, take }, user) as { items: any[]; total: number };
  const paginated = createPaginationResult(result.items, result.total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function listMyTasks(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Always return tasks assigned to the authenticated employee only
  const employeeId = user.employeeId as string | undefined;
  if (!employeeId) {
    // non-employee accounts have no "my tasks"
    return res.json({ status: "success", items: [], total: 0, page: page || 1, take: take || 0 });
  }

  const result = await TasksService.list({ employeeId, skip, take }, user) as { items: any[]; total: number };
  const paginated = createPaginationResult(result.items, result.total, { ...pagination, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function listTasksForEmployee(req: Request, res: Response) {
  const employeeId = req.params.employeeId;
  const pagination = getPaginationOptions(req.query);
  const { skip, take, page } = pagination;
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // SUPER_ADMIN and HR_ADMIN can view any employee
  if (user.role === "SUPER_ADMIN" || user.role === "HR_ADMIN") {
    const result = await TasksService.list({ employeeId, skip, take }, user as any) as { items: any[]; total: number };
    const paginated = createPaginationResult(result.items, result.total, { ...pagination, page: page || 1 });
    return res.json({ status: "success", ...paginated });
  }

  // DEPARTMENT_HEAD can view employees in their department
  if (user.role === "DEPARTMENT_HEAD") {
    if (!user.employeeId) return res.status(403).json({ error: "Employee account missing employeeId" });
    const head = await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { departmentId: true } });
    const deptManaged = await prisma.department.findFirst({ where: { managerId: user.employeeId }, select: { id: true } });
    const target = await prisma.employee.findUnique({ where: { id: employeeId }, select: { departmentId: true } });
    const targetDept = target?.departmentId || null;
    const headDept = head?.departmentId || null;
    const managedDeptId = deptManaged?.id || null;
    if (targetDept !== headDept && targetDept !== managedDeptId) {
      return res.status(403).json({ error: "Forbidden: employee is outside your department" });
    }
    const result = await TasksService.list({ employeeId, skip, take }, user as any) as { items: any[]; total: number };
    const paginated = createPaginationResult(result.items, result.total, { ...pagination, page: page || 1 });
    return res.json({ status: "success", ...paginated });
  }

  // EMPLOYEE may only view their own tasks
  if (user.role === "EMPLOYEE") {
    if (!user.employeeId || user.employeeId !== employeeId) return res.status(403).json({ error: "Forbidden" });
    const result = await TasksService.list({ employeeId, skip, take }, user as any) as { items: any[]; total: number };
    const paginated = createPaginationResult(result.items, result.total, { ...pagination, page: page || 1 });
    return res.json({ status: "success", ...paginated });
  }

  return res.status(403).json({ error: "Forbidden" });
}

export async function listDepartmentTasks(req: Request, res: Response) {
  const pagination = getPaginationOptions(req.query);
  // apply a hard cap to `take` to protect DB under high load
  const MAX_TAKE = 200;
  const { skip, take: rawTake, page } = pagination;
  const take = Math.min(Number(rawTake || 50), MAX_TAKE);
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  let departmentId: string | undefined;

  // Resolve department in one query: either they manage the dept OR they belong to it
  if (user.role === "DEPARTMENT_HEAD") {
    if (!user.employeeId) return res.status(403).json({ error: "Employee account missing employeeId" });
    const dept = await prisma.department.findFirst({
      where: {
        OR: [
          { managerId: user.employeeId },
          { employees: { some: { id: user.employeeId } } },
        ],
      },
      select: { id: true },
    });
    departmentId = dept?.id;
    if (!departmentId) return res.status(403).json({ error: "No department associated with department head" });
  } else if (user.role === "SUPER_ADMIN" || user.role === "HR_ADMIN") {
    departmentId = typeof req.query.departmentId === "string" ? req.query.departmentId : undefined;
  } else {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Prefer an explicit positive filter (sargable) — avoids `NOT` and enables index use
  const activeStatuses = ["PENDING", "IN_PROGRESS", "OVERDUE"] as const;
  const where: any = { status: { in: activeStatuses } };
  if (departmentId) where.departmentId = departmentId;

  // Parallelized, limited projection to keep the query fast and transfer small
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  const paginated = createPaginationResult(items, total, { skip, take, page: page || 1 });
  return res.json({ status: "success", ...paginated });
}

export async function getTask(req: Request, res: Response) {
  const task = await TasksService.getById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  return res.json({ status: "success", data: task });
}

export async function updateTask(req: Request, res: Response) {
  const payload = req.body as UpdateTaskDto;
  const file = (req as any).file as Express.Multer.File | undefined;
  const user = (req as any).user;
  const id = req.params.id;

  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const existing = await TasksService.getById(id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  // Employees may update *only their own* task status to IN_PROGRESS or COMPLETED
  if (user.role === "EMPLOYEE") {
    if (!user.employeeId) return res.status(403).json({ error: "Employee account missing employeeId" });
    if (existing.employeeId !== user.employeeId) return res.status(403).json({ error: "Forbidden" });

    // Allow only status changes for employee role
    const allowedKeys = new Set(["status"]);
    const forbidden = Object.keys(payload).some((k) => !allowedKeys.has(k));
    if (forbidden) return res.status(403).json({ error: "Employees may only update task status" });

    const status = (payload as any).status as string | undefined;
    if (!status) return res.status(400).json({ error: "status is required" });
    if (!["IN_PROGRESS", "COMPLETED"].includes(status)) {
      return res.status(400).json({ error: "Employees may only set status to IN_PROGRESS or COMPLETED" });
    }

    if (status === "COMPLETED") {
      // If file provided, upload and persist attachment with the completion
      if (file) {
        const allowed = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        if (!allowed.includes(file.mimetype || "")) {
          return res.status(400).json({ error: "Unsupported file type. Accepts PDF, Word, or Excel documents." });
        }
        if ((file.size || 0) > 10 * 1024 * 1024) {
          return res.status(400).json({ error: "File too large. Maximum 10MB allowed." });
        }
        const updated = await TasksService.markCompletedWithAttachment(id, {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        });
        return res.json({ status: "success", data: updated });
      }

      // No file — use standard complete
      const updated = await TasksService.markCompleted(id);
      return res.json({ status: "success", data: updated });
    }

    // IN_PROGRESS
    const updated = await TasksService.update(id, { status: "IN_PROGRESS" } as any);
    return res.json({ status: "success", data: updated });
  }

  // Non-employee roles: allow update only for authorized roles
  switch (user.role) {
    case "DEPARTMENT_HEAD":
    case "PAYROLL_OFFICER":
    case "HR_ADMIN":
    case "SUPER_ADMIN":
      // If marking completed and a file is provided, use the attachment-aware helper
      if ((payload as any).status === "COMPLETED") {
        if (file) {
          const updated = await TasksService.markCompletedWithAttachment(id, {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          });
          return res.json({ status: "success", data: updated });
        }
        if ((payload as any).completedAt === undefined) {
          const updated = await TasksService.markCompleted(id);
          return res.json({ status: "success", data: updated });
        }
      }
      const updated = await TasksService.update(id, payload as any);
      return res.json({ status: "success", data: updated });
    default:
      return res.status(403).json({ error: "Forbidden" });
  }
}

export async function approveTask(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const id = req.params.id;
  const existing = await TasksService.getById(id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  // DEPARTMENT_HEAD may only approve tasks for employees in their department
  if (user.role === "DEPARTMENT_HEAD") {
    if (!user.employeeId) return res.status(403).json({ error: "Employee account missing employeeId" });
    const head = await prisma.employee.findUnique({ where: { id: user.employeeId }, select: { departmentId: true } });
    const deptManaged = await prisma.department.findFirst({ where: { managerId: user.employeeId }, select: { id: true } });
    const target = await prisma.employee.findUnique({ where: { id: existing.employeeId }, select: { departmentId: true } });
    const targetDept = target?.departmentId || null;
    const headDept = head?.departmentId || null;
    const managedDeptId = deptManaged?.id || null;
    if (targetDept !== headDept && targetDept !== managedDeptId) {
      return res.status(403).json({ error: "Forbidden: cannot approve tasks outside your department" });
    }
  }

  const userId = user.id as string | undefined;
  const task = await TasksService.approve(id, userId);
  return res.json({ status: "success", data: task });
}

export async function deleteTask(req: Request, res: Response) {
  await TasksService.delete(req.params.id);
  return res.status(204).send();
}
