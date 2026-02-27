import { z } from "zod";

export const CreateDisciplinaryRecordSchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  incident: z.string().min(1),
  action: z.string().min(1),
  date: z.string().refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date" }),
});
export type CreateDisciplinaryRecordDto = z.infer<typeof CreateDisciplinaryRecordSchema>;

export const UpdateDisciplinaryRecordSchema = CreateDisciplinaryRecordSchema.partial();
export type UpdateDisciplinaryRecordDto = z.infer<typeof UpdateDisciplinaryRecordSchema>;

export const DisciplinaryRecordResponseSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  incident: z.string(),
  action: z.string(),
  date: z.string(),
  createdAt: z.string(),
});
export type DisciplinaryRecordResponseDto = z.infer<typeof DisciplinaryRecordResponseSchema>;
