import { z } from "zod";

export const CreateEvaluationSchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }),
  kpiId: z.string().uuid().optional().nullable(),
  category: z.enum(["SUPERVISOR", "TEAMWORK"]).optional(),
  score: z.number(),
  period: z.string().min(1),
  notes: z.string().optional().nullable(),
});
export type CreateEvaluationDto = z.infer<typeof CreateEvaluationSchema>;

export const CreateKpiSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  weight: z.number().optional().nullable(),
});
export type CreateKpiDto = z.infer<typeof CreateKpiSchema>;

export const GeneratePerformanceSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, { message: "Invalid period format (YYYY-MM)" }),
});
export type GeneratePerformanceDto = z.infer<typeof GeneratePerformanceSchema>;

export const PerformanceRecordQuerySchema = z.object({
  employeeId: z.string().regex(/^EMP-\d{2}-\d{2}$/, { message: "Invalid employee ID format" }).optional(),
  period: z.string().optional(),
  skip: z.preprocess((v) => Number(v), z.number().int().nonnegative().optional()),
  take: z.preprocess((v) => Number(v), z.number().int().positive().optional()),
});
export type PerformanceRecordQueryDto = z.infer<typeof PerformanceRecordQuerySchema>;