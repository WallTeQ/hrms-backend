import { z } from "zod";

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  // Employee IDs in this project use the custom format (e.g. "EMP-02-26").
  // Accept any non-empty string here instead of forcing UUID validation.
  employeeId: z.string().min(1),
  departmentId: z.string().uuid().optional().nullable(),
  skillId: z.string().uuid().optional().nullable(),
  requiredShiftId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  performanceWeight: z.number().min(0).max(1).optional(),
});
export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"]).optional(),
  approved: z.boolean().optional(),
  approvedAt: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
});
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;

export const TaskQuerySchema = z.object({
  employeeId: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.string().optional(),
});
export type TaskQueryDto = z.infer<typeof TaskQuerySchema>;
