import { TasksRepository } from "./repository.js";
import type { Prisma } from ".prisma/client";
import prismaDefault from "../../infra/database.js";
import { uploadBuffer } from "../../infra/cloudinary.js";
import { serviceGuard } from "../../common/domain/service.js";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "../../common/domain/errors.js";

const repo = TasksRepository();
const prisma = prismaDefault;

function toDateIfString(val: any) {
  if (typeof val === "string") {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return val;
}

async function ensureShiftCompatibility(params: {
  taskId?: string;
  employeeId?: string;
  requiredShiftId?: string | null;
}) {
  let { taskId, employeeId, requiredShiftId } = params;

  if (taskId && (!employeeId || requiredShiftId === undefined)) {
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { employeeId: true, requiredShiftId: true },
    });
    if (!existing) throw new NotFoundError("Task not found", { taskId });
    if (!employeeId) employeeId = existing.employeeId;
    if (requiredShiftId === undefined) requiredShiftId = existing.requiredShiftId;
  }

  if (!requiredShiftId) return;

  const shift = await prisma.shift.findUnique({ where: { id: requiredShiftId }, select: { id: true } });
  if (!shift) throw new NotFoundError(`Shift with id ${requiredShiftId} not found`);

  if (!employeeId) {
    throw new ValidationError("employeeId is required when requiredShiftId is set");
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, shiftId: true } });
  if (!employee) throw new NotFoundError("Employee not found", { employeeId });
  if (!employee.shiftId) {
    throw new ValidationError("Employee shift assignment is required for task shift validation");
  }
  if (employee.shiftId !== requiredShiftId) {
    throw new ValidationError("Employee shift does not match required task shift");
  }
}

export const TasksService = {
  create: async (data: Prisma.TaskCreateInput, createdByUserId?: string) =>
    serviceGuard(async () => {
      const {
        employeeId,
        departmentId: _departmentId,
        skillId: _skillId,
        requiredShiftId: _requiredShiftId,
        employee: _employee,
        department: _department,
        skill: _skill,
        requiredShift: _requiredShift,
        ...rest
      } = data as any;

      if (!employeeId) {
        throw new ValidationError("employeeId is required");
      }

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, shiftId: true, departmentId: true, primarySkillId: true },
      });
      if (!employee) throw new NotFoundError("Employee not found", { employeeId });

      const requiredShiftId = employee.shiftId ?? undefined;
      const departmentId = employee.departmentId ?? undefined;
      const skillId = employee.primarySkillId ?? undefined;

      await ensureShiftCompatibility({
        employeeId,
        requiredShiftId: requiredShiftId ?? undefined,
      });
      const payload: Prisma.TaskCreateInput = {
        ...rest,
        employee: { connect: { id: employeeId } },
        department: departmentId ? { connect: { id: departmentId } } : undefined,
        skill: skillId ? { connect: { id: skillId } } : undefined,
        requiredShift: requiredShiftId ? { connect: { id: requiredShiftId } } : undefined,
        dueDate: toDateIfString((data as any).dueDate) as any,
        createdByUser: createdByUserId ? { connect: { id: createdByUserId } } : undefined,
      } as any;
      return repo.create(payload);
    }),
  getById: async (id: string) => serviceGuard(async () => repo.findById(id)),
  update: async (id: string, data: Prisma.TaskUpdateInput) =>
    serviceGuard(async () => {
      await ensureShiftCompatibility({
        taskId: id,
        employeeId: (data as any).employeeId,
        requiredShiftId: (data as any).requiredShiftId,
      });
      const departmentId = (data as any).departmentId as string | null | undefined;
      const skillId = (data as any).skillId as string | null | undefined;
      const requiredShiftId = (data as any).requiredShiftId as string | null | undefined;
      const employeeId = (data as any).employeeId as string | undefined;
      const payload: Prisma.TaskUpdateInput = {
        ...data,
        employee: employeeId ? { connect: { id: employeeId } } : undefined,
        department: departmentId ? { connect: { id: departmentId } } : departmentId === null ? { disconnect: true } : undefined,
        skill: skillId ? { connect: { id: skillId } } : skillId === null ? { disconnect: true } : undefined,
        requiredShift: requiredShiftId ? { connect: { id: requiredShiftId } } : requiredShiftId === null ? { disconnect: true } : undefined,
        dueDate: toDateIfString((data as any).dueDate) as any,
        approvedAt: toDateIfString((data as any).approvedAt) as any,
        completedAt: toDateIfString((data as any).completedAt) as any,
      } as any;
      delete (payload as any).employeeId;
      delete (payload as any).departmentId;
      delete (payload as any).skillId;
      delete (payload as any).requiredShiftId;
      return repo.update(id, payload);
    }),
  delete: async (id: string) => serviceGuard(async () => repo.delete(id)),
  list: async (
    filters: { employeeId?: string; departmentId?: string; status?: string; skip?: number; take?: number } = {},
    actor?: { role?: string; employeeId?: string }
  ) =>
    serviceGuard(async () => {
      const { employeeId, departmentId, status, skip, take } = filters;
      const role = actor?.role || "anonymous";
      let filterEmployeeId = employeeId;

      if (!actor?.role) {
        throw new UnauthorizedError("Authentication required");
      }

      switch (role) {
        case "EMPLOYEE":
          if (!actor.employeeId) throw new ValidationError("Employee account is missing employeeId");
          filterEmployeeId = actor.employeeId;
          break;
        case "DEPARTMENT_HEAD":
        case "PAYROLL_OFFICER":
        case "HR_ADMIN":
        case "SUPER_ADMIN":
          break;
        default:
          throw new ForbiddenError("Access denied");
      }

      return repo.list({ employeeId: filterEmployeeId, departmentId, status, skip, take });
    }),
  markCompleted: async (id: string) =>
    serviceGuard(async () => repo.update(id, { status: "COMPLETED", completedAt: new Date() } as any)),

  markCompletedWithAttachment: async (
    id: string,
    file?: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number }
  ) =>
    serviceGuard(async () => {
      if (!file) return repo.update(id, { status: "COMPLETED", completedAt: new Date() } as any);
      const filename = (file.originalname || `task-completion-${Date.now()}`).replace(/[^a-zA-Z0-9_.-]/g, "_");
      const result = await uploadBuffer(file.buffer, filename, { folder: `tasks/${id}/attachments` });
      const payload: any = {
        status: "COMPLETED",
        completedAt: new Date(),
        completedAttachmentUrl: result?.secure_url ?? null,
        completedAttachmentPublicId: result?.public_id ?? null,
        completedAttachmentMimeType: file.mimetype ?? null,
        completedAttachmentSize: file.size ?? null,
      };
      return repo.update(id, payload);
    }),

  approve: async (id: string, approvedByUserId?: string) =>
    serviceGuard(async () =>
      repo.update(id, {
        approvedAt: new Date(),
        approvedByUser: approvedByUserId ? { connect: { id: approvedByUserId } } : undefined,
      } as any)
    ),
};
