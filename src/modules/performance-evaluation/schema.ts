import { z } from "zod";

export const CreateEvaluationSchema = z.object({
  employeeId: z.string().uuid(),
  kpiId: z.string().uuid().optional().nullable(),
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