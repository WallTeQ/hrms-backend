import { z } from "zod";

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1),
  managerId: z.string().uuid().optional(),
  managerEmail: z.string().email().optional(),
});
export type CreateDepartmentDto = z.infer<typeof CreateDepartmentSchema>;

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial();
export type UpdateDepartmentDto = z.infer<typeof UpdateDepartmentSchema>;

export const DepartmentQuery = z.object({
  page: z.preprocess((v) => Number(v), z.number().int().positive().optional()),
  take: z.preprocess((v) => Number(v), z.number().int().positive().optional()),
});
export type DepartmentQueryDto = z.infer<typeof DepartmentQuery>;